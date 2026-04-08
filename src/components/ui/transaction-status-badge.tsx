import { PayrollTransactionStatus } from '@/enums/transaction'

/**
 * Shared badge for transaction lifecycle statuses.
 *
 * Transaction statuses:
 *   ready     → Awaiting Payment  (gray)
 *   pending   → Scheduled         (blue)
 *   complete  → Claimable         (light green)
 *   claimed   → Claimed           (dark green)
 *   refunded  → Refunded          (red)
 *
 * Member-item statuses (item-level, not transaction-level):
 *   pending   → Claimable         (light green)
 *   claimed   → Claimed           (dark green)
 */


export function TransactionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case PayrollTransactionStatus.READY:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(94,133,238,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5e85ee] whitespace-nowrap">
          Ready
        </span>
      )
    case PayrollTransactionStatus.PENDING:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(255,168,0,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#ffa800] whitespace-nowrap">
          Pending
        </span>
      )
    case PayrollTransactionStatus.COMPLETE:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(93,221,34,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5ddd22] whitespace-nowrap">
          Complete
        </span>
      )
    case PayrollTransactionStatus.REFUNDED:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(0,0,0,0.06)] px-2 py-[2px] text-[12px] leading-[22px] text-[#606067] whitespace-nowrap">
          Refunded
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(0,0,0,0.06)] px-2 py-[2px] text-[12px] leading-[22px] text-[#606067] whitespace-nowrap">
          {status}
        </span>
      )
  }
}

export function TransactionItemStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const colorClasses = (() => {
    if (normalized === 'claimed' || normalized === 'complete' || normalized === 'completed') {
      return 'bg-[rgba(93,221,34,0.12)] text-[#5ddd22]'
    }
    if (normalized === 'pending' || normalized === 'submitted') {
      return 'bg-[rgba(255,168,0,0.12)] text-[#ffa800]'
    }
    if (normalized === 'failed') {
      return 'bg-[rgba(217,43,43,0.12)] text-[#d92b2b]'
    }
    return 'bg-[rgba(94,133,238,0.12)] text-[#5e85ee]'
  })()

  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())

  return (
    <span className={`inline-flex items-center rounded-[8px] px-2 py-[2px] text-[12px] leading-[22px] whitespace-nowrap ${colorClasses}`}>
      {label}
    </span>
  )
}