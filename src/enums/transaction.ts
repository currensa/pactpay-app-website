/**
 * 统一的交易状态枚举
 * - ready: 已创建，待执行
 * - pending: 已提交或待链上确认
 * - complete: 已执行完成，C 端可 claim
 */
export enum PayrollTransactionStatus {
  READY = 'ready',
  PENDING = 'pending',
  COMPLETE = 'complete',
}

/**
 * 获取状态的显示名称
 */
export const getStatusDisplayName = (status: PayrollTransactionStatus | string): string => {
  switch (status) {
    case PayrollTransactionStatus.READY:
      return 'Ready'
    case PayrollTransactionStatus.PENDING:
      return 'Pending'
    case PayrollTransactionStatus.COMPLETE:
      return 'Complete'
    default:
      return status
  }
}
