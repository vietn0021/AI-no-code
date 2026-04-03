import axios, { type AxiosError } from 'axios'
import { apiUrl } from './apiClient'

export const API_BASE_URL = apiUrl('/api')

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string | string[] }>
    const msg = ax.response?.data?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string' && msg.length > 0) return msg
    return ax.message || 'Request failed'
  }
  if (error instanceof Error) return error.message
  return 'Request failed'
}
