import { PrivacyUnlockCache } from '@/lib/gravarc/privacyUnlockCache'
import useAuthStore from '@/stores/auth'
import { useAppKitAccount } from '@reown/appkit/react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { BoxKeyPair } from 'tweetnacl'

type UnlockContext = {
  rememberKey: boolean
  setRememberKey: (value: boolean) => void
  cachedKeyPair: BoxKeyPair | null
  cacheKeyPair: (keyPair: BoxKeyPair) => void
  forgetKeyPair: () => void
  clear: () => void
}

const PrivacyUnlockContext = createContext<UnlockContext | null>(null)

export function usePrivacyUnlock(): UnlockContext {
  const value = useContext(PrivacyUnlockContext)
  if (!value) throw new Error('Privacy unlock provider is missing')
  return value
}

export function PrivacyUnlockProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAppKitAccount()
  const profileUserId = useAuthStore(state => state.gravArcUserInfo?.userId)
  const sessionUserId = localStorage.getItem('userId')
  const userId = profileUserId && profileUserId !== sessionUserId ? null : sessionUserId
  const identity = userId && address ? `${userId}:eip155:${address.toLowerCase()}` : null
  const cache = useRef(new PrivacyUnlockCache())
  const previousIdentity = useRef(identity)
  const [, update] = useState(0)
  const refresh = () => update(value => value + 1)

  useEffect(() => {
    if (previousIdentity.current !== identity) {
      cache.current.clear()
      previousIdentity.current = identity
      refresh()
    }
  }, [identity])

  const value: UnlockContext = {
    rememberKey: cache.current.rememberKey,
    setRememberKey: enabled => { cache.current.setRememberKey(enabled); refresh() },
    cachedKeyPair: previousIdentity.current === identity ? cache.current.get(identity) : null,
    cacheKeyPair: keyPair => { cache.current.cache(identity, keyPair); refresh() },
    forgetKeyPair: () => { cache.current.forgetKeyPair(); refresh() },
    clear: () => { cache.current.clear(); refresh() },
  }
  return <PrivacyUnlockContext.Provider value={value}>{children}</PrivacyUnlockContext.Provider>
}
