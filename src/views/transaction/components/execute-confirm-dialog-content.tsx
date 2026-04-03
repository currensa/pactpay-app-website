import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { PayrollTransactionStatus } from '@/enums/transaction'
import { erc20Abi, vaultAbi } from '@/lib/vault-abi'
import useChainAssetStore from '@/stores/chain-asset'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useEffect, useState } from 'react'
import { createPublicClient, createWalletClient, custom, http, type Hex } from 'viem'
import type { Transaction } from './types'

const ETH_SENTINEL = '0x0000000000000000000000000000000000000000' as Hex

type DepositStatus = 'idle' | 'connecting' | 'authorizing' | 'checking' | 'approving' | 'depositing' | 'done' | 'error'

const STEP_LABELS: Record<DepositStatus, string> = {
  idle: 'Connect Wallet',
  connecting: 'Connecting…',
  authorizing: 'Authorizing…',
  checking: 'Checking allowance…',
  approving: 'Approving…',
  depositing: 'Depositing…',
  done: 'Done',
  error: 'Retry',
}

interface ExecuteConfirmDialogContentProps {
  executingTransaction: Transaction | null
  transactionPlan: TransactionPlan | null
  onCancel: () => void
  onSuccess: (txHash: string) => void
}

function StatusBadge({ status }: { status: string }) {
  if (status === PayrollTransactionStatus.COMPLETE) {
    return (
      <span className="inline-flex items-center rounded-[8px] bg-[rgba(93,221,34,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5ddd22] whitespace-nowrap">
        Complete
      </span>
    )
  }
  if (status === PayrollTransactionStatus.PENDING) {
    return (
      <span className="inline-flex items-center rounded-[8px] bg-[rgba(255,168,0,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#ffa800] whitespace-nowrap">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-[8px] bg-[rgba(94,133,238,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5e85ee] whitespace-nowrap">
      Ready
    </span>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] leading-[22px] text-[#606067]">{label}</span>
      <span className="text-[14px] leading-[22px] text-[#1c1c26]">{children}</span>
    </div>
  )
}

export function ExecuteConfirmDialogContent({
  executingTransaction,
  transactionPlan,
  onSuccess,
}: ExecuteConfirmDialogContentProps) {
  const { getChainAssetByToken, getChain } = useChainAssetStore()
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')

  const isBusy = ['connecting', 'authorizing', 'checking', 'approving', 'depositing'].includes(status)

  // When status is 'connecting', watch for wallet connection and auto-proceed
  useEffect(() => {
    if (status !== 'connecting') return
    if (!isConnected || !address || !walletProvider) return
    executeDeposit(address as Hex, walletProvider)
  }, [status, isConnected, address, walletProvider])

  async function handleDeposit() {
    if (!transactionPlan) return
    setErrorMsg('')

    if (!isConnected) {
      setStatus('connecting')
      open({ view: 'Connect', namespace: 'eip155' })
      return
    }

    await executeDeposit(address as Hex, walletProvider!)
  }

  async function executeDeposit(account: Hex, provider: Provider) {
    if (!transactionPlan) return

    try {
      const chainEntry = getChain(transactionPlan.caipChainId)
      if (!chainEntry) throw new Error(`Chain ${transactionPlan.caipChainId} is not found in chain list.`)
      if (!chainEntry.vaultAddress) {
        throw new Error(`Vault contract is not configured for chain ${transactionPlan.caipChainId}.`)
      }

      const numericChainId = parseInt(chainEntry.chainId, 10)
      const vaultAddress = chainEntry.vaultAddress as Hex
      const tokenAddress = (transactionPlan.tokenAddress || ETH_SENTINEL) as Hex
      const merkleRoot = transactionPlan.merkleRoot as Hex
      const rpcUrl = (chainEntry.rpcUrls as string[])[0]

      const currentChainIdHex = await provider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${numericChainId.toString(16)}` }],
        })
      }

      const chainAssetEntry = getChainAssetByToken(transactionPlan.caipChainId, tokenAddress)
      const isNative = chainAssetEntry?.isNative ?? false

      if (!transactionPlan.totalAmount || BigInt(transactionPlan.totalAmount) <= 0n) {
        throw new Error('Total payroll amount is zero.')
      }
      const totalAmount = BigInt(transactionPlan.totalAmount)

      const viemChain = {
        id: numericChainId,
        name: chainEntry.name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: chainEntry.rpcUrls as string[] } },
      } as const

      const walletClient = createWalletClient({
        account,
        chain: viemChain as any,
        transport: custom(provider),
      })
      const publicClient = createPublicClient({
        chain: viemChain as any,
        transport: http(rpcUrl),
      })

      if (!isNative) {
        setStatus('checking')
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account, vaultAddress],
        })

        if (allowance < totalAmount) {
          setStatus('approving')
          const approveTx = await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [vaultAddress, totalAmount],
          })
          await publicClient.waitForTransactionReceipt({ hash: approveTx })
        }
      }

      setStatus('authorizing')
      const { authSignature, claimTime } = await apis.transaction.getDepositAuth(transactionPlan.id)

      setStatus('depositing')
      const depositTx = await walletClient.writeContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'depositForPayroll',
        args: [merkleRoot, tokenAddress, totalAmount, BigInt(claimTime), authSignature as Hex],
        ...(isNative ? { value: totalAmount } : {}),
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status !== 'success') throw new Error('depositForPayroll transaction reverted.')

      setStatus('done')
      onSuccess(depositTx)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">Transaction Summary</span>
      </div>

      {/* Summary card */}
      {executingTransaction && (
        <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[18px]">
          <InfoRow label="Transaction Name">{executingTransaction.name}</InfoRow>
          <InfoRow label="Pay Day">{executingTransaction.executionDate}</InfoRow>
          <InfoRow label="Network">{executingTransaction.network}</InfoRow>
          <div className="flex items-center justify-between">
            <span className="text-[14px] leading-[22px] text-[#606067]">Status</span>
            <StatusBadge status={executingTransaction.status} />
          </div>
          <InfoRow label="Total Amount">
            {executingTransaction.totalAmount} {executingTransaction.currency}
          </InfoRow>
          <InfoRow label="Total Members">{executingTransaction.members}</InfoRow>
        </div>
      )}

      {/* Progress steps */}
      {isBusy && (
        <div className="flex items-center gap-[8px] text-[12px] text-[#606067]">
          {(['authorizing', 'checking', 'approving', 'depositing'] as DepositStatus[]).map((s, i) => {
            const stepIdx = ['authorizing', 'checking', 'approving', 'depositing'].indexOf(status)
            const done = stepIdx > i
            const active = status === s
            return (
              <div key={s} className="flex items-center gap-[4px]">
                {i > 0 && <span className="text-[rgba(0,0,0,0.2)]">→</span>}
                <span className={active ? 'text-[#5e85ee] font-medium' : done ? 'text-[#5ddd22]' : 'text-[#8d8d93]'}>
                  {['Auth', 'Allowance', 'Approve', 'Deposit'][i]}{done ? ' ✓' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="rounded-[12px] border border-[rgba(217,43,43,0.2)] bg-[rgba(217,43,43,0.04)] px-4 py-3 text-[13px] text-[#d92b2b]">
          {errorMsg}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleDeposit}
          disabled={isBusy || status === 'done'}
          className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {STEP_LABELS[status]}
        </button>
      </div>
    </div>
  )
}
