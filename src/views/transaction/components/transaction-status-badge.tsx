import { PayrollItemStatus, PayrollTransactionStatus } from '@/enums/transaction'


export function TransactionStatusBadge({ status }: { status: PayrollTransactionStatus }) {
  switch (status) {
    case PayrollTransactionStatus.READY:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(94,133,238,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5e85ee] whitespace-nowrap">
          Ready
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


export function TransactionItemStatusBadge({ status }: { status: PayrollItemStatus }) {
  switch (status) {
    case PayrollItemStatus.AWAITING_PAYMENT:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(0,0,0,0.06)] px-2 py-[2px] text-[12px] leading-[22px] text-[#606067] whitespace-nowrap">
          Awaiting Payment
        </span>
      )
    case PayrollItemStatus.SCHEDULED:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(94,133,238,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5e85ee] whitespace-nowrap">
          Scheduled
        </span>
      )
    case PayrollItemStatus.CLAIMABLE:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(93,221,34,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5ddd22] whitespace-nowrap">
          Claimable
        </span>
      )
    case PayrollItemStatus.CLAIMED:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(45,160,45,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#2da02d] whitespace-nowrap">
          Claimed
        </span>
      )
    case PayrollItemStatus.REFUNDED:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(217,43,43,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#d92b2b] whitespace-nowrap">
          Refunded
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(217,43,43,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#606067] whitespace-nowrap">
          {status}
        </span>
      )
  }
}