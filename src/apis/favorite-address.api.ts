import { AxiosInstance } from 'axios'

export interface FavoriteAddressItem {
  id: string
  userId: string
  caipChainId: string
  address: string
  remark: string | null
  createdAt: string
  updatedAt: string
}

export interface FavoriteAddressListResponse {
  data: FavoriteAddressItem[]
  page: number
  pageSize: number
  total: number
}

export interface CreateFavoriteAddressPayload {
  caipChainId: string
  address: string
  remark?: string
}

export interface UpdateFavoriteAddressPayload {
  caipChainId?: string
  address?: string
  remark?: string
}

export class FavoriteAddressApi {
  constructor(private readonly request: AxiosInstance) {}

  async getList(params: {
    page?: number
    pageSize?: number
    keyword?: string
    caipChainId?: string
  } = {}) {
    const res = await this.request.get<FavoriteAddressListResponse>('/favorite-addresses', { params })
    return res.data
  }

  async getDetail(id: string) {
    const res = await this.request.get<FavoriteAddressItem>(`/favorite-addresses/${id}`)
    return res.data
  }

  async create(payload: CreateFavoriteAddressPayload) {
    const res = await this.request.post<FavoriteAddressItem>('/favorite-addresses', payload)
    return res.data
  }

  async update(id: string, payload: UpdateFavoriteAddressPayload) {
    const res = await this.request.patch<FavoriteAddressItem>(`/favorite-addresses/${id}`, payload)
    return res.data
  }

  async remove(id: string) {
    await this.request.delete(`/favorite-addresses/${id}`)
  }
}
