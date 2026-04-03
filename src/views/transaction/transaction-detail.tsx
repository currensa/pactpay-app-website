import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useHeaderStore from '@/stores/header'
import { formatUnits } from 'ethers'
import { CreditCard, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  RefundConfirmDialogContent,
} from './components'
import type { Transaction } from './components/types'

import { getHighestRole, Permission, useHasPermission } from '@/utils/permissions'

const ITEMS_PER_PAGE = 20

function buildExplorerTransactionUrl(explorerUrl: string | null | undefined, txHash: string | null | undefined) {
  const explorerBaseUrl = explorerUrl?.trim()
  if (!explorerBaseUrl || !txHash) return null
  return `${explorerBaseUrl.replace(/\/+$/, '')}/tx/${encodeURIComponent(txHash)}`
}

function formatTransactionHash(txHash: string | null | undefined) {
  if (!txHash) return '-'
  if (txHash.length <= 12) return txHash
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
}

function TransactionItemStatusBadge({ status }: { status: string }) {
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
  if (status === PayrollTransactionStatus.REFUNDED) {
    return (
      <span className="inline-flex items-center rounded-[8px] bg-[rgba(0,0,0,0.06)] px-2 py-[2px] text-[12px] leading-[22px] text-[#606067] whitespace-nowrap">
        Refunded
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-[8px] bg-[rgba(94,133,238,0.12)] px-2 py-[2px] text-[12px] leading-[22px] text-[#5e85ee] whitespace-nowrap">
      Ready
    </span>
  )
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { getTokenSymbol, getTokenDecimals, fetchChainAssets, fetchChains, getChain } = useChainAssetStore()
  const { setHeader, clearHeader } = useHeaderStore()
  const hasPermission = useHasPermission()

  const [plan, setPlan] = useState<TransactionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Execute dialog
  const [executeOpen, setExecuteOpen] = useState(false)
  const [executeSuccessOpen, setExecuteSuccessOpen] = useState(false)
  const [lastTxHash, setLastTxHash] = useState('')

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Refund dialog
  const [refundOpen, setRefundOpen] = useState(false)

  // Re-action dialog
  const [reactionConfirmOpen, setReactionConfirmOpen] = useState(false)

  useEffect(() => {
    Promise.all([fetchChainAssets(), fetchChains()]).then(() => {
      if (!id) return
      apis.transaction.getTransactionPlanDetail(id)
        .then(data => {
          setPlan(data)
          setHeader({
            backUrl: '/orgs/transaction',
            breadcrumb: [
              { label: 'Transactions', href: '/orgs/transaction' },
              { label: data.transactionName },
            ],
          })
        })
        .catch((err: any) => {
          toast({ description: `Failed to load transaction: ${err.message}`, variant: 'destructive' })
        })
        .finally(() => setLoading(false))
    })
    return () => clearHeader()
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-[#8d8d93] text-[13px]">Loading...</div>
  }
  if (!plan) {
    return <div className="flex items-center justify-center h-40 text-[#8d8d93] text-[13px]">Transaction not found.</div>
  }

  const tokenSymbol = getTokenSymbol(plan.caipChainId, plan.tokenAddress ?? '') ?? plan.tokenAddress?.slice(0, 6) ?? ''
  const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress ?? '')
  const chain = getChain(plan.caipChainId)
  const networkName = chain?.name ?? plan.caipChainId
  const explorerBaseUrl = chain?.explorerUrls?.[0]
  const txExplorerUrl = buildExplorerTransactionUrl(explorerBaseUrl, plan.depositTxHash)

  const payDay = plan.payPeriod
    ? new Date(plan.payPeriod).toLocaleDateString('en-CA').replace(/-/g, '/')
    : '-'

  const payPeriodDate = new Date(plan.payPeriod)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  payPeriodDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((payPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isDueToday = diffDays === 0 && plan.transactionStatus !== PayrollTransactionStatus.COMPLETE
  const isComplete = plan.transactionStatus === PayrollTransactionStatus.COMPLETE
  const isRefunded = plan.transactionStatus === PayrollTransactionStatus.REFUNDED
  const executionDateLabel = isComplete
    ? <span className="text-[#1c1c26]">{Math.abs(diffDays) === 0 ? 'Today' : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`}</span>
    : isDueToday
      ? <span className="text-[#d92b2b]">Due Today</span>
      : <span className="text-[#1c1c26]">{payDay}</span>

  const totalAmountFormatted = (() => {
    try { return parseFloat(formatUnits(BigInt(plan.totalAmount ?? '0'), decimals)).toLocaleString() }
    catch { return plan.totalAmount ?? '0' }
  })()

  const refundedAmountFormatted = (() => {
    try {
      const allPending = plan.items.every(item => item.status === 'pending')
      if (allPending) return totalAmountFormatted
      const total = plan.items
        .filter(item => item.status === 'pending')
        .reduce((sum, item) => sum + BigInt(item.amount ?? '0'), BigInt(0))
      return parseFloat(formatUnits(total, decimals)).toLocaleString()
    } catch { return '0' }
  })()

  const totalPages = Math.ceil(plan.items.length / ITEMS_PER_PAGE)
  const paginatedItems = plan.items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Build a Transaction stub for the execute dialog
  const transactionStub: Transaction = {
    id: plan.id,
    name: plan.transactionName,
    transactionId: plan.id,
    type: plan.transactionType,
    status: plan.transactionStatus as Transaction['status'],
    executionDate: payDay,
    daysRemaining: diffDays,
    isDueToday,
    totalAmount: totalAmountFormatted,
    currency: tokenSymbol,
    members: plan.items.length,
    network: networkName,
    isComplete: plan.transactionStatus === PayrollTransactionStatus.COMPLETE,
  }

  const handleExecuteSuccess = async (txHash: string) => {
    setExecuteOpen(false)
    setLastTxHash(txHash)
    setExecuteSuccessOpen(true)
    await new Promise(r => setTimeout(r, 2000))
    const updated = await apis.transaction.getTransactionPlanDetail(plan.id)
    setPlan(updated)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await apis.transaction.deleteTransactionPlan(plan.id)
      toast({ title: 'Success', description: 'Transaction deleted.' })
      navigate('/orgs/transaction')
    } catch {
      toast({ title: 'Error', description: 'Failed to delete transaction.', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* ── Info card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-6 flex flex-col gap-[16px]">
        {/* Top row: status + name + actions */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-[10px]">
            {/* Status badge + transaction name */}
            <div className="relative flex items-center gap-[10px] pl-[12px]">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[22px] rounded-full ${isComplete ? 'bg-[#5ddd22]' : isRefunded ? 'bg-[#606067]' : 'bg-[#5e85ee]'}`} />
              <StatusBadge status={plan.transactionStatus} />
              <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">{plan.transactionName}</span>
            </div>
            {/* Meta row */}
            <div className="flex items-center gap-[14px] text-[13px] leading-[22px]">
              <span>
                <span className="text-[#8d8d93]">Pay Day: </span>
                <span className="text-[#1c1c26] font-medium">{payDay}</span>
              </span>
              <div className="w-px h-[14px] bg-[rgba(0,0,0,0.12)]" />
              <span>
                <span className="text-[#8d8d93]">Execution Date: </span>
                {executionDateLabel}
              </span>
              <div className="w-px h-[14px] bg-[rgba(0,0,0,0.12)]" />
              <span>
                <span className="text-[#8d8d93]">Network: </span>
                <span className="text-[#1c1c26]">{networkName}</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-[10px]">
            {isComplete
              ? (
                <>
                  {hasPermission(Permission.REACTION_TRANSACTION) && (
                    <button
                      onClick={() => setReactionConfirmOpen(true)}
                      className="flex items-center gap-[4px] h-[38px] px-[14px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[#1c1c26] text-[13px] hover:bg-[#f5f5f5] transition-colors"
                    >
                      <CreditCard size={14} />
                      Re-action
                    </button>
                  )}
                  {hasPermission(Permission.EXECUTE_TRANSACTION) && plan.items.some(item => item.status !== 'claimed') && (
                    <button
                      onClick={() => setRefundOpen(true)}
                      className="flex items-center gap-[4px] h-[38px] px-[14px] rounded-[12px] border border-[rgba(255,168,0,0.4)] bg-white text-[#c47d00] text-[13px] hover:bg-[rgba(255,168,0,0.06)] transition-colors"
                    >
                      <RotateCcw size={14} />
                      Refund
                    </button>
                  )}
                </>
              )
              : isRefunded
              ? (
                hasPermission(Permission.REACTION_TRANSACTION) && (
                  <button
                    onClick={() => setReactionConfirmOpen(true)}
                    className="flex items-center gap-[4px] h-[38px] px-[14px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[#1c1c26] text-[13px] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <CreditCard size={14} />
                    Re-action
                  </button>
                )
              )
              : hasPermission(Permission.EXECUTE_TRANSACTION) && (
                <button
                  onClick={() => setExecuteOpen(true)}
                  className="flex items-center gap-[4px] h-[38px] px-[14px] rounded-[12px] bg-[#5e85ee] text-white text-[13px] hover:bg-[#5e85ee]/90 transition-opacity"
                >
                  <CreditCard size={14} />
                  Execute Now
                </button>
              )
            }
            {!isComplete && hasPermission(Permission.MODIFY_TRANSACTION) && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-[4px] h-[38px] px-[14px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[#1c1c26] text-[13px] hover:bg-[#f5f5f5] transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-[20px]">
          <div className="flex flex-1 items-center justify-between bg-[#f5f5f5] rounded-[18px] px-6 py-5">
            <span className="text-[#1c1c26] text-[14px] leading-[22px]">Total Members</span>
            <span className="text-[#1c1c26] text-[22px] font-medium leading-[32px]">{plan.items.length.toLocaleString()}</span>
          </div>
          <div className="flex flex-1 items-center justify-between bg-[#f5f5f5] rounded-[18px] px-6 py-5">
            <span className="text-[#1c1c26] text-[14px] leading-[22px]">Total Amount</span>
            <span className="text-[#1c1c26] text-[22px] font-medium leading-[32px]">{totalAmountFormatted} {tokenSymbol}</span>
          </div>
          {isRefunded && (
            <div className="flex flex-1 items-center justify-between bg-[#f5f5f5] rounded-[18px] px-6 py-5">
              <span className="text-[#1c1c26] text-[14px] leading-[22px]">Refunded Amount</span>
              <span className="text-[#1c1c26] text-[22px] font-medium leading-[32px]">{refundedAmountFormatted} {tokenSymbol}</span>
            </div>
          )}
          {isComplete && (
            <div className="flex flex-1 items-center justify-between bg-[#f5f5f5] rounded-[18px] px-6 py-5 min-w-0">
              <span className="text-[#1c1c26] text-[14px] leading-[22px] shrink-0">TX Hash</span>
              {txExplorerUrl ? (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#5e85ee] text-[14px] font-medium leading-[22px] font-mono truncate ml-4 hover:underline"
                  title={plan.depositTxHash ?? undefined}
                >
                  {formatTransactionHash(plan.depositTxHash)}
                </a>
              ) : (
                <span className="text-[#1c1c26] text-[14px] font-medium leading-[22px] font-mono truncate ml-4" title={plan.depositTxHash ?? undefined}>
                  {formatTransactionHash(plan.depositTxHash)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Members table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-6 flex flex-col gap-[20px] flex-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[220px]">Member</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[220px]">Email</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[180px]">Role</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[120px]">Status</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3">Amount</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[240px]">TX Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-[24px]">
                    <div className="flex flex-col items-center justify-center gap-[10px]">
                      <img src="/empty-table.svg" alt="No members" className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">No members found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, idx) => {
                  const amountFormatted = (() => {
                    try { return parseFloat(formatUnits(BigInt(item.amount ?? '0'), decimals)).toLocaleString() }
                    catch { return item.amount ?? '0' }
                  })()
                  const itemTxExplorerUrl = buildExplorerTransactionUrl(explorerBaseUrl, item.txHash)
                  return (
                    <TableRow key={item.id ?? idx} className="border-b border-[rgba(0,0,0,0.06)] hover:bg-[#f5f5f5]/60">
                      <TableCell className="py-[14px]">
                        <div className="flex items-center gap-[6px]">
                          <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee]">
                            {(item.member?.showName || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-[13px] text-[#1c1c26] leading-[22px]">{item.member?.showName ?? '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">{item.member?.email ?? '-'}</TableCell>
                      <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">{getHighestRole(item.member.roles)}</TableCell>
                      <TableCell className="py-[14px]">
                        <TransactionItemStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">
                        {amountFormatted} {tokenSymbol}
                      </TableCell>
                      <TableCell className="py-[14px]">
                        {itemTxExplorerUrl ? (
                          <a
                            href={itemTxExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[13px] text-[#5e85ee] leading-[22px] font-mono truncate hover:underline"
                            title={item.txHash ?? undefined}
                          >
                            {formatTransactionHash(item.txHash)}
                          </a>
                        ) : (
                          <span className="block text-[13px] text-[#1c1c26] leading-[22px] font-mono truncate" title={item.txHash ?? undefined}>
                            {formatTransactionHash(item.txHash)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[#606067] text-[13px]">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, plan.items.length)} of {plan.items.length} members
          </span>
          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent disableOutsideClose>
          <DialogTitle className="sr-only">Transaction Summary</DialogTitle>
          <ExecuteConfirmDialogContent
            executingTransaction={transactionStub}
            transactionPlan={plan}
            onCancel={() => setExecuteOpen(false)}
            onSuccess={handleExecuteSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={executeSuccessOpen} onOpenChange={setExecuteSuccessOpen}>
        <DialogContent className="max-w-2xl">
          <ExecuteSuccessDialogContent
            depositTxHash={lastTxHash}
            executingTransaction={transactionStub}
            onClose={() => { setExecuteSuccessOpen(false); setLastTxHash('') }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DeleteConfirmDialogContent
            transactionToDelete={transactionStub}
            isDeleting={isDeleting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleConfirmDelete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={reactionConfirmOpen} onOpenChange={setReactionConfirmOpen}>
        <DialogContent>
          <div className="flex flex-col space-y-4">
            <DialogHeader>
              <DialogTitle>Re-action Transaction</DialogTitle>
              <DialogDescription>
                Are you sure you want to create a new transaction based on this one? The original transaction will remain unchanged.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Transaction Name:</span>
                  <span className="text-sm font-medium">{plan.transactionName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Transaction ID:</span>
                  <span className="font-mono text-sm font-medium">{plan.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Members:</span>
                  <span className="text-sm font-medium">{plan.items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Total Amount:</span>
                  <span className="text-sm font-medium">{totalAmountFormatted} {tokenSymbol}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setReactionConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setReactionConfirmOpen(false)
                navigate(`/orgs/transaction/create?fromReaction=1&transactionId=${encodeURIComponent(plan.id)}`)
              }}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent disableOutsideClose>
          <DialogTitle className="sr-only">Refund Unclaimed Funds</DialogTitle>
          <RefundConfirmDialogContent
            transaction={transactionStub}
            transactionPlan={plan}
            onCancel={() => setRefundOpen(false)}
            onSuccess={async () => {
              setRefundOpen(false)
              const updated = await apis.transaction.getTransactionPlanDetail(plan.id)
              setPlan(updated)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
