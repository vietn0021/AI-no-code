const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const apiUrl = (path: string) => `${BASE_URL}${path}`

/**
 * Origin backend (không có `/api`) để ghép `/uploads/...` khi API trả đường dẫn tương đối.
 * Dev: VITE_API_URL trống → backend mặc định :3001 (uploads không đi qua proxy /api).
 */
export function backendOrigin(): string {
  const trimmed = BASE_URL.replace(/\/$/, '')
  if (trimmed) return trimmed
  return 'http://localhost:3001'
}
