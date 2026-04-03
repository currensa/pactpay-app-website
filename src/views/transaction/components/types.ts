export interface Transaction {
  id: string
  name: string
  transactionId: string
  type: string
  status: 'ready' | 'pending' | 'complete' | 'refunded'
  executionDate: string
  daysRemaining: number | null
  isDueToday: boolean
  totalAmount: string
  currency: string
  members: number
  network: string
  isComplete: boolean
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
