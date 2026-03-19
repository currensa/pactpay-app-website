import apis from '@/apis'
import { TransactionPlan } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import { cn } from '@/lib/utils'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { Permission, useHasPermission } from '@/utils/permissions'
import { formatUnits } from 'ethers'
import { ChevronsUpDown, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
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

  const fetchTransactionPlans = async () => {
    try {
      const response = await apis.transaction.getTransactionPlans()
      setRawTransactionPlans(response.data)
      const transformedTransactions = response.data.map(transformTransactionPlan)
      setTransactions(transformedTransactions)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      setTotalCount(response.total)
    } catch {
      toast({ title: 'Error', description: 'Failed to load transactions. Please try again.', variant: 'destructive' })
    }
  }

  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter])

  const handleDepositClick = (transaction: Transaction) => {
    const plan = rawTransactionPlans.find(p => p.id === transaction.id) ?? null
    setDepositingTransaction(transaction)
    setDepositingTransactionPlan(plan)
    setDepositConfirmDialogOpen(true)
  }

  const handleDepositSuccess = async (txHash: string) => {
    if (!depositingTransaction) return
    try {
      await apis.transaction.confirmDeposit(depositingTransaction.id, txHash)
      setDepositConfirmDialogOpen(false)
      setLastDepositTxHash(txHash)
      setDepositSuccessDialogOpen(true)
      await fetchTransactionPlans()
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to confirm execute on server.', variant: 'destructive' })
    }
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  return (
    <div className="bg-white rounded-[32px] p-6 flex flex-col gap-6 h-full">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-[300px] h-[42px] pl-4 pr-10 rounded-[12px] border-[rgba(0,0,0,0.12)] text-[13px] placeholder:text-[#8d8d93]"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d8d93]" />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-[42px] rounded-[12px] border-[rgba(0,0,0,0.12)] text-[13px] text-[#8d8d93]">
              {statusFilter === 'all' && 'Status'}
              {statusFilter === PayrollTransactionStatus.READY && 'Ready'}
              {statusFilter === PayrollTransactionStatus.PENDING && 'Pending'}
              {statusFilter === PayrollTransactionStatus.COMPLETE && 'Complete'}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={PayrollTransactionStatus.READY}>Ready</SelectItem>
              <SelectItem value={PayrollTransactionStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={PayrollTransactionStatus.COMPLETE}>Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasPermission(Permission.CREATE_TRANSACTION) && (
          <Button
            onClick={() => navigate('/orgs/transaction/create')}
            className="bg-[#5e85ee] rounded-[12px] h-[42px] px-4 text-[13px] font-normal text-white hover:bg-[#5e85ee]/90 gap-[6px]"
          >
            <Plus size={14} />
            New Transaction
          </Button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pl-5 pb-3 w-[220px]">Transaction</TableHead>
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[140px]">Network</TableHead>
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[100px]">Members</TableHead>
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[120px]">Amount</TableHead>
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[90px]">Status</TableHead>
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[120px]">
                <button className="flex items-center gap-1 hover:text-[#1c1c26] transition-colors">
                  Pay Day <ChevronsUpDown size={13} />
                </button>
              </TableHead>
              <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3">Action</TableHead>
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
                      'relative border-b border-[rgba(0,0,0,0.06)] hover:bg-[#f5f5f5]/60',
                      isPending && 'bg-[rgba(255,168,0,0.04)]'
                    )}
                  >
                    {/* Pending left accent bar */}
                    {isPending && (
                      <td className="p-0 w-0 border-0">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] bg-[#ffa800] rounded-r-[2px]" />
                      </td>
                    )}
                    <TableCell className="pl-5 text-[13px] text-[#1c1c26] leading-[22px]">
                      {transaction.name}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#1c1c26] leading-[22px]">{transaction.network}</TableCell>
                    <TableCell className="text-[13px] text-[#1c1c26] leading-[22px]">{transaction.members}</TableCell>
                    <TableCell className="text-[13px] text-[#1c1c26] leading-[22px]">
                      {transaction.totalAmount} {transaction.currency}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell className="text-[13px] text-[#1c1c26] leading-[22px]">
                      {transaction.executionDate}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {isComplete
                          ? hasPermission(Permission.REACTION_TRANSACTION) && (
                              <button
                                className="text-[#5e85ee] text-[13px] hover:opacity-70 transition-opacity whitespace-nowrap"
                                onClick={() => handleReactionClick(transaction)}
                              >
                                Create again
                              </button>
                            )
                          : hasPermission(Permission.EXECUTE_TRANSACTION) && (
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
                        {hasPermission(Permission.MODIFY_TRANSACTION) && (
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
