import api from '@/apis'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react'
import {
  IconBolt,
  IconChartBar,
  IconCircleCheck,
  IconHistory,
  IconLoader2,
  IconMail,
  IconShieldLock,
  IconUsersGroup,
  IconWallet
} from '@tabler/icons-react'
import { ComponentProps, ComponentType, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SiweMessage } from 'siwe'

interface Feature {
  icon: ComponentType<ComponentProps<'svg'>>
  title: string
  description: string
}

interface FeatureSectionProps {
  title: string
  features: Feature[]
}

interface FeatureCardProps {
  icon: ComponentType<ComponentProps<'svg'>>
  title: string
  description: string
}

const organizationFeatures = [
  {
    icon: IconShieldLock,
    title: 'Non-custodial',
    description: 'Your funds stay in your Safe wallet.'
  },
  {
    icon: IconBolt,
    title: 'Automated payouts',
    description: 'Set once, runs automatically forever.'
  },
  {
    icon: IconUsersGroup,
    title: 'Batch payments',
    description: 'Pay hundreds of contractors in one click.'
  },
  {
    icon: IconChartBar,
    title: 'Full transparency',
    description: 'Every transaction on-chain, auditable.'
  }
]

const memberFeatures = [
  {
    icon: IconCircleCheck,
    title: 'Instant payments to member',
    description: 'Join with invite code, receive payments immediately.'
  },
  {
    icon: IconHistory,
    title: 'Complete payment history',
    description: 'Always accessible, fully transparent.'
  }
]

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-blue-200">{description}</p>
    </div>
  )
}

function FeatureSection({ title, features }: FeatureSectionProps) {
  return (
    <div>
      <h2 className="mb-6 text-sm font-semibold tracking-wider text-blue-300 uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <FeatureCard key={index} icon={feature.icon} title={feature.title} description={feature.description} />
        ))}
      </div>
    </div>
  )
}

function WalletButton() {
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { chainId } = useAppKitNetwork()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const navigate = useNavigate()
  const userAction = useRef(false)
  const [loading, setLoading] = useState(false)

  const shortAddress = useMemo(() => {
    return address?.slice(0, 6) + '...' + address?.slice(-4)
  }, [address])

  const handleWalletConnect = () => {
    open({ view: 'Connect', namespace: 'eip155' })
    userAction.current = true
  }

  async function buildMessage(address: string, chainId: number) {
    const { nonce } = await api.auth.getNonce()

    const siweMessage = new SiweMessage({
      address,
      domain: 'https://' + location.host,
      uri: location.href,
      version: '1',
      chainId: chainId,
      nonce,
      statement: 'Sign in to PactPay',
      issuedAt: new Date().toISOString(),
      notBefore: new Date(Date.now() - 1000).toISOString()
    })

    const message = siweMessage.prepareMessage()
    return message
  }

  async function walletLogin(provider: Provider, address: string, chainId: number) {
    setLoading(true)
    try {
      const message = await buildMessage(address, chainId)
      const signature = await provider.request<string>({
        method: 'personal_sign',
        params: [message, address]
      })

      const { token } = await api.auth.login({ type: 'wallet', address: address, message, signature })
      localStorage.setItem('token', token)
      navigate('/account/identity')
    } catch (error) {
      console.error('Failed to sign in:', error)
    }
    setLoading(false)
  }

  function handleWalletSign() {
    if (!address || !chainId || !walletProvider) return
    walletLogin(walletProvider!, address, Number(chainId))
  }

  useEffect(() => {
    if (!userAction.current) return
    if (!address || !chainId || !walletProvider) return
    walletLogin(walletProvider!, address, Number(chainId))
  }, [address, walletProvider, navigate, userAction.current, chainId])

  return (
    <button
      onClick={isConnected ? handleWalletSign : handleWalletConnect}
      className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-6 py-4 font-medium text-white transition-colors hover:bg-gray-800"
    >
      {loading ? (
        <IconLoader2 className="h-6 w-6 animate-spin" />
      ) : (
        <>
          <IconWallet className="h-5 w-5" />
          <span>{isConnected ? `Continue with ${shortAddress}` : 'Connect Wallet'}</span>
        </>
      )}
    </button>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault()
    // TODO: 实现邮箱登录逻辑
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
            <FeatureSection title="FOR ORGANIZATIONS" features={organizationFeatures} />
          </div>

          {/* 成员功能 */}
          <div>
            <FeatureSection title="FOR MEMBERS" features={memberFeatures} />
          </div>
        </div>

        {/* 版权信息 */}
        <div className="text-sm text-blue-300">© 2024 PactPay. All rights reserved.</div>
      </div>

      {/* 右侧登录区域 */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-white p-8">
        {/* 登录卡片 */}
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">Log in to PactPay</h2>
          <p className="mb-8 text-gray-600">Connect your wallet or sign in with email to get started</p>

          {/* 钱包登录按钮 */}
          <WalletButton />

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
                onChange={e => setEmail(e.target.value)}
                placeholder="name@work-email.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <IconMail className="h-5 w-5" />
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
      </div>
    </div>
  )
}
