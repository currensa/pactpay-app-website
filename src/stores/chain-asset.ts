import apis from '@/apis'
import type { ChainAssetResponse } from '@/apis/chain-asset.api'
import { create } from 'zustand'

type ChainAssetItem = ChainAssetResponse['data'][number]

interface Chain {
  id: string
  caipChainId: string
  name: string
  chainId: string
  ecosystem: string
  iconUrl: string
  explorerUrls: string[]
  status: string
  createdAt: string
  updatedAt: string
  vaultAddress: string | null
}

interface ChainAssetState {
  chainAssets: ChainAssetItem[]
  chains: Chain[]
  /** Fetch chain-assets if not already loaded (idempotent). */
  fetchChainAssets: () => Promise<ChainAssetItem[]>
  /** Fetch chains if not already loaded (idempotent). */
  fetchChains: () => Promise<Chain[]>
  /** 根据 caipChainId + token 合约地址返回货币 symbol，找不到时返回 null。 */
  getTokenSymbol: (caipChainId: string, token: string) => string | null
  /** 根据 caipChainId 返回 ChainAsset 条目（含 decimals / isNative）。 */
  getChainAssetByToken: (caipChainId: string, token: string) => ChainAssetItem | null
  /** 根据 caipChainId 返回链信息。 */
  getChain: (caipChainId: string) => Chain | null
  /** 根据 caipChainId + token 合约地址返回 decimals，找不到时返回 18。 */
  getTokenDecimals: (caipChainId: string, token: string) => number
  /** 根据 caipChainId + token 合约地址返回 asset.iconUrl，找不到时返回 null。 */
  getTokenIconUrl: (caipChainId: string, token: string) => string | null
  reset: () => void
}

const useChainAssetStore = create<ChainAssetState>((set, get) => ({
  chainAssets: [],
  chains: [],

  fetchChainAssets: async () => {
    const existing = get().chainAssets
    if (existing.length > 0) return existing
    const res = await apis.chainAsset.getChainAssets()
    const data = res.data ?? []
    set({ chainAssets: data })
    return data
  },

  fetchChains: async () => {
    const existing = get().chains
    if (existing.length > 0) return existing
    const res = await apis.chainAsset.getChains()
    set({ chains: res ?? [] })
    return res ?? []
  },

  getTokenSymbol: (caipChainId: string, token: string) => {
    const match = get().chainAssets.find(
      a =>
        a.caipChainId === caipChainId &&
        (a.isNative
          ? token === '' || token === '0x0000000000000000000000000000000000000000'
          : a.contractAddress?.toLowerCase() === token?.toLowerCase())
    )
    return match?.asset.symbol ?? null
  },

  getChainAssetByToken: (caipChainId: string, token: string) => {
    return get().chainAssets.find(
      a =>
        a.caipChainId === caipChainId &&
        (a.isNative
          ? token === '' || token === '0x0000000000000000000000000000000000000000'
          : a.contractAddress?.toLowerCase() === token?.toLowerCase())
    ) ?? null
  },

  getChain: (caipChainId: string) => {
    return get().chains.find(c => c.caipChainId === caipChainId) ?? null
  },

  getTokenDecimals: (caipChainId: string, token: string) => {
    const match = get().chainAssets.find(
      a =>
        a.caipChainId === caipChainId &&
        (a.isNative
          ? token === '' || token === '0x0000000000000000000000000000000000000000'
          : a.contractAddress?.toLowerCase() === token?.toLowerCase())
    )
    return match?.decimals ?? 18
  },

  getTokenIconUrl: (caipChainId: string, token: string) => {
    const match = get().chainAssets.find(
      a =>
        a.caipChainId === caipChainId &&
        (a.isNative
          ? token === '' || token === '0x0000000000000000000000000000000000000000'
          : a.contractAddress?.toLowerCase() === token?.toLowerCase())
    )
    return match?.asset.iconUrl ?? null
  },

  reset: () => set({ chainAssets: [], chains: [] }),
}))

export default useChainAssetStore
