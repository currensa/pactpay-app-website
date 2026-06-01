import api from '@/apis'
import { usePublicCopy } from '@/views/public/copy'
import { IconBrandGoogle, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { persistAuthSession } from './auth-session'

interface GoogleSignInButtonProps {
  onLoginSuccess: () => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              width?: number
              logo_alignment?: 'left' | 'center'
            }
          ) => void
        }
      }
    }
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleSignInButton({ onLoginSuccess }: GoogleSignInButtonProps) {
  const { copy } = usePublicCopy()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const buttonContainerRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [buttonWidth, setButtonWidth] = useState(0)
  const baseButtonWidth = buttonWidth > 0 ? Math.min(buttonWidth, 400) : 400
  const scaleX = buttonWidth > 0 ? buttonWidth / baseButtonWidth : 1

  useEffect(() => {
    if (!wrapperRef.current) return

    const updateWidth = () => {
      const nextWidth = Math.round(wrapperRef.current?.clientWidth ?? 0)
      setButtonWidth(prev => (prev === nextWidth ? prev : nextWidth))
    }

    updateWidth()

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(wrapperRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || buttonWidth <= 0) {
      if (!GOOGLE_CLIENT_ID) {
        setError(copy.login.googleUnavailable)
      }
      return
    }

    let cancelled = false

    const initializeGoogle = () => {
      if (cancelled || !window.google || !buttonContainerRef.current) return

      setError('')
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          if (!credential) {
            setError(copy.login.googleMissingCredential)
            return
          }

          setLoading(true)
          try {
            const { token, userId } = await api.auth.googleLogin(credential)
            persistAuthSession('google', { token, userId })
            onLoginSuccess()
          } catch (loginError) {
            console.error('Failed to sign in with Google:', loginError)
            setError(copy.login.googleFailed)
          } finally {
            setLoading(false)
          }
        }
      })

      buttonContainerRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: baseButtonWidth,
        logo_alignment: 'left'
      })
    }

    if (window.google) {
      initializeGoogle()
      return () => {
        cancelled = true
      }
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null
    const script =
      existingScript ??
      Object.assign(document.createElement('script'), {
        id: GOOGLE_SCRIPT_ID,
        src: 'https://accounts.google.com/gsi/client',
        async: true,
        defer: true
      })

    const handleLoad = () => initializeGoogle()
    const handleError = () => {
      if (!cancelled) {
        setError(copy.login.googleLoadFailed)
      }
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    if (!existingScript) {
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
  }, [baseButtonWidth, buttonWidth, copy.login.googleFailed, copy.login.googleLoadFailed, copy.login.googleMissingCredential, copy.login.googleUnavailable, onLoginSuccess])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="flex flex-col gap-[12px]">
        <button
          type="button"
          disabled
          className="flex min-h-[46px] w-full items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-4 py-3 text-[14px] font-bold leading-[20px] text-[#1c1c26] opacity-50 sm:min-h-[52px] sm:px-[24px] sm:text-[16px] sm:leading-[24px]"
        >
          <IconBrandGoogle className="h-[24px] w-[24px]" />
          <span>{copy.login.continueWithGoogle}</span>
        </button>
        <p className="text-[14px] text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="flex w-full flex-col gap-[10px]">
      <div className={`${loading ? 'pointer-events-none opacity-60' : ''}`}>
        <div
          className="origin-center"
          style={{ height: 40, transform: `scale(${scaleX}, 1.2)` }}
        >
          <div ref={buttonContainerRef} className="flex justify-center" />
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center gap-[8px] text-[14px] text-[#606067]">
          <IconLoader2 className="h-[18px] w-[18px] animate-spin" />
          <span>{copy.login.signInWithGoogle}</span>
        </div>
      )}
      {error && <p className="text-[14px] text-red-500">{error}</p>}
    </div>
  )
}
