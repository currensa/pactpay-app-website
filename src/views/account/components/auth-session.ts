import type { GravArcUserInfoDto } from '@/apis/account.api'

export const persistAuthSession = (
  authType: 'wallet' | 'email' | 'google',
  payload: { token: string; userId: string; address?: string; email?: string; gravArcUserInfo?: GravArcUserInfoDto | null }
) => {
  localStorage.setItem('token', payload.token)
  localStorage.setItem('userId', payload.userId)
  localStorage.setItem('authType', authType)
  localStorage.removeItem('authAddress')
  localStorage.removeItem('authEmail')
  localStorage.removeItem('gravArcUserInfo')

  if (payload.address) {
    localStorage.setItem('authAddress', payload.address)
  }

  if (payload.email) {
    localStorage.setItem('authEmail', payload.email)
  }

  if (payload.gravArcUserInfo) {
    localStorage.setItem('gravArcUserInfo', JSON.stringify(payload.gravArcUserInfo))
  }
}

export const clearPersistedAuthSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('authType')
  localStorage.removeItem('authAddress')
  localStorage.removeItem('authEmail')
  localStorage.removeItem('gravArcUserInfo')
}
