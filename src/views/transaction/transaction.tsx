import apis from '@/apis'
import { TransactionPlan } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import { cn } from '@/lib/utils'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { Permission, useHasPermission } from '@/utils/permissions'
import { formatUnits } from 'ethers'
import { ChevronDown, ChevronUp, ChevronsUpDown, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  RefundConfirmDialogContent,
} from './components'
import type { Transaction } from './components/types'

function TransactionStatusBadge({ status }: { status: Transaction['status'] }) {
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
    default:
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(0,0,0,0.06)] px-2 py-[2px] text-[12px] leading-[22px] text-[#606067] whitespace-nowrap">
          {status}
        </span>
      )
  }
}

export default function Transaction() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const hasPermission = useHasPermission()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<'payDay' | 'status' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)

  const handleSort = (field: 'payDay' | 'status') => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') { setSortField(null); setSortDirection(null) }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }
  const [currentPage, setCurrentPage] = useState(1)

  const [depositConfirmDialogOpen, setDepositConfirmDialogOpen] = useState(false)
  const [depositingTransaction, setDepositingTransaction] = useState<Transaction | null>(null)
  const [depositingTransactionPlan, setDepositingTransactionPlan] = useState<TransactionPlan | null>(null)
  const [depositSuccessDialogOpen, setDepositSuccessDialogOpen] = useState(false)
  const [lastDepositTxHash, setLastDepositTxHash] = useState('')


  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [reactionConfirmDialogOpen, setReactionConfirmDialogOpen] = useState(false)
  const [transactionToReaction, setTransactionToReaction] = useState<Transaction | null>(null)

  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refundingTransaction, setRefundingTransaction] = useState<Transaction | null>(null)
  const [refundingTransactionPlan, setRefundingTransactionPlan] = useState<TransactionPlan | null>(null)
  const [refundSuccessDialogOpen, setRefundSuccessDialogOpen] = useState(false)
  const [lastRefundTxHash, setLastRefundTxHash] = useState('')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rawTransactionPlans, setRawTransactionPlans] = useState<TransactionPlan[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const { getTokenSymbol, getTokenDecimals, fetchChainAssets, fetchChains, getChain } = useChainAssetStore()

  useEffect(() => {
    const init = async () => {
      await fetchChainAssets()
      await fetchChains()
      await fetchPayrollTokenSymbol()
      await fetchTransactionPlans()
    }
    init()
  }, [])

  const transformTransactionPlan = (plan: TransactionPlan): Transaction => {
    const payPeriodDate = new Date(plan.payPeriod)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    payPeriodDate.setHours(0, 0, 0, 0)

    const diffTime = payPeriodDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const currency = getTokenSymbol(plan.caipChainId, plan.tokenAddress || '') || plan.tokenAddress || 'USDC'
    const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress || '')
    const totalAmount = formatUnits(BigInt(plan.totalAmount || '0'), decimals)
    const isComplete = plan.transactionStatus === PayrollTransactionStatus.COMPLETE
    const isDueToday = diffDays === 0 && !isComplete
    const status = (plan.transactionStatus as Transaction['status']) || PayrollTransactionStatus.READY

    return {
      id: plan.id,
      name: plan.transactionName,
      transactionId: plan.id,
      type: plan.transactionType,
      status,
      executionDate: payPeriodDate
        .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\//g, '/'),
      daysRemaining: isComplete ? null : diffDays,
      isDueToday,
      totalAmount,
      currency,
      members: plan.items.length,
      network: getChain(plan.caipChainId)?.name || plan.caipChainId,
      isComplete,
    }
  }

  const fetchTransactionPlans = async (status = statusFilter) => {
    try {
      const response = await apis.transaction.getTransactionPlans(1, itemsPerPage, status)
      setRawTransactionPlans(response.data)
      const transformedTransactions = response.data.map(transformTransactionPlan)
      setTransactions(transformedTransactions)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      setTotalCount(response.total)
    } catch {
      toast({ title: 'Error', description: 'Failed to load transactions. Please try again.', variant: 'destructive' })
    }
  }

  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  useEffect(() => {
    fetchTransactionPlans(statusFilter)
    setCurrentPage(1)
  }, [statusFilter])

  const handleDepositClick = (transaction: Transaction) => {
    const plan = rawTransactionPlans.find(p => p.id === transaction.id) ?? null
    setDepositingTransaction(transaction)
    setDepositingTransactionPlan(plan)
    setDepositConfirmDialogOpen(true)
  }

  const handleDepositSuccess = async (txHash: string) => {
    if (!depositingTransaction) return
    setDepositConfirmDialogOpen(false)
    setLastDepositTxHash(txHash)
    setDepositSuccessDialogOpen(true)
    await new Promise(r => setTimeout(r, 2000))
    await fetchTransactionPlans()
  }

  const handleViewDetails = (transaction: Transaction) => {
    navigate(`/orgs/transaction/${transaction.id}`)
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction)
    setDeleteConfirmDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return
    setIsDeleting(true)
    try {
      await apis.transaction.deleteTransactionPlan(transactionToDelete.id)
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id))
      setTotalCount(prev => prev - 1)
      toast({ title: 'Success', description: 'Transaction deleted successfully' })
      setDeleteConfirmDialogOpen(false)
      setTransactionToDelete(null)
    } catch {
      toast({ title: 'Error', description: 'Failed to delete transaction.', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReactionClick = (transaction: Transaction) => {
    setTransactionToReaction(transaction)
    setReactionConfirmDialogOpen(true)
  }

  const handleConfirmReaction = () => {
    if (!transactionToReaction) return
    const transactionId = transactionToReaction.id
    setReactionConfirmDialogOpen(false)
    setTransactionToReaction(null)
    navigate(`/orgs/transaction/create?fromReaction=1&transactionId=${encodeURIComponent(transactionId)}`)
  }

  const planHasUnclaimedItems = (plan: TransactionPlan) =>
    plan.items.some(item => item.status !== 'claimed')

  const handleRefundClick = (transaction: Transaction) => {
    const plan = rawTransactionPlans.find(p => p.id === transaction.id) ?? null
    setRefundingTransaction(transaction)
    setRefundingTransactionPlan(plan)
    setRefundDialogOpen(true)
  }

  const handleRefundSuccess = async (txHash: string) => {
    setRefundDialogOpen(false)
    setLastRefundTxHash(txHash)
    setRefundSuccessDialogOpen(true)
    await new Promise(r => setTimeout(r, 2000))
    await fetchTransactionPlans()
  }

  const filteredTransactions = transactions
    .filter(transaction =>
      transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0
      if (sortField === 'payDay') {
        const dateA = new Date(a.executionDate).getTime()
        const dateB = new Date(b.executionDate).getTime()
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      }
      if (sortField === 'status') {
        const order: Record<string, number> = {
          [PayrollTransactionStatus.PENDING]: 0,
          [PayrollTransactionStatus.READY]: 1,
          [PayrollTransactionStatus.COMPLETE]: 2,
        }
        const diff = (order[a.status] ?? 99) - (order[b.status] ?? 99)
        return sortDirection === 'asc' ? diff : -diff
      }
      return 0
    })

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const SortIcon = ({ field }: { field: 'payDay' | 'status' }) => {
    if (sortField === field) {
      return sortDirection === 'asc'
        ? <ChevronUp className="h-[14px] w-[14px] text-[#1c1c26]" />
        : <ChevronDown className="h-[14px] w-[14px] text-[#1c1c26]" />
    }
    return <ChevronsUpDown className="h-[14px] w-[14px] text-[#8d8d93]" />
  }

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: PayrollTransactionStatus.READY, label: 'Ready' },
    { value: PayrollTransactionStatus.PENDING, label: 'Pending' },
    { value: PayrollTransactionStatus.COMPLETE, label: 'Complete' },
  ]

  return (
    <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[16px] h-full">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-[10px]">
          {/* Search */}
          <div className="flex h-[36px] w-[260px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="flex-1 bg-transparent text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
            />
            <Search className="h-[16px] w-[16px] text-[#8d8d93] shrink-0" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(v => !v)}
              className="flex h-[36px] w-[130px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]"
            >
              <span className={`text-[13px] leading-[20px] ${statusFilter === 'all' ? 'text-[#8d8d93]' : 'text-[#1c1c26]'}`}>
                {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? 'Status'}
              </span>
              <ChevronDown className={`h-[16px] w-[16px] text-[#1c1c26] transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-[4px] w-[160px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg overflow-hidden">
                {STATUS_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { setStatusFilter(o.value); setStatusDropdownOpen(false) }}
                    className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] hover:bg-[#f5f5f5] transition-colors ${statusFilter === o.value ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {hasPermission(Permission.CREATE_TRANSACTION) && (
          <button
            onClick={() => navigate('/orgs/transaction/create')}
            className="flex items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-[14px] w-[14px]" />
            New Transaction
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>
                <button onClick={() => handleSort('status')} className="flex items-center gap-[4px]">
                  Status <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('payDay')} className="flex items-center gap-[4px]">
                  Pay Day <SortIcon field="payDay" />
                </button>
              </TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-[#8d8d93] text-[13px]">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map(transaction => {
                const isPending = transaction.status === PayrollTransactionStatus.PENDING
                const isComplete = transaction.isComplete
                return (
                  <TableRow
                    key={transaction.id}
                    className={cn(
                      'relative',
                      isPending && 'bg-[rgba(255,168,0,0.04)]'
                    )}
                  >
                    {/* Pending left accent bar */}
                    {isPending && (
                      <td className="p-0 w-0 border-0">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] bg-[#ffa800] rounded-r-[2px]" />
                      </td>
                    )}
                    <TableCell>{transaction.name}</TableCell>
                    <TableCell>{transaction.network}</TableCell>
                    <TableCell>{transaction.members}</TableCell>
                    <TableCell>
                      {transaction.totalAmount} {transaction.currency}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell>{transaction.executionDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {isComplete ? (
                          <>
                            {hasPermission(Permission.REACTION_TRANSACTION) && (
                              <button
                                className="text-[#5e85ee] text-[13px] hover:opacity-70 transition-opacity whitespace-nowrap"
                                onClick={() => handleReactionClick(transaction)}
                              >
                                Create again
                              </button>
                            )}
                            {(() => {
                              const plan = rawTransactionPlans.find(p => p.id === transaction.id)
                              return plan && planHasUnclaimedItems(plan) ? (
                                <button
                                  className="text-[#ffa800] text-[13px] hover:opacity-70 transition-opacity whitespace-nowrap"
                                  onClick={() => handleRefundClick(transaction)}
                                >
                                  Refund
                                </button>
                              ) : null
                            })()}
                          </>
                        ) : hasPermission(Permission.EXECUTE_TRANSACTION) && (
                              <button
                                className="bg-[#5e85ee] text-white text-[13px] px-[10px] py-[5px] rounded-[12px] hover:bg-[#5e85ee]/90 transition-opacity whitespace-nowrap"
                                onClick={() => handleDepositClick(transaction)}
                              >
                                Execute
                              </button>
                            )
                        }
                        <button
                          className="text-[#5e85ee] text-[13px] hover:opacity-70 transition-opacity whitespace-nowrap"
                          onClick={() => handleViewDetails(transaction)}
                        >
                          View Details
                        </button>
                        {hasPermission(Permission.MODIFY_TRANSACTION) && !isComplete && (
                          <button
                            className="text-[#d92b2b] text-[13px] hover:opacity-70 transition-opacity whitespace-nowrap"
                            onClick={() => handleDeleteClick(transaction)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[#606067] text-[13px]">
          Showing {startIndex + 1}–{Math.min(endIndex, filteredTransactions.length)} of {totalCount} transactions
        </span>
        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <Dialog open={depositConfirmDialogOpen} onOpenChange={setDepositConfirmDialogOpen}>
        <DialogContent>
          <ExecuteConfirmDialogContent
            executingTransaction={depositingTransaction}
            transactionPlan={depositingTransactionPlan}
            onCancel={() => { setDepositConfirmDialogOpen(false); setDepositingTransaction(null); setDepositingTransactionPlan(null) }}
            onSuccess={handleDepositSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={depositSuccessDialogOpen} onOpenChange={setDepositSuccessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <ExecuteSuccessDialogContent
            depositTxHash={lastDepositTxHash}
            executingTransaction={depositingTransaction}
            onClose={() => { setDepositSuccessDialogOpen(false); setDepositingTransaction(null); setLastDepositTxHash('') }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DeleteConfirmDialogContent
            transactionToDelete={transactionToDelete}
            isDeleting={isDeleting}
            onCancel={() => { setDeleteConfirmDialogOpen(false); setTransactionToDelete(null) }}
            onConfirm={handleConfirmDelete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <RefundConfirmDialogContent
            transaction={refundingTransaction}
            transactionPlan={refundingTransactionPlan}
            onCancel={() => { setRefundDialogOpen(false); setRefundingTransaction(null); setRefundingTransactionPlan(null) }}
            onSuccess={handleRefundSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={refundSuccessDialogOpen} onOpenChange={setRefundSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Submitted</DialogTitle>
            <DialogDescription>
              Your refund transaction has been submitted successfully.
            </DialogDescription>
          </DialogHeader>
          {lastRefundTxHash && (
            <p className="text-[13px] text-[#606067] break-all">
              Tx: <span className="font-mono text-[#1c1c26]">{lastRefundTxHash}</span>
            </p>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={() => { setRefundSuccessDialogOpen(false); setRefundingTransaction(null); setLastRefundTxHash('') }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reactionConfirmDialogOpen} onOpenChange={setReactionConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-action Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to create a new transaction based on this one? The original transaction will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setReactionConfirmDialogOpen(false); setTransactionToReaction(null) }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReaction}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
