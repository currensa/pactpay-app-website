import { AxiosInstance } from 'axios'

export interface ChainAssetResponse {
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
  explorerUrls: string[]
  status: string
  createdAt: string
  updatedAt: string
  vaultAddress: string | null
}

/** 组织支付账户支持的 Asset/Chain 单项（用于 GET :orgId/assets-chains） */
export interface OrgAssetChainItem {
  id: string
  caipChainId: string
  assetId: string
  contractAddress: string
  decimals: number
  isNative: boolean
  status: string
  createdAt: string
  updatedAt: string
  asset: {
    id: string
    symbol: string
    name: string
    iconUrl: string
    isStable: boolean
    status: string
    createdAt: string
    updatedAt: string
  }
  chain: Chain
}

export class ChainAssetApi {
  constructor(private readonly request: AxiosInstance) {}

    // 统一获取 organizationId（作为 getter，更简洁）
    private get orgId(): string {
      const orgId = localStorage.getItem('organizationId')
      return orgId || ''
    }

  async getChainAssets() {
    const res = await this.request.get<ChainAssetResponse>('/chain-asset')
    return res.data
  }

  async getChains() {
    const res = await this.request.get<Chain[]>('/chain-asset/chains')
    return res.data
  }

  /** 获取组织支付账户支持的 Assets/Chains */
  async getOrgAssetsChains(): Promise<OrgAssetChainItem[]> {
    const res = await this.request.get<OrgAssetChainItem[]>(`/orgs/${this.orgId}/assets-chains`)
    return res.data
  }
}
