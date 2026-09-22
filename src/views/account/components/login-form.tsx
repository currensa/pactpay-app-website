import api from '@/apis'
import useAuthStore from '@/stores/auth'
import { usePublicCopy } from '@/views/public/copy'
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
  const { copy } = usePublicCopy()
  const userAction = useRef(false)
  const [loading, setLoading] = useState(false)
  const setGravArcUserInfo = useAuthStore(s => s.setGravArcUserInfo)

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
        params: [nonce, addr],
      })
      const { token, userId, gravArcUserInfo } = await api.auth.login({
        type: 'wallet',
        family: 'evm',
        address: addr,
        nonce,
        signature,
      })
      persistAuthSession('wallet', { token, userId, address: addr, gravArcUserInfo })
      setGravArcUserInfo(gravArcUserInfo ?? null)
      onLoginSuccess()
    } catch (error) {
      console.error('Failed to sign in:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userAction.current || !address || !walletProvider) return
    void walletLogin(walletProvider, address)
  }, [address, walletProvider])

  const handleWalletSign = () => {
    if (!address || !walletProvider) return
    void walletLogin(walletProvider, address)
  }

  return (
    <div className="flex flex-col items-center gap-[10px]">
      <button
        type="button"
        onClick={isConnected ? handleWalletSign : handleWalletConnect}
        disabled={loading}
        className="flex min-h-[46px] w-full items-center justify-center gap-[8px] rounded-full bg-[#5E85EE] px-4 py-3 text-[14px] font-bold leading-[20px] text-white transition-opacity hover:opacity-90 disabled:opacity-70 sm:min-h-[52px] sm:px-[24px] sm:py-[14px] sm:text-[16px] sm:leading-[24px]"
      >
        {loading ? (
          <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
        ) : (
          <>
            <IconWallet className="h-[24px] w-[24px]" />
            <span>
              {isConnected
                ? copy.login.continueWithWallet.replace('{address}', shortAddress)
                : copy.login.connectWallet}
            </span>
          </>
        )}
      </button>
      {isConnected && (
        <button
          type="button"
          onClick={() => void handleSwitchWallet()}
          className="text-[13px] leading-[20px] text-[#606067] transition-opacity hover:opacity-70"
        >
          {copy.login.connectAnotherWallet}
        </button>
      )}
    </div>
  )
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const navigate = useNavigate()
  const { isConnected } = useAppKitAccount()
  const { copy } = usePublicCopy()
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendCodeLoading, setSendCodeLoading] = useState(false)
  const [emailLoginLoading, setEmailLoginLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const setGravArcUserInfo = useAuthStore(s => s.setGravArcUserInfo)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleSendCode = async () => {
    if (!email) return
    setSendCodeLoading(true)
    try {
      await api.auth.getEmailCode(email)
      setCodeSent(true)
      setCountdown(60)
    } catch (error) {
      console.error('Failed to send code:', error)
    } finally {
      setSendCodeLoading(false)
    }
  }

  const emailLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !emailCode) return
    setEmailLoginLoading(true)
    try {
      const { token, userId, gravArcUserInfo } = await api.auth.login({
        type: 'email',
        email,
        code: emailCode.toUpperCase(),
      })
      persistAuthSession('email', { token, userId, email, gravArcUserInfo })
      setGravArcUserInfo(gravArcUserInfo ?? null)
      onLoginSuccess()
    } catch (error) {
      console.error('Failed to sign in with email:', error)
    } finally {
      setEmailLoginLoading(false)
    }
  }

  return (
    <div className="flex w-full items-center justify-center py-1 sm:py-4 lg:h-full">
      <div className="flex w-full max-w-[480px] flex-col gap-8 sm:gap-10 lg:gap-[80px]">
        <div className="flex flex-col gap-[8px] text-center">
          <h1 className="font-['Poppins',sans-serif] text-[34px] font-medium leading-none tracking-[-0.68px] text-[#1c1c26] sm:text-[42px] sm:tracking-[-0.84px] lg:text-[56px] lg:tracking-[-1.12px]">
            {isConnected ? copy.login.welcomeBack : copy.login.createAccount}
          </h1>
        </div>

        <div className="flex flex-col gap-6 sm:gap-[32px]">
          <div className="flex w-full max-w-[480px] self-center flex-col gap-3 sm:gap-[24px]">
            <WalletButton onLoginSuccess={onLoginSuccess} />
            <GoogleSignInButton onLoginSuccess={onLoginSuccess} />
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-[24px]">
            <div className="h-[1px] flex-1 bg-[#d9d9db]" />
            <span className="text-[16px] leading-[24px] text-[#77777d]">{copy.login.or}</span>
            <div className="h-[1px] flex-1 bg-[#d9d9db]" />
          </div>

          <form onSubmit={emailLogin} noValidate className="flex w-full max-w-[480px] self-center flex-col gap-4 sm:gap-[24px]">
            <div className="flex min-h-[48px] items-center gap-2 overflow-hidden rounded-[14px] bg-[#f5f5f5] px-3 py-2 sm:min-h-[56px] sm:gap-3 sm:rounded-[16px] sm:px-[16px] sm:py-[8px]">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={copy.login.emailPlaceholder}
                className="flex-1 bg-transparent text-[14px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none sm:text-[16px] sm:leading-[24px]"
                required
              />
              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={!email || sendCodeLoading || countdown > 0}
                className="shrink-0 rounded-full bg-white px-2.5 py-1.5 whitespace-nowrap text-[11px] font-semibold leading-[16px] text-[#5e85ee] transition-opacity hover:opacity-80 disabled:opacity-50 sm:bg-transparent sm:px-0 sm:py-0 sm:text-[14px] sm:leading-[22px]"
              >
                {sendCodeLoading ? (
                  <IconLoader2 className="h-[18px] w-[18px] animate-spin" />
                ) : countdown > 0 ? (
                  copy.login.resendIn.replace('{seconds}', String(countdown))
                ) : codeSent ? (
                  copy.login.resendCode
                ) : (
                  copy.login.sendCode
                )}
              </button>
            </div>

            {codeSent && (
              <div className="flex min-h-[42px] items-center overflow-hidden rounded-[10px] border border-[#d9d9db] bg-white px-3 py-2 sm:min-h-[44px] sm:rounded-[10px] sm:px-[12px] sm:py-[6px]">
                <input
                  type="text"
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value)}
                  placeholder={copy.login.codePlaceholder}
                  className="flex-1 text-[13px] leading-[18px] text-[#1c1c26] placeholder:text-[rgba(19,19,26,0.2)] focus:outline-none sm:text-[14px] sm:leading-[22px]"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!codeSent || !emailCode || emailLoginLoading}
              className="flex min-h-[46px] w-full items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-4 py-3 text-[14px] font-bold leading-[20px] text-[#1c1c26] transition-opacity hover:opacity-90 disabled:opacity-50 sm:min-h-[52px] sm:px-[24px] sm:py-[14px] sm:text-[16px] sm:leading-[24px]"
            >
              {emailLoginLoading ? (
                <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
              ) : (
                <>
                  <IconMail className="h-[24px] w-[24px]" />
                  <span>{copy.login.continueWithEmail}</span>
                </>
              )}
            </button>
          </form>

          <p className="px-1 text-center text-[12px] leading-[18px] text-[#8d8d93]">
            {copy.login.agreePrefix}{' '}
            <button onClick={() => navigate('/legal/terms')} className="underline transition-colors hover:text-[#606067]">
              {copy.common.termsOfUse}
            </button>{' '}
            {copy.login.agreeMiddle}{' '}
            <button onClick={() => navigate('/legal/privacy')} className="underline transition-colors hover:text-[#606067]">
              {copy.common.privacyPolicy}
            </button>
            {copy.login.agreeSuffix}
          </p>
        </div>
      </div>
    </div>
  )
}
