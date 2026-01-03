import { AxiosInstance } from 'axios'

export interface TransactionPlanMember {
  memberId: string
  receivingAccountId: number
  amount: string
  currency: string
}

export interface CreateTransactionPlanPayload {
  payPeriod: string
  paymentAccountId: number
  transactionName: string
  members: TransactionPlanMember[]
}

export interface TransactionItemMember {
  showName: string
  status: string
}

export interface TransactionItemReceivingAccount {
  type: string
  config: {
    address: string
  }
  status: string
}

export interface TransactionItem {
  id: string
  memberId: string
  receivingAccountId: string
  receivingType: string
  receivingConfig: {
    address: string
  }
  amount: string
  currency: string
  createdAt: string
  updatedAt: string
  member: TransactionItemMember
  receivingAccount: TransactionItemReceivingAccount
}

export interface TransactionPlan {
  id: string
  orgId: string
  transactionName: string
  transactionType: string
  transactionStatus: 'pending' | 'ready' | 'complete'
  payPeriod: string
  createdBy: string
  createdAt: string
  items: TransactionItem[]
  paymentAccount?: {
    id: string
    type: string
    config: {
      nonce: number
      owners: string[]
      address: string
      network: string
      version: string
      threshold: number
    }
  }
}

export interface TransactionPlansResponse {
  data: TransactionPlan[]
  page: number
  pageSize: number
  total: number
}

export interface CreateTransactionPlanResponse {
  batchId: string
}

export class TransactionApi {
  constructor(private readonly request: AxiosInstance) {}
  // 统一获取 organizationId（作为 getter，更简洁）
  private get orgId(): string {
    const orgId = localStorage.getItem('organizationId')
    return orgId || ''
  }

  // 交易计划列表查询
  async getTransactionPlans(page: number = 1, pageSize: number = 20) {
    const res = await this.request.get<TransactionPlansResponse>(`/transaction/${this.orgId}`, {
      params: { page, pageSize }
    })
    return res.data
  }
  // async getTransactionPlans() {
  //   const res = await this.request.get<TransactionPlansResponse>(`/transaction/${this.orgId}`)
  //   return res.data
  // }

  // 获取单个交易计划详情
  async getTransactionPlanDetail(transaction_id: string) {
    const res = await this.request.get<TransactionPlan>(`/transaction/${this.orgId}/${transaction_id}`)
    return res.data
  }

  // 创建交易计划
  async createTransactionPlan(plan: CreateTransactionPlanPayload) {
    const res = await this.request.post<CreateTransactionPlanResponse>(`/transaction/${this.orgId}/plan`, plan)
    return res.data
  }

  // 删除交易计划
  async deleteTransactionPlan(transaction_id: string) {
    const res = await this.request.delete<string>(`/transaction/${this.orgId}/${transaction_id}`)
    return res.data
  }
}
