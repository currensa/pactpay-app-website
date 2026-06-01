import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { vaultAbi } from '@/lib/vault-abi'
import useChainAssetStore from '@/stores/chain-asset'
import { normalizeTransactionHash } from '@/utils/evm-transaction'
import { useTranslation } from '@/utils/i18n'
import { buildExplorerTransactionUrl, formatTransactionHash } from '@/utils/transaction'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { getPublicClient } from '@wagmi/core'
import { useEffect, useState } from 'react'
import { createWalletClient, custom, type Hex } from 'viem'
import { useConfig } from 'wagmi'
import type { Transaction } from './types'

type RefundStatus = 'idle' | 'connecting' | 'refunding' | 'done' | 'error'

interface RefundConfirmDialogContentProps {
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

export function RefundConfirmDialogContent({
  transaction,
  transactionPlan,
  onCancel,
  onSuccess,
}: RefundConfirmDialogContentProps) {
  const { getChain } = useChainAssetStore()
  const [status, setStatus] = useState<RefundStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [refundTxHash, setRefundTxHash] = useState('')
  const { t } = useTranslation()
  const stepLabels: Record<RefundStatus, string> = {
    idle: t('pages.transactions.connectWallet'),
    connecting: t('pages.transactions.connecting'),
    refunding: t('pages.transactions.refunding'),
    done: t('pages.transactions.done'),
    error: t('pages.transactions.retry'),
  }

  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const wagmiConfig = useConfig()

  const isBusy = status === 'connecting' || status === 'refunding'
  const explorerUrl = getChain(transactionPlan?.caipChainId ?? '')?.explorerUrls?.[0]
  const txUrl = buildExplorerTransactionUrl(explorerUrl, refundTxHash)

  const unclaimedCount = transactionPlan
    ? transactionPlan.items.filter(item => item.status !== 'claimed').length
    : 0

  // When status is 'connecting', watch for wallet connection and auto-proceed
  useEffect(() => {
    if (status !== 'connecting') return
    if (!isConnected || !address || !walletProvider) return
    executeRefund(address as Hex, walletProvider)
  }, [status, isConnected, address, walletProvider])

  async function handleRefund() {
    if (!transactionPlan?.merkleRoot) return
    setErrorMsg('')

    if (!isConnected) {
      setStatus('connecting')
      open({ view: 'Connect', namespace: 'eip155' })
      return
    }

    await executeRefund(address as Hex, walletProvider!)
  }

  async function executeRefund(account: Hex, provider: Provider) {
    if (!transactionPlan?.merkleRoot) return

    try {
      const chainEntry = getChain(transactionPlan.caipChainId)
      if (!chainEntry) throw new Error(`Chain ${transactionPlan.caipChainId} is not found in chain list.`)
      if (!chainEntry.vaultAddress) throw new Error(`Vault contract is not configured for chain ${transactionPlan.caipChainId}.`)

      const numericChainId = parseInt(chainEntry.chainId, 10)
      const vaultAddress = chainEntry.vaultAddress as Hex
      const merkleRoot = transactionPlan.merkleRoot as Hex
      const currentChainIdHex = await provider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${numericChainId.toString(16)}` }],
        })
      }
      const walletClient = createWalletClient({
        account,
        transport: custom(provider),
      })
      const publicClient = getPublicClient(wagmiConfig, { chainId: numericChainId })
      if (!publicClient) throw new Error(`Public client for chain ${numericChainId} is not configured.`)
      const configuredChain = publicClient.chain
      if (!configuredChain) throw new Error(`Chain metadata for chain ${numericChainId} is not configured.`)

      setStatus('refunding')
      const refundTx = normalizeTransactionHash(await walletClient.writeContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'refund',
        args: [merkleRoot],
        chain: configuredChain,
      }))
      const receipt = await publicClient.waitForTransactionReceipt({ hash: refundTx })
      if (receipt.status !== 'success') throw new Error('refund transaction reverted.')
      await apis.transaction.confirmRefund(transactionPlan.id, refundTx)

      setRefundTxHash(refundTx)
      setStatus('done')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {status === 'done' ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">{t('pages.transactionDetail.refundUnclaimedFunds')}</span>
          </div>

          <div className="flex items-center gap-[10px] bg-[rgba(93,221,34,0.06)] rounded-[12px] px-4 py-3">
            <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[rgba(93,221,34,0.15)] shrink-0">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1 5.5L5 9.5L13 1.5" stroke="#5ddd22" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1c1c26] leading-[22px]">{t('pages.transactions.refundSubmitted')}</p>
              <p className="text-[12px] text-[#606067] leading-[20px]">{t('pages.transactions.refundSubmittedDescription')}</p>
            </div>
          </div>

          {transaction && (
            <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[18px]">
              <InfoRow label={t('pages.transactions.transaction')}>{transaction.name}</InfoRow>
              <InfoRow label={t('pages.transactions.network')}>{transaction.network}</InfoRow>
              <InfoRow label={t('pages.transactions.totalAmount')}>{transaction.totalAmount} {transaction.currency}</InfoRow>
              <InfoRow label={t('pages.transactions.totalMembers')}>{transaction.members}</InfoRow>
              {refundTxHash && (
                <div className="flex flex-col gap-[4px]">
                  <span className="text-[13px] text-[#606067] leading-[22px]">{t('pages.transactions.txHash')}</span>
                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[#5e85ee] leading-[20px] font-mono break-all hover:underline"
                    >
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
            <button
              onClick={() => onSuccess(refundTxHash)}
              className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity"
            >
              {t('pages.transactions.done')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-[16px] font-bold leading-[26px] text-[#1c1c26]">{t('pages.transactionDetail.refundUnclaimedFunds')}</p>
            <p className="mt-[4px] text-[13px] leading-[20px] text-[#606067]">
              {t('pages.transactions.refundDescription')}
            </p>
          </div>

          {transaction && transactionPlan && (
            <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[14px]">
              <InfoRow label={t('pages.transactions.transaction')}>{transaction.name}</InfoRow>
              <InfoRow label={t('pages.transactions.network')}>{transaction.network}</InfoRow>
              <InfoRow label={t('pages.transactions.totalAmount')}>{transaction.totalAmount} {transaction.currency}</InfoRow>
              <InfoRow label={t('pages.transactions.totalMembers')}>{transaction.members}</InfoRow>
              <div className="border-t border-[rgba(0,0,0,0.08)] pt-[14px]">
                <InfoRow label={t('pages.transactions.unclaimedMembers')}>
                  <span className="text-[#ffa800] font-medium">{unclaimedCount}</span>
                </InfoRow>
              </div>
            </div>
          )}

          <div className="rounded-[12px] border border-[rgba(255,168,0,0.3)] bg-[rgba(255,168,0,0.06)] px-4 py-3 text-[13px] leading-[20px] text-[#c47d00]">
            {t('pages.transactions.refundWarning')}
          </div>

          {status === 'error' && errorMsg && (
            <div className="rounded-[12px] border border-[rgba(217,43,43,0.2)] bg-[rgba(217,43,43,0.04)] px-4 py-3 text-[13px] text-[#d92b2b]">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-[10px]">
            <button
              onClick={onCancel}
              disabled={isBusy}
              className="h-[38px] px-[16px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleRefund}
              disabled={isBusy || status === 'done'}
              className="h-[38px] px-[16px] rounded-[12px] bg-[#ffa800] text-[13px] text-white hover:bg-[#ffa800]/90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {stepLabels[status]}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
