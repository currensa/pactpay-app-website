import type { TransactionPlan } from '@/apis/transaction.api'
import { refundPrivacyDeposit } from '@/lib/gravarc/refundPrivacyDeposit'
import useChainAssetStore from '@/stores/chain-asset'
import { normalizeTransactionHash } from '@/utils/evm-transaction'
import { openWalletModal, selectWalletNetwork } from '@/providers/app-kit-provider'
import { useTranslation } from '@/utils/i18n'
import { buildExplorerTransactionUrl, formatTransactionHash } from '@/utils/transaction'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { getPublicClient } from '@wagmi/core'
import { useEffect, useState } from 'react'
import { createWalletClient, custom, type Hex } from 'viem'
import { useConfig } from 'wagmi'
import type { Transaction } from './types'

type RefundStatus = 'idle' | 'connecting' | 'refunding' | 'done' | 'error'

interface GravArcRefundDialogContentProps {
  transaction: Transaction | null
  transactionPlan: TransactionPlan | null
  onCancel: () => void
  onSuccess: (txHash: string) => void
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] leading-[22px] text-[#606067]">{label}</span>
      <span className="text-[14px] leading-[22px] text-[#1c1c26]">{children}</span>
    </div>
  )
}

export function GravArcRefundDialogContent({
  transaction,
  transactionPlan,
  onCancel,
  onSuccess,
}: GravArcRefundDialogContentProps) {
  const { getChain } = useChainAssetStore()
  const [status, setStatus] = useState<RefundStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [refundTxHash, setRefundTxHash] = useState('')
  const [password, setPassword] = useState('')
  const { t } = useTranslation()

  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const wagmiConfig = useConfig()

  const isBusy = status === 'connecting' || status === 'refunding'
  const explorerUrl = getChain(transactionPlan?.caipChainId ?? '')?.explorerUrls?.[0]
  const txUrl = buildExplorerTransactionUrl(explorerUrl, refundTxHash)

  async function handleRefund() {
    if (!transactionPlan) return
    setErrorMsg('')
    if (!password) {
      setErrorMsg(t('pages.transactions.gravArcRefundPasswordRequired'))
      return
    }
    if (!isConnected) {
      setStatus('connecting')
      try {
        await openWalletModal(Number(transactionPlan.caipChainId.split(':')[1]))
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Could not connect wallet')
        setStatus('error')
      }
      return
    }
    await executeRefund(address as Hex, walletProvider!)
  }

  // When status is 'connecting', watch for wallet connection and auto-proceed
  useEffect(() => {
    if (status !== 'connecting') return
    if (!isConnected || !address || !walletProvider) return
    executeRefund(address as Hex, walletProvider)
  }, [status, isConnected, address, walletProvider])

  async function executeRefund(account: Hex, provider: Provider) {
    if (!transactionPlan) return
    try {
      const chainEntry = getChain(transactionPlan.caipChainId)
      if (!chainEntry) throw new Error(`Chain ${transactionPlan.caipChainId} is not found in chain list.`)
      if (!chainEntry.vaultAddress) throw new Error(`GravArc contract is not configured for chain ${transactionPlan.caipChainId}.`)

      const numericChainId = parseInt(chainEntry.chainId, 10)
      await selectWalletNetwork(numericChainId)
      const currentChainIdHex = await provider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) throw new Error('Wallet did not switch to the refund network')
      const walletClient = createWalletClient({ account, transport: custom(provider) })
      const publicClient = getPublicClient(wagmiConfig, { chainId: numericChainId })
      if (!publicClient) throw new Error(`Public client for chain ${numericChainId} is not configured.`)

      setStatus('refunding')
      const { txHash } = await refundPrivacyDeposit({
        batchId: transactionPlan.id,
        caipChainId: transactionPlan.caipChainId,
        gravArcAddress: chainEntry.vaultAddress as Hex,
        account,
        walletClient,
        provider,
        chainIdNum: numericChainId,
        chainName: publicClient.chain?.name ?? 'Unknown',
        password,
        delegate: false,
        onStatus: () => {/* status text driven by stepLabels */},
      })

      setRefundTxHash(normalizeTransactionHash(txHash))
      setStatus('done')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  const stepLabels: Record<RefundStatus, string> = {
    idle: t('pages.transactions.connectWallet'),
    connecting: t('pages.transactions.connecting'),
    refunding: t('pages.transactions.refunding'),
    done: t('pages.transactions.done'),
    error: t('pages.transactions.retry'),
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {status === 'done' ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">{t('pages.transactions.gravArcRefund')}</span>
          </div>
          <div className="flex items-center gap-[10px] bg-[rgba(93,221,34,0.06)] rounded-[12px] px-4 py-3">
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[rgba(93,221,34,0.15)] shrink-0">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1 5.5L5 9.5L13 1.5" stroke="#5ddd22" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1c1c26] leading-[22px]">{t('pages.transactions.refundSubmitted')}</p>
              <p className="text-[12px] text-[#606067] leading-[20px]">{t('pages.transactions.gravArcRefundSubmittedDescription')}</p>
            </div>
          </div>
          {transaction && (
            <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[18px]">
              <InfoRow label={t('pages.transactions.transaction')}>{transaction.name}</InfoRow>
              <InfoRow label={t('pages.transactions.network')}>{transaction.network}</InfoRow>
              <InfoRow label={t('pages.transactions.totalAmount')}>{transaction.totalAmount} {transaction.currency}</InfoRow>
              {refundTxHash && (
                <div className="flex flex-col gap-[4px]">
                  <span className="text-[13px] text-[#606067] leading-[22px]">{t('pages.transactions.txHash')}</span>
                  {txUrl ? (
                    <a href={txUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#5e85ee] leading-[20px] font-mono break-all hover:underline">
                      {formatTransactionHash(refundTxHash, true)}
                    </a>
                  ) : (
                    <span className="text-[12px] text-[#1c1c26] leading-[20px] font-mono break-all">{refundTxHash}</span>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-end">
            <button onClick={() => onSuccess(refundTxHash)} className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity">
              {t('pages.transactions.done')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">{t('pages.transactions.gravArcRefund')}</span>
          </div>
          <p className="text-[13px] text-[#606067] leading-[22px]">{t('pages.transactions.gravArcRefundDescription')}</p>

          <div className="flex flex-col gap-[6px]">
              <label className="flex select-none items-center gap-[8px] opacity-50">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="accent-[#5e85ee]"
                />
                <span className="text-[13px] text-[#1c1c26] leading-[22px]">
                  {t('pages.transactions.gravArcRefundDelegate')} ({t('common.comingSoon')})
                </span>
              </label>
              <p className="text-[12px] text-[#606067] leading-[20px]">
                {t('pages.transactions.gravArcRefundSelfRelayHelp')}
              </p>
          </div>

          <div className="bg-[rgba(237,168,32,0.06)] rounded-[12px] px-4 py-3 text-[12px] text-[#9a6b00] leading-[20px]">
            {t('pages.transactions.gravArcRefundWarning')}
          </div>

          {transaction && (
            <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[14px]">
              <InfoRow label={t('pages.transactions.transaction')}>{transaction.name}</InfoRow>
              <InfoRow label={t('pages.transactions.network')}>{transaction.network}</InfoRow>
              <InfoRow label={t('pages.transactions.totalAmount')}>{transaction.totalAmount} {transaction.currency}</InfoRow>
            </div>
          )}

          <div className="flex flex-col gap-[6px]">
            <span className="text-[13px] text-[#606067] leading-[22px]">{t('pages.transactions.gravArcRefundPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isBusy}
              placeholder={t('pages.transactions.gravArcRefundPasswordPlaceholder')}
              className="h-[42px] px-3 rounded-[10px] border border-[#e6e6ea] bg-white text-[14px] text-[#1c1c26] outline-none focus:border-[#5e85ee]"
            />
          </div>

          {errorMsg && (
            <div className="bg-[rgba(237,90,90,0.06)] rounded-[10px] px-3 py-2 text-[12px] text-[#ed5a5a] leading-[20px] break-all">{errorMsg}</div>
          )}

          <div className="flex items-center justify-end gap-[10px]">
            <button onClick={onCancel} disabled={isBusy} className="h-[38px] px-[16px] rounded-[12px] bg-[#f5f5f5] text-[13px] text-[#606067] hover:bg-[#eeeef2] transition-opacity">
              {t('common.cancel')}
            </button>
            <button onClick={handleRefund} disabled={isBusy} className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-50">
              {isBusy ? stepLabels[status] : t('pages.transactions.gravArcRefund')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
