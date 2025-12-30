import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { AppKitNetwork, bsc, mainnet, sepolia } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

const queryClient = new QueryClient()

const projectId = "703b5eec3f3f1a6df2c7eb6e052963ac"

const metadata = {
  name: 'PactPay',
  description: 'PactPay',
  url: 'https://pactpay.app', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

const networks = [mainnet, sepolia, bsc] as [AppKitNetwork, ...AppKitNetwork[]]

const wagmiAdapter = new WagmiAdapter({
  networks, projectId, ssr: false
})

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  metadata,
  networks,
  features: {
    analytics: false,
    socials: false,     // 关闭社交媒体登录
    email: false,      // 关闭邮箱登录
  },
})

export default function (props: { children: React.ReactNode }) {

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
