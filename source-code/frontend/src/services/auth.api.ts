const API_BASE_URL = 'http://localhost:3001/api'

type ApiErrorPayload = {
  success?: boolean
  message?: string
  statusCode?: number
}

type LoginResponse = {
  success: boolean
  data: {
    access_token: string
  }
}

async function parseError(response: Response): Promise<string> {
  let message = 'Request failed'

  try {
    const payload = (await response.json()) as ApiErrorPayload
    if (payload?.message) {
      message = payload.message
    }
  } catch {
    message = response.statusText || message
  }

  return message
}

export async function loginApi(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const payload = (await response.json()) as LoginResponse
  return payload.data.access_token
}

export async function registerApi(payload: {
  fullName: string
  email: string
  password: string
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function forgotPasswordApi(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

type ResetPasswordResponse = {
  success: boolean
  data: {
    message: string
  }
}

export async function resetPasswordApi(payload: {
  email: string
  token: string
  password: string
}): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const body = (await response.json()) as ResetPasswordResponse
  return body.data.message
}
