import { AxiosInstance } from 'axios'

interface Chain {
  id: string
  key: string
  name: string
  iconUrl: string
  chainId: string
  ecosystem: string
}

export class ChainAssetApi {
  constructor(private readonly request: AxiosInstance) {}

  async getChains() {
    const res = await this.request.get<Chain[]>('/chain-asset/chains')
    return res.data
  }
}
