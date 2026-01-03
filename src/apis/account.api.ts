import { AxiosInstance } from 'axios'

interface WalletLoginRequest {
  type: "wallet"
  address: string
  message: string
  signature: string
}

interface EmailLoginRequest {
  type: "email"
  email: string
  code: string
}

export class AccountApi {

  constructor(private readonly request: AxiosInstance) {}

  async getNonce() {
    const res = await this.request.post<{ nonce: string }>('/auth/nonce')
    return res.data
  }

  async login(params: WalletLoginRequest | EmailLoginRequest) {
    const res = await this.request.post<{ token: string }>('/auth/login', params)
    return res.data
  }

  async getEmailCode(email: string) {
    const res = await this.request.post<string>('/auth/email/code', { email })
    return res.data
  }
}
