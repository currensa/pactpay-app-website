import apis from '@/apis'
import { TransactionPlan } from '@/apis/transaction.api'
import useChainAssetStore from '@/stores/chain-asset'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { cn, formatAmount, sumAmounts } from '@/lib/utils'
import { IconAlertTriangle, IconFlame, IconPlus, IconTrash } from '@tabler/icons-react'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  TransactionDetailDialogContent,
} from './components'
import type { Transaction } from './components/types'

function getStatusBadge(status: Transaction['status']) {
  switch (status) {
    case 'pending_deposit':
      return <Badge variant="warning">Pending Deposit</Badge>
    case 'pending':
      return <Badge variant="warning">Pending</Badge>
    case 'complete':
      return <Badge variant="success">Complete</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatRelativeTime(daysRemaining: number | null, isDueToday: boolean, executionDate: string) {
  if (isDueToday) return 'Due Today'
  if (daysRemaining !== null && daysRemaining > 0) {
    return `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
  }
  if (daysRemaining !== null && daysRemaining < 0) {
    const daysAgo = Math.abs(daysRemaining)
    return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`
  }
  const executionDateObj = new Date(executionDate.replace(/\//g, '-'))
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - executionDateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return `${diffDays} days ago`
}

function getTimeIcon(daysRemaining: number | null, isDueToday: boolean) {
  if (isDueToday) return <IconFlame className="size-4 text-orange-500" />
  if (daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0) {
    return <IconAlertTriangle className="size-4 text-orange-500" />
  }
  return null
}

export default function Transaction() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { getTokenSymbol, chains, fetchChainAssets, fetchChains } = useChainAssetStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Deposit 确认弹窗状态
  const [depositConfirmDialogOpen, setDepositConfirmDialogOpen] = useState(false)
  const [depositingTransaction, setDepositingTransaction] = useState<Transaction | null>(null)
  const [depositingTransactionPlan, setDepositingTransactionPlan] = useState<TransactionPlan | null>(null)
  const [depositSuccessDialogOpen, setDepositSuccessDialogOpen] = useState(false)
  const [lastDepositTxHash, setLastDepositTxHash] = useState('')

  // Transaction 详情弹窗状态
  const [transactionDetailDialogOpen, setTransactionDetailDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [transactionDetailMembers, setTransactionDetailMembers] = useState<any[]>([])

  // 删除弹窗状态
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Re-action 弹窗状态
  const [reactionConfirmDialogOpen, setReactionConfirmDialogOpen] = useState(false)
  const [transactionToReaction, setTransactionToReaction] = useState<Transaction | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rawTransactionPlans, setRawTransactionPlans] = useState<TransactionPlan[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  const getNetworkName = (caipChainId: string) =>
    chains.find(c => c.caipChainId === caipChainId)?.name || caipChainId

  const transformTransactionPlan = (plan: TransactionPlan): Transaction => {
    const payPeriodDate = new Date(plan.payPeriod)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    payPeriodDate.setHours(0, 0, 0, 0)

    const diffTime = payPeriodDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const currency = getTokenSymbol(plan.caipChainId, plan.tokenAddress || '') || plan.tokenAddress || 'USDC'
    const totalAmount = sumAmounts(plan.items.map(item => item.amount || '0'), currency)
    const isComplete = plan.transactionStatus === 'success'
    const isDueToday = diffDays === 0 && !isComplete

    // StealthPay 状态映射
    let status: Transaction['status'] = 'pending_deposit'
    if (plan.transactionStatus === 'draft') {
      status = 'pending_deposit'
    } else if (plan.transactionStatus === 'success') {
      status = 'complete'
    } else if (plan.transactionStatus === 'failed') {
      status = 'failed'
    } else {
      // proposed / confirming / ready / executing → pending
      status = 'pending'
    }

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
      totalAmount: formatAmount(totalAmount, currency),
      currency,
      members: plan.items.length,
      network: getNetworkName(plan.caipChainId),
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
      toast({
        title: 'Error',
        description: 'Failed to load transactions. Please try again.',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    fetchChainAssets()
    fetchChains()
    fetchTransactionPlans()
  }, [currentPage])

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTransactionPlans()
    }, 5000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // 处理 Deposit 点击（draft → 链上执行）
  const handleDepositClick = (transaction: Transaction) => {
    const plan = rawTransactionPlans.find(p => p.id === transaction.id) ?? null
    setDepositingTransaction(transaction)
    setDepositingTransactionPlan(plan)
    setDepositConfirmDialogOpen(true)
  }

  // 链上 deposit 成功后通知后端
  const handleDepositSuccess = async (txHash: string) => {
    if (!depositingTransaction) return
    try {
      await apis.transaction.confirmDeposit(depositingTransaction.id, txHash)
      setDepositConfirmDialogOpen(false)
      setLastDepositTxHash(txHash)
      setDepositSuccessDialogOpen(true)
      await fetchTransactionPlans()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to confirm deposit on server.',
        variant: 'destructive'
      })
    }
  }

  const handleViewDetails = async (transaction: Transaction) => {
    try {
      const transactionPlanDetail = await apis.transaction.getTransactionPlanDetail(transaction.id)
      setSelectedTransaction(transaction)
      setTransactionDetailMembers(transactionPlanDetail.items)
      setTransactionDetailDialogOpen(true)
    } catch (error: any) {
      toast({
        description: `Failed to get transaction detail: ${error.message}`,
        variant: 'destructive'
      })
    }
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                {statusFilter === 'all' && 'All Statuses'}
                {statusFilter === 'pending_deposit' && 'Pending Deposit'}
                {statusFilter === 'complete' && 'Complete'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_deposit">Pending Deposit</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => navigate('/orgs/transaction/create')}>
              <IconPlus className="mr-2 size-4" />
              New Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Transaction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Execution Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead>Network</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map(transaction => (
                <TableRow
                  key={transaction.id}
                  className={cn(
                    'group',
                    !transaction.isComplete && 'border-l-2 border-l-orange-500 bg-orange-50/20 hover:bg-orange-50/40'
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-full w-1 rounded-full',
                          transaction.isComplete ? 'bg-gray-300' : 'bg-orange-500'
                        )}
                      />
                      <span className="font-medium">{transaction.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>
                    <div className="items-center gap-2">
                      <span className="text-muted-foreground text-sm">{transaction.executionDate}</span>
                      <div className="flex items-center gap-1.5">
                        {getTimeIcon(transaction.daysRemaining, transaction.isDueToday)}
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(
                            transaction.daysRemaining,
                            transaction.isDueToday,
                            transaction.executionDate
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {transaction.totalAmount} {transaction.currency}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{transaction.members}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {transaction.network}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {transaction.status === 'pending_deposit' && (
                        <Button variant="default" size="sm" onClick={() => handleDepositClick(transaction)}>
                          Deposit
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(transaction)}>
                        View Details
                      </Button>
                      {transaction.isComplete ? (
                        <Button variant="outline" size="sm" onClick={() => handleReactionClick(transaction)}>
                          Re-action
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(transaction)}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {totalCount} transactions
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Deposit 确认弹窗 */}
      <Dialog open={depositConfirmDialogOpen} onOpenChange={setDepositConfirmDialogOpen}>
        <DialogContent>
          <ExecuteConfirmDialogContent
            executingTransaction={depositingTransaction}
            transactionPlan={depositingTransactionPlan}
            onCancel={() => {
              setDepositConfirmDialogOpen(false)
              setDepositingTransaction(null)
              setDepositingTransactionPlan(null)
            }}
            onSuccess={handleDepositSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Deposit 成功弹窗 */}
      <Dialog open={depositSuccessDialogOpen} onOpenChange={setDepositSuccessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <ExecuteSuccessDialogContent
            depositTxHash={lastDepositTxHash}
            executingTransaction={depositingTransaction}
            onClose={() => {
              setDepositSuccessDialogOpen(false)
              setDepositingTransaction(null)
              setLastDepositTxHash('')
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Transaction 详情弹窗 */}
      <Dialog open={transactionDetailDialogOpen} onOpenChange={setTransactionDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <TransactionDetailDialogContent
            selectedTransaction={selectedTransaction}
            transactionDetailMembers={transactionDetailMembers}
            onExecuteNow={() => {}}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DeleteConfirmDialogContent
            transactionToDelete={transactionToDelete}
            isDeleting={isDeleting}
            onCancel={() => {
              setDeleteConfirmDialogOpen(false)
              setTransactionToDelete(null)
            }}
            onConfirm={handleConfirmDelete}
          />
        </DialogContent>
      </Dialog>

      {/* Re-action 确认弹窗 */}
      <Dialog open={reactionConfirmDialogOpen} onOpenChange={setReactionConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-action Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to create a new transaction based on this one? The original transaction will remain
              unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setReactionConfirmDialogOpen(false)
                setTransactionToReaction(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmReaction}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
