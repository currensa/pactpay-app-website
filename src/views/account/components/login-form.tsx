import api from '@/apis'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'
import { IconLoader2, IconMail, IconWallet } from '@tabler/icons-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { persistAuthSession } from './auth-session'
import GoogleSignInButton from './google-sign-in-button'

interface LoginFormProps {
  onLoginSuccess: () => void
}

function WalletButton({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const userAction = useRef(false)
  const [loading, setLoading] = useState(false)

  const shortAddress = useMemo(() => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  }, [address])

  const handleWalletConnect = () => {
    open({ view: 'Connect', namespace: 'eip155' })
    userAction.current = true
  }

  const handleSwitchWallet = async () => {
    await disconnect()
    open({ view: 'Connect', namespace: 'eip155' })
    userAction.current = true
  }

  const walletLogin = async (provider: Provider, addr: string) => {
    setLoading(true)
    try {
      const { nonce } = await api.auth.getNonce()
      const signature = await provider.request<string>({
        method: 'personal_sign',
        params: [nonce, addr]
      })
      const { token, userId } = await api.auth.login({
        type: 'wallet',
        address: addr,
        nonce,
        signature
      })
      persistAuthSession('wallet', { token, userId, address: addr })
      onLoginSuccess()
    } catch (error) {
      console.error('Failed to sign in:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWalletSign = () => {
    if (!address || !walletProvider) return
    walletLogin(walletProvider, address)
  }

  useEffect(() => {
    if (!userAction.current) return
    if (!address || !walletProvider) return
    walletLogin(walletProvider, address)
  }, [address, walletProvider])

  return (
    <div className="flex flex-col items-center gap-[10px]">
        <button
          type="button"
          onClick={isConnected ? handleWalletSign : handleWalletConnect}
          disabled={loading}
          className="flex min-h-[52px] w-full items-center justify-center gap-[8px] rounded-full bg-[#5E85EE] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-70"
        >
        {loading ? (
          <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
        ) : (
          <>
            <IconWallet className="h-[24px] w-[24px]" />
            <span>{isConnected ? `Continue with ${shortAddress}` : 'Connect wallet'}</span>
          </>
        )}
      </button>
      {isConnected && (
        <button
          type="button"
          onClick={handleSwitchWallet}
          className="text-[13px] leading-[20px] text-[#606067] transition-opacity hover:opacity-70"
        >
          Connect Another Wallet
        </button>
      )}
    </div>
  )
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const navigate = useNavigate()
  const { isConnected } = useAppKitAccount()
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendCodeLoading, setSendCodeLoading] = useState(false)
  const [emailLoginLoading, setEmailLoginLoading] = useState(false)
  const [sendCodeError, setSendCodeError] = useState('')
  const [emailLoginError, setEmailLoginError] = useState('')
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!email) return
    setSendCodeError('')
    setSendCodeLoading(true)
    try {
      await api.auth.getEmailCode(email)
      setCodeSent(true)
      setCountdown(60)
    } catch (error) {
      console.error('Failed to send code:', error)
      setSendCodeError('Failed to send verification code. Please try again.')
    } finally {
      setSendCodeLoading(false)
    }
  }

  const emailLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !emailCode) return
    setEmailLoginError('')
    setEmailLoginLoading(true)
    try {
      const { token, userId } = await api.auth.login({
        type: 'email',
        email,
        code: emailCode.toUpperCase()
      })
      persistAuthSession('email', { token, userId, email })
      onLoginSuccess()
    } catch (error) {
      console.error('Failed to sign in with email:', error)
      setEmailLoginError('Invalid or expired code. Please try again.')
    } finally {
      setEmailLoginLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-full max-w-[480px] flex-col gap-[80px]">
        <div className="flex flex-col gap-[8px] text-center">
          <h1 className="font-['Poppins',sans-serif] text-[42px] font-medium leading-none tracking-[-0.84px] text-[#1c1c26] lg:text-[56px] lg:tracking-[-1.12px]">
            {isConnected ? 'Welcome Back' : 'Create PactPay Account'}
          </h1>
        </div>

        <div className="flex flex-col gap-[32px]">
          <div className="flex w-full max-w-[480px] self-center flex-col gap-[24px]">
            <WalletButton onLoginSuccess={onLoginSuccess} />
            <GoogleSignInButton onLoginSuccess={onLoginSuccess} />
          </div>

          <div className="flex items-center justify-center gap-[24px]">
            <div className="h-[1px] flex-1 bg-[#d9d9db]" />
            <span className="text-[16px] leading-[24px] text-[#77777d]">or</span>
            <div className="h-[1px] flex-1 bg-[#d9d9db]" />
          </div>

          <form onSubmit={emailLogin} noValidate className="flex w-full max-w-[480px] self-center flex-col gap-[24px]">
            <div className="flex h-[56px] items-center justify-between overflow-hidden rounded-[16px] bg-[#f5f5f5] px-[16px]">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 bg-transparent text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!email || sendCodeLoading || countdown > 0}
                className="text-[14px] font-semibold leading-[22px] text-[#5e85ee] transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {sendCodeLoading ? (
                  <IconLoader2 className="h-[18px] w-[18px] animate-spin" />
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : codeSent ? (
                  'Resend code'
                ) : (
                  'Send a code'
                )}
              </button>
            </div>

            {sendCodeError && <p className="text-[14px] text-red-500">{sendCodeError}</p>}

            {codeSent && (
              <div className="flex h-[38px] items-center overflow-hidden rounded-[6px] border border-[#d9d9db] bg-white px-[12px] py-[4px]">
                <input
                  type="text"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value)}
                  placeholder="Enter code (case insensitive)"
                  className="flex-1 text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[rgba(19,19,26,0.2)] focus:outline-none"
                  required
                />
              </div>
            )}

            {emailLoginError && <p className="text-[14px] text-red-500">{emailLoginError}</p>}

            <button
              type="submit"
              disabled={!codeSent || !emailCode || emailLoginLoading}
              className="flex min-h-[52px] w-full items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {emailLoginLoading ? (
                <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
              ) : (
                <>
                  <IconMail className="h-[24px] w-[24px]" />
                  <span>Continue with email</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[12px] leading-[18px] text-[#8d8d93]">
            By continuing, you agree to our{' '}
            <button
              onClick={() => navigate('/legal/terms')}
              className="underline transition-colors hover:text-[#606067]"
            >
              Terms of Use
            </button>{' '}
            and acknowledge our{' '}
            <button
              onClick={() => navigate('/legal/privacy')}
              className="underline transition-colors hover:text-[#606067]"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
