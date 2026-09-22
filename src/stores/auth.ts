import apis from '@/apis'
import type { GravArcUserInfoDto } from '@/apis/account.api'
import { create } from 'zustand'

interface AuthState {
  privacyProfileSubmitted: boolean | null
  gravArcUserInfo: GravArcUserInfoDto | null
  checkPrivacyProfile: () => Promise<boolean>
  setGravArcUserInfo: (info: GravArcUserInfoDto | null) => void
  reset: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  privacyProfileSubmitted: null,
  gravArcUserInfo: (() => {
    try {
      const raw = localStorage.getItem('gravArcUserInfo')
      return raw ? (JSON.parse(raw) as GravArcUserInfoDto) : null
    } catch {
      return null
    }
  })(),
  checkPrivacyProfile: async () => {
    const { submitted } = await apis.auth.getGravArcUserInfoStatus()
    set({ privacyProfileSubmitted: submitted })
    return submitted
  },
  setGravArcUserInfo: (info) => set({ gravArcUserInfo: info }),
  reset: () => set({ privacyProfileSubmitted: null, gravArcUserInfo: null }),
}))

export default useAuthStore
