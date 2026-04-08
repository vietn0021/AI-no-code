import { api } from '../lib/api'

/** URL chia sẻ công khai (production) — hiển thị trong modal Studio. */
export const PUBLIC_PLAY_ORIGIN = 'https://ai-no-code-zeta.vercel.app'

export function getPublicPlayUrl(slug: string): string {
  const s = slug.trim()
  return `${PUBLIC_PLAY_ORIGIN.replace(/\/$/, '')}/play/${encodeURIComponent(s)}`
}

export type PublishProjectResult = {
  slug: string
  publishUrl: string
}

export async function publishProject(
  projectId: string,
): Promise<PublishProjectResult> {
  const { data } = await api.post<{
    success: true
    data: PublishProjectResult
  }>(`/projects/${projectId}/publish`)

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }

  const { slug, publishUrl } = data.data
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new Error('Thiếu slug trong phản hồi publish')
  }
  return {
    slug: slug.trim(),
    publishUrl: typeof publishUrl === 'string' ? publishUrl : getPublicPlayUrl(slug.trim()),
  }
}

export async function unpublishProject(projectId: string): Promise<void> {
  const { data } = await api.post<{
    success: true
    data: { success?: boolean }
  }>(`/projects/${projectId}/unpublish`)

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }
}
