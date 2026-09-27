import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getAccount, switchChain } from '@wagmi/core'
import { useState } from 'react'
import { WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

const projectId = '703b5eec3f3f1a6df2c7eb6e052963ac'

let walletIntegration: ReturnType<typeof initializeWallet> | null = null

export async function selectWalletNetwork(chainId: number) {
  const integration = walletIntegration
  if (!integration) throw new Error('Wallet connections are not initialized')
  const network = integration.networks.find(item => item.id === chainId)
  if (!network) throw new Error(`Unsupported wallet network ${chainId}`)
  const account = getAccount(integration.adapter.wagmiConfig)
  if (account.isConnected && account.chainId !== chainId) {
    await switchChain(integration.adapter.wagmiConfig, { chainId })
  }
  await integration.appKit.switchNetwork(network, { throwOnFailure: true })
}

export async function openWalletModal(chainId?: number) {
  const integration = walletIntegration
  if (!integration) throw new Error('Wallet connections are not initialized')
  await selectWalletNetwork(chainId ?? Number(integration.networks[0].id))
  await integration.appKit.open({ view: 'Connect', namespace: 'eip155' })
}

function initializeWallet(networks: [AppKitNetwork, ...AppKitNetwork[]]) {
  const appUrl = window.location.origin
  const customRpcUrls = Object.fromEntries(networks.map(network => [
    `eip155:${network.id}`,
    [{ url: network.rpcUrls.default.http[0] }],
  ]))
  const wagmiAdapter = new WagmiAdapter({
    networks,
    projectId,
    customRpcUrls,
    ssr: false
  })

  const appKit = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    metadata: {
      name: 'PactPay',
      description: 'PactPay',
      url: appUrl,
      icons: [`${appUrl}/favicon.ico`]
    },
    networks,
    defaultNetwork: networks[0],
    customRpcUrls,
    coinbasePreference: 'eoaOnly',
    defaultAccountTypes: { eip155: 'eoa' },
    features: {
      analytics: false,
      socials: false,
      email: false,
      swaps: false,
      onramp: false,
      receive: false,
      send: false,
      history: false,
      smartSessions: false,
      reownAuthentication: false
    }
  })
  const integration = { adapter: wagmiAdapter, appKit, networks }
  walletIntegration = integration
  return integration
}

export default function ReownAppKitProvider(props: {
  children: React.ReactNode
  networks: [AppKitNetwork, ...AppKitNetwork[]]
}) {
  const [integration] = useState(() => initializeWallet(props.networks))
  return (
    <WagmiProvider config={integration.adapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
    </WagmiProvider>
  )
}
