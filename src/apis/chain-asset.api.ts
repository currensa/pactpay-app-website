import { AxiosInstance } from 'axios'

export interface ChainAssetResponse {
  data: Array<{
    caipChainId: string
    contractAddress: string | null
    decimals: number
    isNative: boolean
    status: string
    chain: Chain
    asset: Asset
  }>
  page: number
  pageSize: number
  total: number
}
interface Asset {
  symbol: string
  name: string
  iconUrl: string
  isStable: boolean
  status: string
}
interface Chain {
  caipChainId: string
  name: string
  chainId: string
  ecosystem: string
  iconUrl: string
  explorerUrls: string[]
  status: string
  vaultAddress: string | null
}

export interface NetworkConfigResponse {
  caipChainId: string
  chainId: number
  chainName: string
  family: 'evm'
  isTestnet: boolean
  confirmations: number
  deploymentBlock: number
  nativeCurrency: { name: string; symbol: string; decimals: number }
  rpcUrls: string[]
  blockExplorerUrls: string[]
  contracts: {
    gravArc: string
    pureRouter: string
    defiRouter: string
    verifiers: Record<'deposit' | 'withdraw' | 'refund', Record<string, string>>
  }
  tokens: Array<{ symbol: string; name: string; address: string; decimals: number; isStable: boolean }>
  protocols: Array<{
    name: string
    type?: string
    outputBehavior: 'fixed' | 'variable'
    address: string
    'help-contracts'?: Record<string, string>
  }>
  capabilities: {
    deposit: boolean
    withdraw: boolean
    refund: boolean
    defi: boolean
  }
}

/** 组织支付账户支持的 Asset/Chain 单项（用于 GET :orgId/assets-chains） */
export interface OrgAssetChainItem {
  caipChainId: string
  contractAddress: string | null
  decimals: number
  isNative: boolean
  status: string
  asset: {
    symbol: string
    name: string
    iconUrl: string
    isStable: boolean
    status: string
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

  async getNetworks() {
    const res = await this.request.get<NetworkConfigResponse[]>('/chain-asset/networks')
    return res.data
  }

  /** 获取组织支付账户支持的 Assets/Chains */
  async getOrgAssetsChains(): Promise<OrgAssetChainItem[]> {
    const res = await this.request.get<OrgAssetChainItem[]>(`/orgs/${this.orgId}/assets-chains`)
    return res.data
  }
}
