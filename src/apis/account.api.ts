import { AxiosInstance } from 'axios'
import type { WalletChallenge } from '@/lib/wallet-authorization'

interface WalletLoginRequest {
  type: "wallet"
  family: "evm"
  address: string
  nonce: string
  signature: string
}
interface EmailLoginRequest {
  type: "email"
  email: string
  code: string
}

export interface GravArcUserInfoDto {
  userId: string
  address: string
  encryptedSecret: string
  secretHash: string
  encPubkey?: string | null
}

export interface SaveGravArcUserInfoDto {
  address: string
  family: 'evm'
  encryptedSecret: string
  secretHash: string
  encPubkey: string
  authorization: { nonce: string; signature: string }
}

interface GoogleLoginResponse {
  token: string
  userId: string
  isNew: boolean
  gravArcUserInfo?: GravArcUserInfoDto | null
}

export class AccountApi {

  constructor(private readonly request: AxiosInstance) {}

  async getWalletChallenge(payload: {
    address: string
    family: 'evm'
    action: 'login' | 'privacy-profile-register'
    payloadHash: string
  }) {
    const res = await this.request.post<WalletChallenge>('/auth/wallet/challenge', payload)
    return res.data
  }

  async login(params: WalletLoginRequest | EmailLoginRequest) {
    const res = await this.request.post<GoogleLoginResponse>('/auth/login', params)
    return res.data
  }

  async googleLogin(credential: string) {
    const res = await this.request.post<GoogleLoginResponse>('/auth/google', { credential })
    return res.data
  }

  async getEmailCode(email: string) {
    const res = await this.request.post<string>('/auth/email/code', { email })
    return res.data
  }

  async getGravArcUserInfoStatus() {
    const res = await this.request.get<{ submitted: boolean }>('/auth/gravarc-user-info')
    return res.data
  }

  async getMyGravArcUserInfo() {
    const res = await this.request.get<(Pick<GravArcUserInfoDto, 'address' | 'encryptedSecret' | 'secretHash'> & { encPubkey: string | null }) | null>(
      '/auth/gravarc-user-info/detail',
    )
    return res.data
  }

  async saveGravArcUserInfo(payload: SaveGravArcUserInfoDto) {
    const res = await this.request.post<{ success: boolean }>('/auth/gravarc-user-info', payload)
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
