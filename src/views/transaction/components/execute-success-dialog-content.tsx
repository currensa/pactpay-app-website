import { X } from 'lucide-react'
import { Transaction } from './types'

interface ExecuteSuccessDialogContentProps {
  depositTxHash: string
  executingTransaction: Transaction | null
  onClose: () => void
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] leading-[22px] text-[#606067]">{label}</span>
      <span className="text-[14px] leading-[22px] text-[#1c1c26]">{children}</span>
    </div>
  )
}

export function ExecuteSuccessDialogContent({
  depositTxHash,
  executingTransaction,
  onClose,
}: ExecuteSuccessDialogContentProps) {
  return (
    <div className="flex flex-col gap-[20px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">Transaction Confirmed</span>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-[28px] h-[28px] rounded-full hover:bg-[#f5f5f5] transition-colors"
        >
          <X size={16} className="text-[#606067]" />
        </button>
      </div>

      {/* Success indicator */}
      <div className="flex items-center gap-[10px] bg-[rgba(93,221,34,0.06)] rounded-[12px] px-4 py-3">
        <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[rgba(93,221,34,0.15)] shrink-0">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path d="M1 5.5L5 9.5L13 1.5" stroke="#5ddd22" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#1c1c26] leading-[22px]">Deposit Confirmed</p>
          <p className="text-[12px] text-[#606067] leading-[20px]">Employees can now claim their payments.</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[18px]">
        {executingTransaction && (
          <>
            <InfoRow label="Transaction Name">{executingTransaction.name}</InfoRow>
            <InfoRow label="Pay Day">{executingTransaction.executionDate}</InfoRow>
            <InfoRow label="Network">{executingTransaction.network}</InfoRow>
            <InfoRow label="Total Amount">
              {executingTransaction.totalAmount} {executingTransaction.currency}
            </InfoRow>
            <InfoRow label="Total Members">{executingTransaction.members}</InfoRow>
          </>
        )}
        {depositTxHash && (
          <div className="flex flex-col gap-[4px]">
            <span className="text-[13px] text-[#606067] leading-[22px]">Tx Hash</span>
            <span className="text-[12px] text-[#1c1c26] leading-[20px] font-mono break-all">{depositTxHash}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end">
        <button
          onClick={onClose}
          className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity"
        >
          Done
        </button>
      </div>
    </div>
  )
}
