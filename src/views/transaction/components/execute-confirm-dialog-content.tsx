import type { TransactionPlan } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { erc20Abi, vaultAbi } from '@/lib/vault-abi'
import useChainAssetStore from '@/stores/chain-asset'
import { useState } from 'react'
import { createPublicClient, createWalletClient, custom, http, parseUnits, type Hex } from 'viem'
import type { Transaction } from './types'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any
  }
}

const ETH_SENTINEL = '0x0000000000000000000000000000000000000000' as Hex

type DepositStatus = 'idle' | 'connecting' | 'checking' | 'approving' | 'depositing' | 'done' | 'error'

const STEP_LABELS: Record<DepositStatus, string> = {
  idle: 'Connect & Deposit',
  connecting: 'Connecting wallet…',
  checking: 'Checking allowance…',
  approving: 'Waiting for approve…',
  depositing: 'Waiting for deposit…',
  done: 'Done',
  error: 'Retry',
}

interface ExecuteConfirmDialogContentProps {
  executingTransaction: Transaction | null
  transactionPlan: TransactionPlan | null
  onCancel: () => void
  /** Called with the deposit txHash after the on-chain tx is confirmed. */
  onSuccess: (txHash: string) => void
}

export function ExecuteConfirmDialogContent({
  executingTransaction,
  transactionPlan,
  onCancel,
  onSuccess,
}: ExecuteConfirmDialogContentProps) {
  const { chainAssets, getChainAssetByToken, getChain } = useChainAssetStore()
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const isBusy = ['connecting', 'checking', 'approving', 'depositing'].includes(status)
  const progressSteps: DepositStatus[] = ['checking', 'approving', 'depositing']

  async function handleDeposit() {
    if (!transactionPlan) return
    setErrorMsg('')
    setStatus('connecting')

    try {
      // ── 1. Connect wallet ─────────────────────────────────────────────────
      if (!window.ethereum) throw new Error('MetaMask not detected. Please install it first.')
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const account = accounts[0] as Hex

      // ── 2. Resolve chain info ─────────────────────────────────────────────
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

      // ── 3. Switch network if needed ───────────────────────────────────────
      const currentChainIdHex: string = await window.ethereum.request({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${numericChainId.toString(16)}` }],
        })
      }

      // ── 4. Resolve token decimals & isNative ──────────────────────────────
      const chainAssetEntry = getChainAssetByToken(transactionPlan.caipChainId, tokenAddress)
      const decimals = chainAssetEntry?.decimals ?? 18
      const isNative = chainAssetEntry?.isNative ?? false

      // ── 5. Compute total amount (sum of items, convert to wei) ────────────
      const totalHuman = transactionPlan.items.reduce(
        (acc, item) => acc + parseFloat(item.amount || '0'),
        0
      )
      if (totalHuman <= 0) throw new Error('Total payroll amount is zero.')
      const totalAmount = parseUnits(totalHuman.toFixed(decimals), decimals)

      // Build a minimal viem chain object from store data
      const viemChain = {
        id: numericChainId,
        name: chainEntry.name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: chainEntry.rpcUrls as string[] } },
      } as const

      const walletClient = createWalletClient({
        account,
        chain: viemChain as any,
        transport: custom(window.ethereum),
      })
      const publicClient = createPublicClient({
        chain: viemChain as any,
        transport: http(rpcUrl),
      })

      // ── 6. Approve (ERC-20 only) ──────────────────────────────────────────
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

      // ── 7. depositForPayroll ──────────────────────────────────────────────
      setStatus('depositing')
      const depositTx = await walletClient.writeContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'depositForPayroll',
        args: [merkleRoot, tokenAddress, totalAmount],
        ...(isNative ? { value: totalAmount } : {}),
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status !== 'success') throw new Error('depositForPayroll transaction reverted.')

      setStatus('done')
      onSuccess(depositTx)
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  // Determine step state for progress indicator
  const stepIndex = (s: DepositStatus) => progressSteps.indexOf(s)
  const currentIndex = stepIndex(status as DepositStatus)

  return (
    <div className="flex flex-col space-y-4">
      <DialogHeader>
        <DialogTitle>Confirm Deposit</DialogTitle>
        <DialogDescription>
          Connect your HR wallet to execute approve + depositForPayroll on-chain.
        </DialogDescription>
      </DialogHeader>

      {executingTransaction && (
        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Batch Name:</span>
              <span className="text-sm font-medium">{executingTransaction.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Members:</span>
              <span className="text-sm font-medium">{executingTransaction.members}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total Amount:</span>
              <span className="text-sm font-medium">
                {executingTransaction.totalAmount} {executingTransaction.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Network:</span>
              <span className="text-sm font-medium">{executingTransaction.network}</span>
            </div>
          </div>

          {/* Progress steps */}
          {status !== 'idle' && status !== 'error' && (
            <div className="flex items-center gap-2 text-xs">
              {progressSteps.map((s, i) => {
                const si = stepIndex(s)
                const done = status === 'done' || currentIndex > si
                const active = status === s
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-1 ${active ? 'text-blue-500' : done ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}
                  >
                    {i > 0 && <span className="text-muted-foreground">→</span>}
                    <span>{['allowance', 'approve', 'deposit'][i]}</span>
                    {done && <span>✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Error message */}
          {status === 'error' && errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isBusy}>
          Cancel
        </Button>
        <Button onClick={handleDeposit} disabled={isBusy || status === 'done'}>
          {isBusy ? STEP_LABELS[status] : STEP_LABELS[status]}
        </Button>
      </div>
    </div>
  )
}
