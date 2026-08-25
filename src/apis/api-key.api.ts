import { AxiosInstance } from 'axios'

export interface ApiKeyItem {
  id: string
  keyId: string
  name: string
  prefix: string
  userId: string
  orgId?: string | null
  scopes: string[]
  status: 'active' | 'revoked'
  lastUsedAt?: string | null
  expiresAt?: string | null
  rotatedFrom?: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiKeyCreatedItem extends ApiKeyItem {
  plainKey: string
}

export interface ApiKeyListResponse {
  data: ApiKeyItem[]
  page: number
  pageSize: number
  total: number
}

export interface CreateApiKeyPayload {
  name: string
  scopes?: string[]
  expiresInDays?: number
}

export class ApiKeyApi {
  constructor(private readonly request: AxiosInstance) {}

  // 用户级 API Key：后端按登录态识别当前用户，不再走 /orgs/:orgId。
  async getApiKeys(params: { page?: number; pageSize?: number; status?: string } = {}) {
    const { page = 1, pageSize = 20, status } = params
    const res = await this.request.get<ApiKeyListResponse>(`/api-keys`, {
      params: { page, pageSize, ...(status ? { status } : {}) },
    })
    return res.data
  }

  async createApiKey(payload: CreateApiKeyPayload) {
    const res = await this.request.post<ApiKeyCreatedItem>(`/api-keys`, payload)
    return res.data
  }

  async revokeApiKey(id: string) {
    const res = await this.request.delete<ApiKeyItem>(`/api-keys/${id}`)
    return res.data
  }

  async rotateApiKey(id: string) {
    const res = await this.request.post<ApiKeyCreatedItem>(`/api-keys/${id}/rotate`)
    return res.data
  }
}
