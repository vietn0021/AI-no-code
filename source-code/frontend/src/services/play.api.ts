import { api } from '../lib/api'
import type { EditorGameConfig } from '../store/useEditorStore'
import { normalizeGameConfigForEditor } from './projects.api'

export type PublicPlayResponse = {
  gameConfig: EditorGameConfig
  name: string
}

export async function fetchPublicPlayBySlug(
  slug: string,
): Promise<PublicPlayResponse> {
  const { data } = await api.get<{
    success: true
    data: { gameConfig?: unknown; name?: string }
  }>(`/projects/play/${encodeURIComponent(slug)}`)

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }

  const rawName = data.data.name
  const name =
    typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'Game'

  return {
    gameConfig: normalizeGameConfigForEditor(data.data.gameConfig),
    name,
  }
}
