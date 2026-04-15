/**
 * 统一的交易状态枚举
 * - ready: 已创建，待打款（draft）
 * - complete: 已打款完成
 * - refunded: 已退款
 */
export enum PayrollTransactionStatus {
  READY = 'ready',
  COMPLETE = 'complete',
  REFUNDED = 'refunded',
}

/**
 * PayrollItem 单条发薪记录展示状态枚举（大部分为派生状态，仅 claimed 存储于 DB）
 * - awaiting_payment: 交易已创建，batch.transactionStatus 为 ready
 * - scheduled: batch.transactionStatus 为 complete，但 payPeriod 在当前时间之后
 * - claimable: batch.transactionStatus 为 complete，且 payPeriod 在当前时间之前/当前
 * - claimed: 已成功 claim（存储于 DB）
 * - refunded: batch.transactionStatus 为 refunded
 */
export enum PayrollItemStatus {
  AWAITING_PAYMENT = 'awaiting_payment',
  SCHEDULED = 'scheduled',
  CLAIMABLE = 'claimable',
  CLAIMED = 'claimed',
  REFUNDED = 'refunded',
}

/**
 * 获取状态的显示名称
 */
export const getStatusDisplayName = (status: PayrollTransactionStatus | string): string => {
  switch (status) {
    case PayrollTransactionStatus.READY:
      return 'Awaiting Payment'
    case PayrollTransactionStatus.COMPLETE:
      return 'Claimable'
    case PayrollTransactionStatus.REFUNDED:
      return 'Refunded'
    default:
      return status
  }
}

export const getPayrollItemStatusDisplayName = (status: PayrollItemStatus | string): string => {
  switch (status) {
    case PayrollItemStatus.AWAITING_PAYMENT:
      return 'Awaiting Payment'
    case PayrollItemStatus.SCHEDULED:
      return 'Scheduled'
    case PayrollItemStatus.CLAIMABLE:
      return 'Claimable'
    case PayrollItemStatus.CLAIMED:
      return 'Claimed'
    case PayrollItemStatus.REFUNDED:
      return 'Refunded'
    default:
      return status
  }
}
