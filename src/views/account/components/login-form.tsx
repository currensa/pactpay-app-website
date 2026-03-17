import api from '@/apis'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconLoader2, IconMail, IconWallet } from '@tabler/icons-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'

interface LoginFormProps {
  onLoginSuccess: () => void
}

function WalletButton({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const userAction = useRef(false)
  const [loading, setLoading] = useState(false)

  const shortAddress = useMemo(() => {
    return address ? address.slice(0, 6) + '...' + address.slice(-4) : ''
  }, [address])

  const handleWalletConnect = () => {
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
      localStorage.setItem('token', token)
      localStorage.setItem('userId', userId)
      localStorage.setItem('authType', 'wallet')
      localStorage.setItem('authAddress', addr)
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
    <button
      type="button"
      onClick={isConnected ? handleWalletSign : handleWalletConnect}
      disabled={loading}
      className="flex items-center justify-center gap-[8px] rounded-full bg-[#875dff] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-70"
    >
      {loading ? (
        <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
      ) : (
        <>
          <IconWallet className="h-[24px] w-[24px]" />
          <span>{isConnected ? `Continue with ${shortAddress}` : 'Log in with wallet'}</span>
        </>
      )}
    </button>
  )
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
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
        code: emailCode
      })
      localStorage.setItem('token', token)
      localStorage.setItem('userId', userId)
      localStorage.setItem('authType', 'email')
      localStorage.setItem('authEmail', email)
      onLoginSuccess()
    } catch (error) {
      console.error('Failed to sign in with email:', error)
      setEmailLoginError('Invalid or expired code. Please try again.')
    } finally {
      setEmailLoginLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-8 lg:px-[80px] lg:py-[80px]">
      <div className="flex w-full max-w-[480px] flex-col gap-[80px]">
        {/* 标题区域 */}
        <div className="flex flex-col gap-[8px] text-center">
          <h1 className="font-['Poppins',sans-serif] text-[42px] font-medium leading-none tracking-[-0.84px] text-[#1c1c26] lg:text-[56px] lg:tracking-[-1.12px]">
            Welcome Back
          </h1>
          <p className="text-[14px] leading-[21px] text-[#77777d] lg:text-[16px] lg:leading-[24px]">
            Connect your wallet or sign in with email to get started.
          </p>
        </div>

        {/* 登录区域 */}
        <div className="flex flex-col gap-[32px]">
          {/* 钱包登录按钮 */}
          <WalletButton onLoginSuccess={onLoginSuccess} />

          {/* 分隔线 */}
          <div className="flex items-center justify-center gap-[24px]">
            <div className="h-[1px] flex-1 bg-[#d9d9db]" />
            <span className="text-[16px] leading-[24px] text-[#77777d]">Or login with</span>
            <div className="h-[1px] flex-1 bg-[#d9d9db]" />
          </div>

          {/* 邮箱登录表单 */}
          <form onSubmit={emailLogin} className="flex flex-col gap-[24px]">
            {/* 邮箱输入框 */}
            <div className="flex h-[56px] items-center justify-between overflow-hidden rounded-[16px] bg-[#f5f5f5] px-[16px]">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Log in with email"
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

            {sendCodeError && (
              <p className="text-[14px] text-red-500">{sendCodeError}</p>
            )}
            {/* 验证码输入框 */}
            {codeSent && (
              <div className="flex h-[38px] items-center overflow-hidden rounded-[6px] border border-[#d9d9db] bg-white px-[12px] py-[4px]">
                <input
                  type="text"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 text-[14px] leading-[22px] text-[#1c1c26] placeholder:text-[rgba(19,19,26,0.2)] focus:outline-none"
                  required
                />
              </div>
            )}

            {emailLoginError && (
              <p className="text-[14px] text-red-500">{emailLoginError}</p>
            )}
            {/* 邮箱登录按钮 */}
            <button
              type="submit"
              disabled={!codeSent || !emailCode || emailLoginLoading}
              className="flex items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {emailLoginLoading ? (
                <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
              ) : (
                <>
                  <IconMail className="h-[24px] w-[24px]" />
                  <span>Log in with email</span>
                </>
              )}
            </button>
          </form>

          {/* 底部链接 */}
          {/* <div className="flex items-start justify-center gap-[4px] text-[16px] leading-[24px]">
            <span className="text-[#77777d]">Others?</span>
            <button className="font-bold text-[#5e85ee] transition-opacity hover:opacity-80">
              Create Organization
            </button>
          </div> */}
        </div>
      </div>
    </div>
  )
}
