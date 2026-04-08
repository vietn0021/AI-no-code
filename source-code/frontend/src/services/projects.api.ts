import { api } from '../lib/api'
import type { EditorGameConfig, GameEntity } from '../store/useEditorStore'

export type Project = {
  id: string
  name: string
  description?: string
  updatedAt?: string
  /** Có trong response list khi backend trả kèm (thumbnail dashboard). */
  gameConfig?: unknown
}

function mapProject(raw: Record<string, unknown>): Project {
  const idRaw = raw.id ?? raw._id
  const id =
    typeof idRaw === 'string'
      ? idRaw
      : idRaw != null && typeof (idRaw as { toString?: () => string }).toString === 'function'
        ? (idRaw as { toString: () => string }).toString()
        : ''

  let updatedAt: string | undefined
  const u = raw.updatedAt
  if (typeof u === 'string') updatedAt = u
  else if (u instanceof Date) updatedAt = u.toISOString()

  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : undefined,
    updatedAt,
    gameConfig: raw.gameConfig,
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<{ success: true; data: Record<string, unknown>[] }>('/projects')
  if (!data?.success || !Array.isArray(data.data)) return []
  return data.data.map((p) => mapProject(p))
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`)
}

export async function createProject(body: {
  name: string
  description?: string
  gameConfig?: EditorGameConfig | Record<string, unknown>
}): Promise<Project> {
  const { data } = await api.post<{ success: true; data: Record<string, unknown> }>(
    '/projects',
    body,
  )
  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }
  return mapProject(data.data)
}

export type ProjectFromApi = {
  gameConfig?: unknown
  name?: string
  description?: string
  _id?: string
  id?: string
} & Record<string, unknown>

/** Chuẩn hoá payload `gameConfig` từ backend (Zod GameConfig) cho store / GameCanvas. */
export function normalizeGameConfigForEditor(gameConfig: unknown): EditorGameConfig {
  const g =
    gameConfig && typeof gameConfig === 'object'
      ? (gameConfig as Record<string, unknown>)
      : {}
  const themeRaw = g.theme
  const theme =
    themeRaw && typeof themeRaw === 'object'
      ? (themeRaw as EditorGameConfig['theme'])
      : { primary: '#BDE0FE', background: '#F0F8FF', vibe: 'Studio' }

  return {
    ...g,
    source_color:
      g.source_color === 'prompt' || g.source_color === 'palette_fallback'
        ? g.source_color
        : 'palette_fallback',
    theme,
    entities: Array.isArray(g.entities) ? (g.entities as GameEntity[]) : [],
    logic: Array.isArray(g.logic) ? g.logic : [],
    assets: Array.isArray(g.assets) ? g.assets : [],
  }
}

/**
 * POST /api/projects/:projectId/generate — Bearer do `api` interceptor (localStorage access_token).
 * Response envelope: { success: true, data: project }.
 */
export async function postProjectGenerate(
  projectId: string,
  prompt: string,
): Promise<ProjectFromApi> {
  const { data } = await api.post<{ success: true; data: ProjectFromApi }>(
    `/projects/${projectId}/generate`,
    { prompt },
  )
  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }
  return data.data
}

export type ProjectWithGameConfig = Project & {
  gameConfig?: unknown
  rawPrompt?: string
  status?: string
  currentVersion?: number
  isPublished?: boolean
  slug?: string
}

function mapProjectWithGameConfig(raw: Record<string, unknown>): ProjectWithGameConfig {
  return {
    ...mapProject(raw),
    gameConfig: raw.gameConfig,
    rawPrompt: typeof raw.rawPrompt === 'string' ? raw.rawPrompt : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    currentVersion:
      typeof raw.currentVersion === 'number' ? raw.currentVersion : undefined,
    isPublished: raw.isPublished === true,
    slug: typeof raw.slug === 'string' && raw.slug.trim() ? raw.slug.trim() : undefined,
  }
}

export async function fetchProjectById(projectId: string): Promise<ProjectWithGameConfig> {
  const { data } = await api.get<{
    success: true
    data: Record<string, unknown>
  }>(`/projects/${projectId}`)

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }

  return mapProjectWithGameConfig(data.data)
}

/** PATCH metadata (name, description, …) — không gửi gameConfig nếu chỉ đổi tên. */
export async function patchProjectPartial(
  projectId: string,
  body: { name?: string; description?: string },
): Promise<ProjectWithGameConfig> {
  const { data } = await api.patch<{
    success: true
    data: Record<string, unknown>
  }>(`/projects/${projectId}`, body)

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }

  return mapProjectWithGameConfig(data.data)
}

/**
 * PATCH /api/projects/:projectId
 * Body yêu cầu: { gameConfig: fullGameConfig } (backend UpdateProjectDto).
 */
export async function patchProjectGameConfig(
  projectId: string,
  gameConfig: EditorGameConfig,
): Promise<ProjectWithGameConfig> {
  const { data } = await api.patch<{
    success: true
    data: Record<string, unknown>
  }>(`/projects/${projectId}`, {
    gameConfig,
  })

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }

  return mapProjectWithGameConfig(data.data)
}
