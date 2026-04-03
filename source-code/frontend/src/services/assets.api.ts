import { api } from '../lib/api'
import { backendOrigin } from '../lib/apiClient'

export type UploadAssetResult = {
  url: string
  originalName: string
  /** `_id` từ DB khi server trả kèm trong `asset`. */
  assetId?: string
}

export type ProjectAssetDto = {
  id: string
  fileUrl: string
  fileName: string
}

/**
 * GET /api/assets?projectId=...
 * Bearer: interceptor `api` (localStorage).
 */
export async function fetchProjectAssets(projectId: string): Promise<ProjectAssetDto[]> {
  const { data } = await api.get<{ success: true; data: ProjectAssetDto[] }>(
    `/assets?projectId=${encodeURIComponent(projectId)}`,
  )
  if (!data?.success || !Array.isArray(data.data)) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }
  return data.data
}

/** Origin backend — ghép với đường dẫn `/uploads/...` từ API. */
export function uploadsOrigin(): string {
  return backendOrigin()
}

export function resolveAssetFileUrl(relativeOrAbsolute: string): string {
  if (relativeOrAbsolute.startsWith('http://') || relativeOrAbsolute.startsWith('https://')) {
    return relativeOrAbsolute
  }
  const origin = uploadsOrigin()
  const path = relativeOrAbsolute.startsWith('/') ? relativeOrAbsolute : `/${relativeOrAbsolute}`
  return `${origin}${path}`
}

/**
 * POST /api/assets/upload?projectId=...
 * FormData field `file`. Bearer: interceptor `api` (localStorage) hoặc gọi sau khi đảm bảo đã đăng nhập.
 */
export async function uploadAsset(projectId: string, file: File): Promise<UploadAssetResult> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post<{
    success: true
    data: {
      url: string
      originalName: string
      size?: number
      mimeType?: string
      asset?: unknown
    }
  }>(`/assets/upload?projectId=${encodeURIComponent(projectId)}`, formData, {
    transformRequest: [
      (body, headers) => {
        if (headers && typeof headers === 'object' && 'Content-Type' in headers) {
          delete (headers as Record<string, unknown>)['Content-Type']
        }
        return body
      },
    ],
  })

  if (!data?.success || data.data == null) {
    throw new Error('Phản hồi không hợp lệ từ máy chủ')
  }

  const rawAsset = data.data.asset as { _id?: string } | undefined
  const assetId = rawAsset?._id != null ? String(rawAsset._id) : undefined

  return {
    url: data.data.url,
    originalName: data.data.originalName,
    assetId,
  }
}
