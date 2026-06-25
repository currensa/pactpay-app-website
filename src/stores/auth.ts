import apis from '@/apis'
import type { GravArcUserInfoDto } from '@/apis/account.api'
import { create } from 'zustand'

interface AuthState {
  metaPubSubmitted: boolean | null
  metaPub: string | null
  gravArcUserInfo: GravArcUserInfoDto | null
  checkMetaPub: () => Promise<boolean>
  setMetaPubSubmitted: (v: boolean) => void
  setMetaPub: (metaPub: string) => void
  setGravArcUserInfo: (info: GravArcUserInfoDto | null) => void
  reset: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  metaPubSubmitted: null,
  metaPub: null,
  gravArcUserInfo: (() => {
    try {
      const raw = localStorage.getItem('gravArcUserInfo')
      return raw ? (JSON.parse(raw) as GravArcUserInfoDto) : null
    } catch {
      return null
    }
  })(),
  checkMetaPub: async () => {
    const { submitted } = await apis.auth.getMetaPubStatus()
    set({ metaPubSubmitted: submitted })
    return submitted
  },
  setMetaPubSubmitted: (v: boolean) => set({ metaPubSubmitted: v }),
  setMetaPub: (metaPub: string) => set({ metaPub }),
  setGravArcUserInfo: (info) => set({ gravArcUserInfo: info }),
  reset: () => set({ metaPubSubmitted: null, metaPub: null, gravArcUserInfo: null }),
}))

export default useAuthStore
