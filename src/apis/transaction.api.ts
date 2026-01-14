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
  transactionId: string
  transactionName: string
  transactionType: string
  transactionStatus:
    | 'draft' // 1️⃣ 仅创建了发薪计划，还没 propose
    | 'proposed' // 2️⃣ 已 propose（有 safeTxHash）
    | 'confirming' // 3️⃣ 收集中（未达到 threshold）
    | 'ready' // 4️⃣ 签名满足，可执行
    | 'success' // 6️⃣ 执行成功
    | 'failed' // ❌ 执行失败（最终态）
  payPeriod: string
  createdBy: string
  createdAt: string
  paymentAccount: {
    id: string
    type: string
    config: {
      nonce: number
      owners: string[]
      address: string
      chainId: string
      network: string
      version: string
      threshold: number
    }
  }
  items: Array<{
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
    member: {
      showName: string
      status: string
      userAuths: any[]
    }
    receivingAccount: {
      type: string
      config: {
        address: string
      }
      status: string
    }
  }>
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

export interface ProposeTransaction {
  signature:string,
  signerAddress:string,
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
    const res = await this.request.delete<string>(`/transaction/${this.orgId}/batch/${transaction_id}`)
    return res.data
  }

  // 获取交易哈希
  async getTransactionHash(transaction_id: string) {
    const res = await this.request.get<{txHash:string}>(`/transaction/${this.orgId}/${transaction_id}/getTxHash`)
    return res.data
  }

  // 发起交易
  async proposeTransaction(transaction_id: string,ProposeTransaction: ProposeTransaction ) {
    const res = await this.request.post<{success:boolean, safeTxHash:string}>(`/transaction/${this.orgId}/${transaction_id}/propose`, ProposeTransaction)
    return res.data
  }
}
