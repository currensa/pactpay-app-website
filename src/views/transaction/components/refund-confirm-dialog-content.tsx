import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { vaultAbi } from '@/lib/vault-abi'
import useChainAssetStore from '@/stores/chain-asset'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useEffect, useState } from 'react'
import { createPublicClient, createWalletClient, custom, type Hex } from 'viem'
import type { Transaction } from './types'

type RefundStatus = 'idle' | 'connecting' | 'refunding' | 'done' | 'error'

const STEP_LABELS: Record<RefundStatus, string> = {
  idle: 'Connect Wallet',
  connecting: 'Connecting…',
  refunding: 'Refunding…',
  done: 'Done',
  error: 'Retry',
}

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

  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')

  const isBusy = status === 'connecting' || status === 'refunding'

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
      const viemChain = {
        id: numericChainId,
        name: chainEntry.name,
        nativeCurrency: {
          name: chainEntry.name,
          symbol: chainEntry.name,
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [] },
          public: { http: [] },
        },
      } as const

      const walletClient = createWalletClient({
        account,
        chain: viemChain as any,
        transport: custom(provider),
      })
      const publicClient = createPublicClient({
        chain: viemChain as any,
        transport: custom(provider),
      })

      setStatus('refunding')
      const refundTx = await walletClient.writeContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'refund',
        args: [merkleRoot],
        chain: viemChain as any,
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: refundTx })
      if (receipt.status !== 'success') throw new Error('refund transaction reverted.')
      await apis.transaction.confirmRefund(transactionPlan.id, refundTx)

      setStatus('done')
      onSuccess(refundTx)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Header */}
      <div>
        <p className="text-[16px] font-bold leading-[26px] text-[#1c1c26]">Refund Unclaimed Funds</p>
        <p className="mt-[4px] text-[13px] leading-[20px] text-[#606067]">
          Reclaim tokens from payroll items that have not been claimed by members.
        </p>
      </div>

      {/* Summary card */}
      {transaction && transactionPlan && (
        <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[14px]">
          <InfoRow label="Transaction">{transaction.name}</InfoRow>
          <InfoRow label="Network">{transaction.network}</InfoRow>
          <InfoRow label="Total Amount">{transaction.totalAmount} {transaction.currency}</InfoRow>
          <InfoRow label="Total Members">{transaction.members}</InfoRow>
          <div className="border-t border-[rgba(0,0,0,0.08)] pt-[14px]">
            <InfoRow label="Unclaimed Members">
              <span className="text-[#ffa800] font-medium">{unclaimedCount}</span>
            </InfoRow>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="rounded-[12px] border border-[rgba(255,168,0,0.3)] bg-[rgba(255,168,0,0.06)] px-4 py-3 text-[13px] leading-[20px] text-[#c47d00]">
        Only unclaimed amounts will be refunded. Members who have already claimed their funds are not affected.
        This action requires a wallet transaction and cannot be undone.
      </div>

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="rounded-[12px] border border-[rgba(217,43,43,0.2)] bg-[rgba(217,43,43,0.04)] px-4 py-3 text-[13px] text-[#d92b2b]">
          {errorMsg}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-[10px]">
        <button
          onClick={onCancel}
          disabled={isBusy}
          className="h-[38px] px-[16px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleRefund}
          disabled={isBusy || status === 'done'}
          className="h-[38px] px-[16px] rounded-[12px] bg-[#ffa800] text-[13px] text-white hover:bg-[#ffa800]/90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {STEP_LABELS[status]}
        </button>
      </div>
    </div>
  )
}
