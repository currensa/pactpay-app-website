import { toast } from '@/components/ui/use-toast'
import axios, { AxiosError } from 'axios'

let lastErrorToast: { message: string; timestamp: number } | null = null

function getErrorMessage(error: AxiosError<any>) {
  const data = error.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  if (typeof error.response?.statusText === 'string' && error.response.statusText.trim()) {
    return error.response.statusText
  }

  return 'Request failed.'
}

function shouldSkipErrorToast(error: AxiosError<any>) {
  const config = error.config as { skipErrorToast?: boolean } | undefined
  return config?.skipErrorToast || error.code === 'ERR_CANCELED'
}

function showErrorToast(message: string) {
  const normalizedMessage = message.trim()
  if (!normalizedMessage) return

  const now = Date.now()
  if (lastErrorToast && lastErrorToast.message === normalizedMessage && now - lastErrorToast.timestamp < 1000) {
    return
  }

  lastErrorToast = { message: normalizedMessage, timestamp: now }
  toast({
    title: 'Error',
    description: normalizedMessage,
    variant: 'destructive',
  })
}

const request = axios.create({
  baseURL: '/api'
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  config.headers.Authorization = `Bearer ${token}`
  return config
})

request.interceptors.response.use(
  response => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname.startsWith('/welcome')
      if (!isLoginPage) {
        localStorage.removeItem('token')
        window.location.href = '/welcome'
      }
    } else if (!shouldSkipErrorToast(error)) {
      showErrorToast(getErrorMessage(error))
    }

    return Promise.reject(error)
  }
)

export default request
