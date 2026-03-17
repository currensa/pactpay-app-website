import { AxiosInstance } from 'axios'

interface WalletLoginRequest {
  type: "wallet"
  address: string
  nonce: string
  signature: string
}

interface EmailLoginRequest {
  type: "email"
  email: string
  code: string
}

export interface SubmitMetaPubRequest {
  address: string
  metaPub: string
  signature: string
}

export class AccountApi {

  constructor(private readonly request: AxiosInstance) {}

  async getNonce() {
    const res = await this.request.post<{ nonce: string }>('/auth/nonce')
    return res.data
  }

  async login(params: WalletLoginRequest | EmailLoginRequest) {
    const res = await this.request.post<{ token: string; userId: string; isNew: boolean }>('/auth/login', params)
    return res.data
  }

  async getEmailCode(email: string) {
    const res = await this.request.post<string>('/auth/email/code', { email })
    return res.data
  }

  async getMetaPubStatus() {
    const res = await this.request.get<{ submitted: boolean }>('/auth/meta-pub')
    return res.data
  }

  async submitMetaPub(payload: SubmitMetaPubRequest) {
    const res = await this.request.post<{ success: boolean }>('/auth/meta-pub', payload)
    return res.data
  }

  async uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await this.request.post<{ url: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data.url
  }

  async getUserAuths(userId: string) {
    const res = await this.request.get<{
      list: Array<{
        id: string
        userId: string
        type: string
        account: string
        createdAt: string
        updatedAt: string
      }>
    }>(`/auth/users/${userId}/auths`)
    return res.data.list
  }
}
