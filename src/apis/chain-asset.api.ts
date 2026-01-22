import { AxiosInstance } from 'axios'

interface ChainAssetResponse {
  data: Array<{
    id: string
    caipChainId: string
    assetId: string
    contractAddress: string
    decimals: number
    isNative: boolean
    status: string
    createdAt: string
    updatedAt: string
    chain: Chain
    asset: Asset
  }>
  page: number
  pageSize: number
  total: number
}
interface Asset {
  id: string
  symbol: string
  name: string
  iconUrl: string
  isStable: boolean
  status: string
  createdAt: string
  updatedAt: string
}
interface Chain {
  id: string
  caipChainId: string
  name: string
  chainId: string
  ecosystem: string
  iconUrl: string
  rpcUrls: string[]
  explorerUrls: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export class ChainAssetApi {
  constructor(private readonly request: AxiosInstance) {}

  async getChainAssets() {
    const res = await this.request.get<ChainAssetResponse>('/chain-asset')
    return res.data
  }

  async getChains() {
    const res = await this.request.get<Chain[]>('/chain-asset/chains')
    return res.data
  }
}
