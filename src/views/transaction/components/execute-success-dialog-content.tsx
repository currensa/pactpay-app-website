import useChainAssetStore from '@/stores/chain-asset'
import { useTranslation } from '@/utils/i18n'
import { buildExplorerTransactionUrl, formatTransactionHash } from '@/utils/transaction'
import { Transaction } from './types'

interface ExecuteSuccessDialogContentProps {
  depositTxHash: string
  executingTransaction: Transaction | null
  caipChainId?: string | null
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
  caipChainId,
  onClose,
}: ExecuteSuccessDialogContentProps) {
  const { t } = useTranslation()
  const { getChain } = useChainAssetStore()
  const explorerUrl = getChain(caipChainId ?? '')?.explorerUrls?.[0]
  const txUrl = buildExplorerTransactionUrl(explorerUrl, depositTxHash)
  const isAiTransaction = executingTransaction?.type === 'token_usage_plan'
  return (
    <div className="flex flex-col gap-[20px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">{t('pages.transactions.transactionConfirmed')}</span>
      </div>

      {/* Success indicator */}
      <div className="flex items-center gap-[10px] bg-[rgba(93,221,34,0.06)] rounded-[12px] px-4 py-3">
        <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[rgba(93,221,34,0.15)] shrink-0">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path d="M1 5.5L5 9.5L13 1.5" stroke="#5ddd22" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#1c1c26] leading-[22px]">
            {isAiTransaction ? t('pages.transactions.paymentConfirmed') : t('pages.transactions.depositConfirmed')}
          </p>
          <p className="text-[12px] text-[#606067] leading-[20px]">
            {isAiTransaction
              ? t('pages.transactions.usagePlanFundedAfterConfirm')
              : t('pages.transactions.membersCanClaimAtClaimTime')}
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[18px]">
        {executingTransaction && (
          <>
            <InfoRow label={t('pages.transactions.transactionName')}>{executingTransaction.name}</InfoRow>
            <InfoRow label={isAiTransaction ? t('pages.transactions.paymentTime') : t('pages.transactions.payDay')}>{executingTransaction.executionDate}</InfoRow>
            <InfoRow label={t('pages.transactions.network')}>{executingTransaction.network}</InfoRow>
            <InfoRow label={t('pages.transactions.totalAmount')}>
              {executingTransaction.totalAmount} {executingTransaction.currency}
            </InfoRow>
            <InfoRow label={isAiTransaction ? t('pages.transactions.payees') : t('pages.transactions.totalMembers')}>
              {isAiTransaction ? t('pages.transactions.apiService') : executingTransaction.members}
            </InfoRow>
          </>
        )}
        {depositTxHash && (
          <div className="flex flex-col gap-[4px]">
            <span className="text-[13px] text-[#606067] leading-[22px]">{t('pages.transactions.txHash')}</span>
            {txUrl ? (
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#5e85ee] leading-[20px] font-mono break-all hover:underline"
              >
                {formatTransactionHash(depositTxHash, true)}
              </a>
            ) : (
              <span className="text-[12px] text-[#1c1c26] leading-[20px] font-mono break-all">{depositTxHash}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end">
        <button
          onClick={onClose}
          className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity"
        >
          {t('pages.transactions.done')}
        </button>
      </div>
    </div>
  )
}
