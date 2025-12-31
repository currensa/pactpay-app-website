import api from '@/apis'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react'
import { IconWallet } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiweMessage } from 'siwe'

function WalletLoginButton() {
  const { open } = useAppKit()
  const handleWalletLogin = () => {
    open({ view: 'Connect', namespace: 'eip155' })
  }

  return (
    <button
      onClick={handleWalletLogin}
      className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-6 py-4 font-medium text-white transition-colors hover:bg-gray-800"
    >
      <IconWallet className="h-5 w-5" />
      <span>Connect Wallet</span>
    </button>
  )
}

function WalletSignButton() {
  const { chainId } = useAppKitNetwork()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const navigate = useNavigate()

  const shortAddress = useMemo(() => {
    return address?.slice(0, 6) + '...' + address?.slice(-4)
  }, [address])

  async function handleWalletSign() {
    const { nonce } = await api.auth.getNonce()

    const siweMessage = new SiweMessage({
      address,
      domain: 'https://' + location.host,
      uri: location.href,
      version: '1',
      chainId: Number(chainId),
      nonce,
      statement: 'Sign in to PactPay',
      issuedAt: new Date().toISOString(),
      notBefore: new Date(Date.now() - 1000).toISOString()
    })

    const message = siweMessage.prepareMessage()

    const signature = await walletProvider.request<string>({
      method: 'personal_sign',
      params: [message, address]
    })

    const { token } = await api.auth.login({
      type: 'wallet',
      address: address!,
      message,
      signature
    })

    if (!token) throw new Error('Failed to login')

    localStorage.setItem('token', token)
    navigate('/')
  }

  return (
    <button
      onClick={handleWalletSign}
      className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-6 py-4 font-medium text-white transition-colors hover:bg-gray-800"
    >
      <Wallet className="h-5 w-5" />
      <span>Continue with {shortAddress}</span>
    </button>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const { isConnected } = useAppKitAccount()

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 实现邮箱登录逻辑
    console.log('Email login:', email)
  }

  return (
    <div className="flex h-screen">
      {/* 左侧功能展示区域 */}
      <div className="hidden flex-col justify-between bg-linear-to-br from-blue-900 via-blue-800 to-purple-900 p-12 text-white lg:flex lg:w-1/2">
        <div>
          {/* Logo */}
          <div className="mb-16 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500">
              <span className="text-xl font-bold text-white">P</span>
            </div>
            <span className="text-2xl font-semibold">PactPay</span>
          </div>

          {/* 标题 */}
          <h1 className="mb-4 text-5xl font-bold">Pay smarter, not harder.</h1>
          <p className="mb-16 text-xl text-blue-200">
            Automated Web3 payments. Non-custodial, transparent, effortless.
          </p>

          {/* 组织功能 */}
          <div className="mb-12">
            <h2 className="mb-6 text-sm font-semibold tracking-wider text-blue-300 uppercase">FOR ORGANIZATIONS</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-8 w-8 items-center justify-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 font-semibold">Non-custodial</h3>
                <p className="text-sm text-blue-200">Your funds stay in your Safe wallet.</p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-8 w-8 items-center justify-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mb-1 font-semibold">Automated payouts</h3>
                <p className="text-sm text-blue-200">Set once, runs automatically forever.</p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-8 w-8 items-center justify-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 font-semibold">Batch payments</h3>
                <p className="text-sm text-blue-200">Pay hundreds of contractors in one click.</p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-8 w-8 items-center justify-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 font-semibold">Full transparency</h3>
                <p className="text-sm text-blue-200">Every transaction on-chain, auditable.</p>
              </div>
            </div>
          </div>

          {/* 成员功能 */}
          <div>
            <h2 className="mb-6 text-sm font-semibold tracking-wider text-blue-300 uppercase">FOR MEMBERS</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-8 w-8 items-center justify-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 font-semibold">Instant payments to member</h3>
                <p className="text-sm text-blue-200">Join with invite code, receive payments immediately.</p>
              </div>

              <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="mb-3 flex h-8 w-8 items-center justify-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 font-semibold">Complete payment history</h3>
                <p className="text-sm text-blue-200">Always accessible, fully transparent.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="text-sm text-blue-300">© 2024 PactPay. All rights reserved.</div>
      </div>

      {/* 右侧登录区域 */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white p-8">
        {/* 创建组织按钮 */}
        <button className="absolute top-8 right-8 rounded-lg border border-blue-300 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50">
          Create Organization
        </button>

        {/* 登录卡片 */}
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">Log in to PactPay</h2>
          <p className="mb-8 text-gray-600">Connect your wallet or sign in with email to get started</p>

          {/* 钱包登录按钮 */}
          {isConnected ? <WalletSignButton /> : <WalletLoginButton />}

          {/* 分隔线 */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-sm text-gray-500">or</span>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>

          {/* 邮箱登录表单 */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@work-email.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Continue with email
            </button>
          </form>

          {/* 服务条款 */}
          <p className="mt-6 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* 帮助图标 */}
        <button className="absolute right-8 bottom-8 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
