import type { NetworkConfigResponse } from '@/apis/chain-asset.api'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { defineChain } from 'viem'

export function buildWalletNetworks(config: NetworkConfigResponse[]): [AppKitNetwork, ...AppKitNetwork[]] {
  if (config.length === 0) throw new Error('No wallet networks are configured')

  const seen = new Set<number>()
  const networks = config.map(chain => {
    const rpcUrl = chain.rpcUrls[0]
    if (chain.family !== 'evm' || !Number.isSafeInteger(chain.chainId) || seen.has(chain.chainId) || !rpcUrl) {
      throw new Error('Invalid wallet network configuration')
    }
    seen.add(chain.chainId)

    const explorerUrl = chain.blockExplorerUrls[0]
    return defineChain({
      id: chain.chainId,
      name: chain.chainName,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: { default: { http: [rpcUrl] } },
      blockExplorers: explorerUrl
        ? { default: { name: `${chain.chainName} Explorer`, url: explorerUrl } }
        : undefined,
      testnet: chain.isTestnet,
    })
  })

  return [networks[0], ...networks.slice(1)]
}
