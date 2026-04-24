export const persistAuthSession = (
  authType: 'wallet' | 'email' | 'google',
  payload: { token: string; userId: string; address?: string; email?: string }
) => {
  localStorage.setItem('token', payload.token)
  localStorage.setItem('userId', payload.userId)
  localStorage.setItem('authType', authType)
  localStorage.removeItem('authAddress')
  localStorage.removeItem('authEmail')

  if (payload.address) {
    localStorage.setItem('authAddress', payload.address)
  }

  if (payload.email) {
    localStorage.setItem('authEmail', payload.email)
  }
}
