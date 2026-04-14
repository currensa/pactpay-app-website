import apis from '@/apis'
import { create } from 'zustand'

interface AuthState {
  metaPubSubmitted: boolean | null
  metaPub: string | null
  checkMetaPub: () => Promise<boolean>
  setMetaPubSubmitted: (v: boolean) => void
  setMetaPub: (metaPub: string) => void
  reset: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  metaPubSubmitted: null,
  metaPub: null,
  checkMetaPub: async () => {
    const { submitted } = await apis.auth.getMetaPubStatus()
    set({ metaPubSubmitted: submitted })
    return submitted
  },
  setMetaPubSubmitted: (v: boolean) => set({ metaPubSubmitted: v }),
  setMetaPub: (metaPub: string) => set({ metaPub }),
  reset: () => set({ metaPubSubmitted: null, metaPub: null }),
}))

export default useAuthStore
