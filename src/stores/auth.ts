import apis from '@/apis'
import { create } from 'zustand'

interface AuthState {
  metaPubSubmitted: boolean | null
  checkMetaPub: () => Promise<boolean>
  setMetaPubSubmitted: (v: boolean) => void
  reset: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  metaPubSubmitted: null,
  checkMetaPub: async () => {
    const { submitted } = await apis.auth.getMetaPubStatus()
    set({ metaPubSubmitted: submitted })
    return submitted
  },
  setMetaPubSubmitted: (v: boolean) => set({ metaPubSubmitted: v }),
  reset: () => set({ metaPubSubmitted: null }),
}))

export default useAuthStore
