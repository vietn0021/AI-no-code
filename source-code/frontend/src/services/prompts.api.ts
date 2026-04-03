import { api } from '../lib/api'

export type PromptChatMessage = {
  _id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

function mapPrompt(raw: Record<string, unknown>): PromptChatMessage {
  const idRaw = raw._id ?? raw.id
  const _id =
    typeof idRaw === 'string'
      ? idRaw
      : idRaw != null && typeof (idRaw as { toString?: () => string }).toString === 'function'
        ? (idRaw as { toString: () => string }).toString()
        : ''

  let createdAt: string | undefined
  const c = raw.createdAt
  if (typeof c === 'string') createdAt = c
  else if (c instanceof Date) createdAt = c.toISOString()

  const role = raw.role === 'assistant' || raw.role === 'user' ? raw.role : 'user'

  return {
    _id,
    role,
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt,
  }
}

/**
 * GET /api/prompts?projectId= — tối đa 50 tin, sort ASC (cũ → mới).
 */
export async function getPrompts(projectId: string): Promise<PromptChatMessage[]> {
  const { data } = await api.get<{ success: true; data: Record<string, unknown>[] }>(
    '/prompts',
    { params: { projectId } },
  )
  if (!data?.success || !Array.isArray(data.data)) return []
  return data.data.map((row) => mapPrompt(row))
}

/**
 * POST /api/prompts — lưu một dòng chat.
 */
export async function saveMessage(
  projectId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  await api.post('/prompts', { projectId, role, content })
}
