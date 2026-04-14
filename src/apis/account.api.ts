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
  signMessage: string
  metaPubSignature: string
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

  async getmetaPubSignaturenMessage() {
    const res = await this.request.get<{ signMessage: string }>('/auth/meta-pub/sign-message')
    return res.data
  }

  async getMySignMessage() {
    const res = await this.request.get<{ signMessage: string ,updatedAt: Date }>('/auth/meta-pub/my-sign-message')
    return res.data
  }

  async verifyMetaPub(payload: { address: string; nonce: string; signature: string }) {
    const res = await this.request.post<
      { verified: true; token: string } | { verified: false; reason: string }
    >('/auth/meta-pub/verify', payload)
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

  async sendCurrentEmailCode() {
    const userId = localStorage.getItem('userId')
    if (!userId) throw new Error('userId is not found')
    await this.request.post(`/auth/users/${userId}/email/code`)
  }

  async bindEmail(account: string, code: string, oldCode?: string) {
    const userId = localStorage.getItem('userId')
    if (!userId) throw new Error('userId is not found')
    const body: Record<string, string> = { account, code }
    if (oldCode) body.oldCode = oldCode
    const res = await this.request.patch<{ success: boolean }>(`/auth/users/${userId}/email`, body)
    return res.data
  }

  async getUserAuths() {
    const userId = localStorage.getItem('userId')
    if (!userId) throw new Error('userId is not found')
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
