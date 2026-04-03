import { api } from '../lib/api'
import type { EditorGameConfig } from '../store/useEditorStore'

export type GameTemplateDto = {
  id: string
  name: string
  description: string
  thumbnail: string
  category: string
  defaultConfig: Record<string, unknown>
}

function mapTemplate(raw: Record<string, unknown>): GameTemplateDto {
  const dc = raw.defaultConfig
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    thumbnail: typeof raw.thumbnail === 'string' ? raw.thumbnail : '',
    category: typeof raw.category === 'string' ? raw.category : '',
    defaultConfig: dc && typeof dc === 'object' && !Array.isArray(dc) ? (dc as Record<string, unknown>) : {},
  }
}

export async function getTemplates(): Promise<GameTemplateDto[]> {
  const { data } = await api.get<{ success: true; data: Record<string, unknown>[] }>('/templates')
  if (!data?.success || !Array.isArray(data.data)) return []
  return data.data.map((row) => mapTemplate(row))
}

export async function getTemplate(id: string): Promise<GameTemplateDto> {
  const { data } = await api.get<{ success: true; data: Record<string, unknown> }>(
    `/templates/${encodeURIComponent(id)}`,
  )
  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }
  return mapTemplate(data.data)
}

/**
 * Tạo gameConfig hợp lệ cho backend (có entity `player`) + gắn templateId / templateDefaults.
 */
export function buildInitialGameConfigFromTemplate(template: GameTemplateDto): EditorGameConfig {
  const dc = template.defaultConfig
  const bg =
    typeof dc.backgroundColor === 'string' && dc.backgroundColor.trim()
      ? dc.backgroundColor.trim()
      : '#F0F8FF'

  let primary = '#BDE0FE'
  if (typeof dc.snakeColor === 'string' && dc.snakeColor.trim()) primary = dc.snakeColor.trim()
  else if (typeof dc.birdColor === 'string' && dc.birdColor.trim()) primary = dc.birdColor.trim()
  else if (typeof dc.ballColor === 'string' && dc.ballColor.trim()) primary = dc.ballColor.trim()
  else if (typeof dc.paddleColor === 'string' && dc.paddleColor.trim()) primary = dc.paddleColor.trim()
  else if (typeof dc.playerColor === 'string' && dc.playerColor.trim()) primary = dc.playerColor.trim()
  else if (typeof dc.cardBackColor === 'string' && dc.cardBackColor.trim())
    primary = dc.cardBackColor.trim()

  const playerHex = /^#[0-9A-Fa-f]{3,8}$/.test(primary) ? primary : '#9575CD'

  return {
    source_color: 'palette_fallback',
    theme: {
      primary,
      background: bg,
      vibe: `Mẫu: ${template.name}`,
    },
    entities: [
      {
        id: 'tpl-player-1',
        type: 'player',
        shapeType: 'Square',
        colorHex: playerHex,
        position: { x: 50, y: 72 },
        width: 16,
        height: 16,
      },
    ],
    logic: [],
    assets: [],
    templateId: template.id,
    templateDefaults: dc,
  } as EditorGameConfig
}
