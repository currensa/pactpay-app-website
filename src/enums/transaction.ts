/**
 * 统一的交易状态枚举
 * - ready:    交易已创建，awaiting payment
 * - pending:  已 execute，未到 claim 日期（Scheduled）
 * - complete: 已到 claim 时间，Member 可操作 claim（Claimable）
 * - claimed:  Member 已完成 claim
 * - refunded: B 端取消，资金已退回
 */
export enum PayrollTransactionStatus {
  READY = 'ready',
  PENDING = 'pending',
  COMPLETE = 'complete',
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
    case PayrollTransactionStatus.PENDING:
      return 'Scheduled'
    case PayrollTransactionStatus.COMPLETE:
      return 'Claimable'
    case PayrollTransactionStatus.CLAIMED:
      return 'Claimed'
    case PayrollTransactionStatus.REFUNDED:
      return 'Refunded'
    default:
      return status
  }
}
