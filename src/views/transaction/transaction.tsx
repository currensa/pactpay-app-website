import apis from '@/apis'
import {
  TransactionListTransactionType,
  TransactionPlan,
  TRANSACTION_LIST_TRANSACTION_TYPES,
} from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import { cn } from '@/lib/utils'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { formatLocalDateTime } from '@/utils/date'
import { Permission, useHasPermission } from '@/utils/permissions'
import { buildExplorerTransactionUrl, formatTransactionHash } from '@/utils/transaction'
import { getErrorMessage } from '@/views/orgs/components/ai-api/utils'
import { TransactionStatusBadge } from '@/views/transaction/components/transaction-status-badge'
import { formatUnits } from 'ethers'
import { ChevronDown, ChevronUp, ChevronsUpDown, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  PayrollSetupDialog,
  RefundConfirmDialogContent,
} from './components'
import { TransactionTabsNav } from './components/transaction-tabs-nav'
import type { Transaction } from './components/types'

type TransactionsTab = 'all' | 'people' | 'ai'

type AiTransactionRow = {
  id: string
  transactionName: string
  network: string
  payees: string
  amount: string
  status: string
  payDay: string
  planId: string | null
  rechargeId: string | null
  raw: TransactionPlan
}

type AllTransactionRow = {
  id: string
  type: 'People' | 'AI'
  transaction: string
  network: string
  payees: string
  amount: string
  status: string
  payDay: string
  planId: string | null
  raw: TransactionPlan
}

function getPlanIdFromTransaction(plan: TransactionPlan): string | null {
  const raw = plan as TransactionPlan & Record<string, any>
  return raw.planId
    || raw.tokenUsagePlanId
    || raw.usagePlanId
    || raw.token_usage_plan_id
    || raw.plan?.id
    || raw.newApiUserId
    || raw.new_api_user_id
    || raw.displayPlanId
    || raw.display_plan_id
    || null
}

function getTokenUsagePlanRechargeIdFromTransaction(plan: TransactionPlan): string | null {
  const raw = plan as TransactionPlan & Record<string, any>
  return raw.tokenUsagePlanRecharge?.id
    || raw.token_usage_plan_recharge?.id
    || raw.recharge?.id
    || null
}

export default function TransactionPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const hasPermission = useHasPermission()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<'payDay' | 'status' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)
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

  const [payrollSetupDialogOpen, setPayrollSetupDialogOpen] = useState(false)
  const [selectedChainId, setSelectedChainId] = useState('')
  const [selectedToken, setSelectedToken] = useState('')
  const [savingPayrollSetup, setSavingPayrollSetup] = useState(false)
  const [pendingCreatePath, setPendingCreatePath] = useState<string | null>(null)
  const [usagePlanIdByKey, setUsagePlanIdByKey] = useState<Record<string, string>>({})

  const [rawTransactions, setRawTransactions] = useState<TransactionPlan[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const itemsPerPage = 10

  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const payrollConfig = useOrganizationStore(s => s.payrollConfig)
  const {
    chainAssets,
    getTokenSymbol,
    getTokenDecimals,
    fetchChainAssets,
    fetchChains,
    getChain,
  } = useChainAssetStore()

  const activeTabParam = searchParams.get('tab')
  const activeTab: TransactionsTab = activeTabParam === 'people' || activeTabParam === 'ai' ? activeTabParam : 'all'
  const transactionType: TransactionListTransactionType = activeTab === 'people'
    ? TRANSACTION_LIST_TRANSACTION_TYPES[0]
    : activeTab === 'ai'
      ? TRANSACTION_LIST_TRANSACTION_TYPES[1]
      : TRANSACTION_LIST_TRANSACTION_TYPES[2]
  const isPayrollConfigConfigured = Boolean(payrollConfig?.caipChainId && payrollConfig?.token)
  const setupPayrollRequested = searchParams.get('setupPayroll') === '1'
  const redirectState = location.state as { pendingCreatePath?: string } | null

  const handleSort = (field: 'payDay' | 'status') => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const resetPayrollSetupState = () => {
    setSelectedChainId('')
    setSelectedToken('')
    setSavingPayrollSetup(false)
    setPendingCreatePath(null)
  }

  const clearSetupPayrollQuery = () => {
    if (!setupPayrollRequested) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('setupPayroll')
      return next
    }, { replace: true })
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const chainAssetStore = useChainAssetStore.getState()
      const organizationStore = useOrganizationStore.getState()
      const [, , , usagePlanResponse] = await Promise.all([
        chainAssetStore.fetchChainAssets(),
        chainAssetStore.fetchChains(),
        organizationStore.fetchPayrollTokenSymbol(),
        apis.tokenUsagePlan.getUsagePlanList(1, 100),
      ])
      const usagePlanMap = usagePlanResponse.data.reduce<Record<string, string>>((acc, plan) => {
        if (plan.id) acc[plan.id] = plan.id
        if (plan.newApiUserId) acc[plan.newApiUserId] = plan.id
        return acc
      }, {})
      if (!cancelled) setUsagePlanIdByKey(usagePlanMap)
      if (!cancelled) setIsReady(true)
    }

    void init()
    return () => { cancelled = true }
  }, [])

  const transformPeopleTransaction = (plan: TransactionPlan): Transaction => {
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const payPeriodMidnight = new Date(plan.payPeriod)
    payPeriodMidnight.setHours(0, 0, 0, 0)

    const diffTime = payPeriodMidnight.getTime() - todayMidnight.getTime()
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
      executionDate: formatLocalDateTime(plan.payPeriod),
      daysRemaining: isComplete ? null : diffDays,
      isDueToday,
      totalAmount,
      currency,
      members: plan.items?.length ?? 0,
      network: getChain(plan.caipChainId)?.name || plan.caipChainId,
      isComplete,
    }
  }

  const transformAiTransaction = (plan: TransactionPlan): AiTransactionRow => {
    const rawPlanId = getPlanIdFromTransaction(plan)
    const resolvedPlanId = rawPlanId ? (usagePlanIdByKey[rawPlanId] ?? rawPlanId) : null
    const rechargeId = getTokenUsagePlanRechargeIdFromTransaction(plan)
    const currency = getTokenSymbol(plan.caipChainId, plan.tokenAddress || '') || plan.tokenAddress || ''
    const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress || '')
    const formattedAmount = (() => {
      try {
        return `${formatUnits(BigInt(plan.totalAmount || '0'), decimals)}${currency ? ` ${currency}` : ''}`
      } catch {
        return `${plan.totalAmount || '0'}${currency ? ` ${currency}` : ''}`
      }
    })()

    return {
      id: plan.id,
      transactionName: plan.transactionName || `AI API Top up ${plan.id.slice(0, 8)}`,
      network: getChain(plan.caipChainId)?.name || plan.caipChainId || '-',
      payees: 'API Service',
      amount: formattedAmount,
      status: plan.transactionStatus || 'pending',
      payDay: plan.payPeriod || plan.createdAt,
      planId: resolvedPlanId,
      rechargeId,
      raw: plan,
    }
  }

  const fetchTransactions = async (
    page = currentPage,
    status = statusFilter,
    keyword = debouncedSearch,
    type: TransactionListTransactionType = transactionType,
  ) => {
    try {
      setLoading(true)
      const response = await apis.transaction.getTransactionPlans(
        page,
        itemsPerPage,
        activeTab === 'people' ? status : undefined,
        keyword || undefined,
        type,
      )
      setRawTransactions(response.data)
      setTotalPages(Math.max(1, Math.ceil(response.total / itemsPerPage)))
      setTotalCount(response.total)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to load transactions.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!isReady) return
    setCurrentPage(1)
  }, [activeTab, debouncedSearch, isReady, statusFilter])

  useEffect(() => {
    if (!isReady) return
    void fetchTransactions(currentPage, statusFilter, debouncedSearch, transactionType)
  }, [activeTab, currentPage, debouncedSearch, isReady, statusFilter, transactionType])

  useEffect(() => {
    if (!isReady) return
    if (setupPayrollRequested && !isPayrollConfigConfigured) {
      setPendingCreatePath(redirectState?.pendingCreatePath ?? '/orgs/transaction/create-people')
      setPayrollSetupDialogOpen(true)
      return
    }
    if (setupPayrollRequested && isPayrollConfigConfigured) {
      clearSetupPayrollQuery()
    }
  }, [clearSetupPayrollQuery, isPayrollConfigConfigured, isReady, redirectState?.pendingCreatePath, setupPayrollRequested])

  const openPayrollSetupDialog = (targetPath: string) => {
    setPendingCreatePath(targetPath)
    setSelectedChainId(payrollConfig?.caipChainId ?? '')
    setSelectedToken(payrollConfig?.token ?? '')
    setPayrollSetupDialogOpen(true)
  }

  const closePayrollSetupDialog = () => {
    setPayrollSetupDialogOpen(false)
    resetPayrollSetupState()
    clearSetupPayrollQuery()
  }

  const handleStartCreateTransaction = (targetPath = '/orgs/transaction/create-people') => {
    if (isPayrollConfigConfigured) {
      navigate(targetPath)
      return
    }
    openPayrollSetupDialog(targetPath)
  }

  const handleSavePayrollSetup = async () => {
    if (!selectedChainId || !selectedToken) return
    try {
      setSavingPayrollSetup(true)
      await apis.organization.upsertOrgPayrollConfig({ caipChainId: selectedChainId, token: selectedToken })
      await fetchPayrollTokenSymbol()
      toast({ title: 'Success', description: 'Payment settings updated.' })
      const targetPath = pendingCreatePath ?? '/orgs/transaction/create-people'
      setPayrollSetupDialogOpen(false)
      resetPayrollSetupState()
      clearSetupPayrollQuery()
      navigate(targetPath)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save payment settings.' })
    } finally {
      setSavingPayrollSetup(false)
    }
  }

  const peopleTransactions = useMemo(
    () => rawTransactions.filter(item => item.transactionType !== 'token_usage_plan').map(transformPeopleTransaction),
    [rawTransactions],
  )

  const aiTransactions = useMemo(
    () => rawTransactions.filter(item => item.transactionType === 'token_usage_plan').map(transformAiTransaction),
    [rawTransactions, usagePlanIdByKey],
  )

  const visiblePeopleTransactions = useMemo(() => (
    [...peopleTransactions].sort((a, b) => {
      if (!sortField || !sortDirection) return 0
      if (sortField === 'payDay') {
        const dateA = new Date(a.executionDate).getTime()
        const dateB = new Date(b.executionDate).getTime()
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      }
      const order: Record<string, number> = {
        [PayrollTransactionStatus.READY]: 0,
        [PayrollTransactionStatus.COMPLETE]: 1,
        [PayrollTransactionStatus.REFUNDED]: 2,
      }
      const diff = (order[a.status] ?? 99) - (order[b.status] ?? 99)
      return sortDirection === 'asc' ? diff : -diff
    })
  ), [peopleTransactions, sortDirection, sortField])

  const allTransactions = useMemo<AllTransactionRow[]>(() => {
    const peopleRows = peopleTransactions.map(transaction => ({
      id: transaction.id,
      type: 'People' as const,
      transaction: transaction.name,
      network: transaction.network,
      payees: String(transaction.members),
      amount: `${transaction.totalAmount} ${transaction.currency}`,
      status: transaction.status,
      payDay: transaction.executionDate,
      planId: null,
      raw: rawTransactions.find(item => item.id === transaction.id)!,
    }))
    const aiRows = aiTransactions.map(transaction => ({
      id: transaction.id,
      type: 'AI' as const,
      transaction: transaction.transactionName,
      network: transaction.network,
      payees: transaction.payees,
      amount: transaction.amount,
      status: transaction.status,
      payDay: transaction.payDay,
      planId: transaction.planId,
      rechargeId: transaction.rechargeId,
      raw: transaction.raw,
    }))

    return [...peopleRows, ...aiRows].sort((a, b) => {
      if (!sortField || !sortDirection) return new Date(b.payDay).getTime() - new Date(a.payDay).getTime()
      if (sortField === 'payDay') {
        const diff = new Date(a.payDay).getTime() - new Date(b.payDay).getTime()
        return sortDirection === 'asc' ? diff : -diff
      }
      const diff = String(a.status).localeCompare(String(b.status))
      return sortDirection === 'asc' ? diff : -diff
    })
  }, [aiTransactions, peopleTransactions, rawTransactions, sortDirection, sortField])

  const handleDepositClick = (transaction: Transaction) => {
    const plan = rawTransactions.find(item => item.id === transaction.id) ?? null
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
    await fetchTransactions(currentPage, statusFilter, debouncedSearch, transactionType)
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
      toast({ title: 'Success', description: 'Transaction deleted successfully' })
      setDeleteConfirmDialogOpen(false)
      setTransactionToDelete(null)
      const nextTotalCount = Math.max(0, totalCount - 1)
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / itemsPerPage))
      const nextPage = Math.min(currentPage, nextTotalPages)
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage)
      } else {
        await fetchTransactions(nextPage, statusFilter, debouncedSearch, transactionType)
      }
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
    handleStartCreateTransaction(`/orgs/transaction/create-people?fromReaction=1&transactionId=${encodeURIComponent(transactionId)}`)
  }

  const planHasUnclaimedItems = (plan: TransactionPlan) =>
    (plan.items ?? []).some(item => item.status !== 'claimed')

  const handleRefundClick = (transaction: Transaction) => {
    const plan = rawTransactions.find(item => item.id === transaction.id) ?? null
    setRefundingTransaction(transaction)
    setRefundingTransactionPlan(plan)
    setRefundDialogOpen(true)
  }

  const handleRefundSuccess = async (txHash: string) => {
    setRefundDialogOpen(false)
    setLastRefundTxHash(txHash)
    setRefundSuccessDialogOpen(true)
    await new Promise(r => setTimeout(r, 2000))
    await fetchTransactions(currentPage, statusFilter, debouncedSearch, transactionType)
  }

  const startIndex = visiblePeopleTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex = visiblePeopleTransactions.length === 0 ? 0 : startIndex + visiblePeopleTransactions.length - 1
  const aiStartIndex = aiTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const aiEndIndex = aiTransactions.length === 0 ? 0 : aiStartIndex + aiTransactions.length - 1

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
    { value: PayrollTransactionStatus.COMPLETE, label: 'Complete' },
    { value: PayrollTransactionStatus.REFUNDED, label: 'Refunded' },
  ]

  const actionGroupClassName = 'flex flex-wrap items-center gap-3'
  const actionPrimaryButtonClassName = 'whitespace-nowrap rounded-[12px] bg-[#5e85ee] px-[10px] py-[5px] text-[13px] text-white transition-opacity hover:bg-[#5e85ee]/90 disabled:cursor-not-allowed disabled:bg-[#d8def8] disabled:text-white disabled:hover:bg-[#d8def8]'
  const actionTextButtonClassName = 'whitespace-nowrap text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:text-[#b3b3b7] disabled:hover:opacity-100'
  const actionDangerButtonClassName = 'whitespace-nowrap text-[13px] text-[#d92b2b] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:text-[#d8a4a4] disabled:hover:opacity-100'

  const buildAiActionTransaction = (transaction: AiTransactionRow): Transaction => ({
    id: transaction.id,
    name: transaction.transactionName,
    transactionId: transaction.id,
    type: transaction.raw.transactionType,
    status: (transaction.status as Transaction['status']) || PayrollTransactionStatus.READY,
    executionDate: transaction.payDay ? formatLocalDateTime(transaction.payDay) : '-',
    daysRemaining: null,
    isDueToday: false,
    totalAmount: transaction.amount,
    currency: '',
    members: 1,
    network: transaction.network,
    isComplete: transaction.status === PayrollTransactionStatus.COMPLETE,
  })

  const renderPeopleActions = (transaction: Transaction, plan?: TransactionPlan | null) => {
    const isComplete = transaction.isComplete
    const canExecute = hasPermission(Permission.EXECUTE_TRANSACTION) && !isComplete && transaction.status !== PayrollTransactionStatus.REFUNDED
    const canDelete = hasPermission(Permission.MODIFY_TRANSACTION) && !isComplete

    return (
      <div className={actionGroupClassName}>
        <button
          className={actionPrimaryButtonClassName}
          onClick={() => handleDepositClick(transaction)}
          disabled={!canExecute}
        >
          Execute
        </button>
        <button
          className={actionTextButtonClassName}
          onClick={() => handleViewDetails(transaction)}
        >
          View Details
        </button>
        <button
          className={actionDangerButtonClassName}
          onClick={() => handleDeleteClick(transaction)}
          disabled={!canDelete}
        >
          Delete
        </button>
      </div>
    )
  }

  const renderAiActions = (transaction: AiTransactionRow) => {
    const rechargeId = transaction.rechargeId || transaction.id
    const isComplete = transaction.status === PayrollTransactionStatus.COMPLETE
    const canExecute = hasPermission(Permission.EXECUTE_TRANSACTION) && !isComplete && transaction.status !== PayrollTransactionStatus.REFUNDED
    const canDelete = hasPermission(Permission.MODIFY_TRANSACTION) && !isComplete

    return (
      <div className={actionGroupClassName}>
        <button
          className={actionPrimaryButtonClassName}
          onClick={() => handleDepositClick(buildAiActionTransaction(transaction))}
          disabled={!canExecute}
        >
          Execute
        </button>
        <button
          className={actionTextButtonClassName}
          onClick={() => navigate(`/orgs/members/usage-plans/${encodeURIComponent(rechargeId)}`)}
        >
          View Details
        </button>
        <button
          className={actionDangerButtonClassName}
          onClick={() => handleDeleteClick(buildAiActionTransaction(transaction))}
          disabled={!canDelete}
        >
          Delete
        </button>
      </div>
    )
  }

  const handleTabChange = (tab: TransactionsTab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (tab === 'all') next.delete('tab')
      else next.set('tab', tab)
      return next
    }, { replace: true })
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[16px]">
      <div className="flex h-full min-h-0 flex-col gap-[16px] rounded-[32px] bg-white p-[20px]">
        <TransactionTabsNav activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[36px] w-[260px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="flex-1 bg-transparent text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
              />
              <Search className="h-[16px] w-[16px] shrink-0 text-[#8d8d93]" />
            </div>

            {activeTab === 'people' && (
              <div className="relative">
                <button
                  onClick={() => setStatusDropdownOpen(v => !v)}
                  className="flex h-[36px] w-[130px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]"
                >
                  <span className={`text-[13px] leading-[20px] ${statusFilter === 'all' ? 'text-[#8d8d93]' : 'text-[#1c1c26]'}`}>
                    {STATUS_OPTIONS.find(option => option.value === statusFilter)?.label ?? 'Status'}
                  </span>
                  <ChevronDown className={`h-[16px] w-[16px] text-[#1c1c26] transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute left-0 top-full z-20 mt-[4px] w-[160px] overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg">
                    {STATUS_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setCurrentPage(1)
                          setStatusFilter(option.value)
                          setStatusDropdownOpen(false)
                        }}
                        className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] transition-colors hover:bg-[#f5f5f5] ${statusFilter === option.value ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-[10px]">
            {hasPermission(Permission.CREATE_TRANSACTION) && (
              <Button
                onClick={() => {
                  const defaultType = activeTab === 'people' ? '?type=people' : activeTab === 'ai' ? '?type=ai' : ''
                  navigate(`/orgs/transaction/create${defaultType}`)
                }}
              >
                <Plus className="h-[14px] w-[14px]" />
                New Transaction
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {activeTab === 'all' && <TableHead>Type</TableHead>}
                <TableHead>Transaction</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Payees</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>
                  <button onClick={() => handleSort('status')} className="flex items-center gap-[4px]">
                    Status <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => handleSort('payDay')} className="flex items-center gap-[4px]">
                    Pay Day (Local) <SortIcon field="payDay" />
                  </button>
                </TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || !isReady ? (
                <TableSkeletonRows rows={5} cols={activeTab === 'all' ? 8 : 7} />
              ) : activeTab === 'people' && visiblePeopleTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-[24px]">
                    <div className="flex flex-col items-center justify-center gap-[10px]">
                      <img src="/empty-table.svg" alt="No transactions" className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">No transactions found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : activeTab === 'ai' && aiTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-[24px]">
                    <div className="flex flex-col items-center justify-center gap-[10px]">
                      <img src="/empty-table.svg" alt="No AI purchases" className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">No AI API purchases found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : activeTab === 'all' && allTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-[24px]">
                    <div className="flex flex-col items-center justify-center gap-[10px]">
                      <img src="/empty-table.svg" alt="No transactions" className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">No transactions found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : activeTab === 'people' ? (
                visiblePeopleTransactions.map(transaction => {
                  const plan = rawTransactions.find(item => item.id === transaction.id) ?? null
                  return (
                    <TableRow key={transaction.id} className={cn('relative')}>
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
                        {renderPeopleActions(transaction, plan)}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : activeTab === 'ai' ? (
                aiTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.transactionName}</TableCell>
                    <TableCell>{transaction.network}</TableCell>
                    <TableCell>{transaction.payees}</TableCell>
                    <TableCell>{transaction.amount}</TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={transaction.status as PayrollTransactionStatus} />
                    </TableCell>
                    <TableCell>{transaction.payDay ? formatLocalDateTime(transaction.payDay) : '-'}</TableCell>
                    <TableCell>
                      {renderAiActions(transaction)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                allTransactions.map(row => (
                  <TableRow key={`${row.type}-${row.id}`}>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.transaction}</TableCell>
                    <TableCell>{row.network}</TableCell>
                    <TableCell>{row.payees}</TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={row.status as PayrollTransactionStatus} />
                    </TableCell>
                    <TableCell>{row.payDay ? formatLocalDateTime(row.payDay) : '-'}</TableCell>
                    <TableCell>
                      {row.type === 'People' ? (
                        renderPeopleActions(transformPeopleTransaction(row.raw), row.raw)
                      ) : (
                        renderAiActions(transformAiTransaction(row.raw))
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          summaryText={
            activeTab === 'people'
              ? (
                visiblePeopleTransactions.length === 0
                  ? `Showing 0 of ${totalCount} transactions`
                  : `Showing ${startIndex}-${endIndex} of ${totalCount} transactions`
              )
              : activeTab === 'ai'
                ? (
                  aiTransactions.length === 0
                    ? `Showing 0 of ${totalCount} transactions`
                    : `Showing ${aiStartIndex}-${aiEndIndex} of ${totalCount} transactions`
                )
                : `Showing ${allTransactions.length} of ${totalCount} transactions`
          }
          className="shrink-0"
        />

        <Dialog open={depositConfirmDialogOpen} onOpenChange={setDepositConfirmDialogOpen}>
          <DialogContent disableOutsideClose>
            <DialogTitle className="sr-only">Transaction Summary</DialogTitle>
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

        <Dialog open={depositSuccessDialogOpen} onOpenChange={setDepositSuccessDialogOpen}>
          <DialogContent className="max-w-2xl">
            <ExecuteSuccessDialogContent
              depositTxHash={lastDepositTxHash}
              executingTransaction={depositingTransaction}
              caipChainId={depositingTransactionPlan?.caipChainId}
              onClose={() => {
                setDepositSuccessDialogOpen(false)
                setDepositingTransaction(null)
                setLastDepositTxHash('')
              }}
            />
          </DialogContent>
        </Dialog>

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

        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent>
            <RefundConfirmDialogContent
              transaction={refundingTransaction}
              transactionPlan={refundingTransactionPlan}
              onCancel={() => {
                setRefundDialogOpen(false)
                setRefundingTransaction(null)
                setRefundingTransactionPlan(null)
              }}
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
            {lastRefundTxHash && (() => {
              const explorerUrl = getChain(refundingTransactionPlan?.caipChainId ?? '')?.explorerUrls?.[0]
              const txUrl = buildExplorerTransactionUrl(explorerUrl, lastRefundTxHash)
              return (
                <p className="mt-[16px] break-all text-[13px] text-[#606067]">
                  Tx:{' '}
                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#5e85ee] hover:underline"
                    >
                      {formatTransactionHash(lastRefundTxHash, true)}
                    </a>
                  ) : (
                    <span className="font-mono text-[#1c1c26]">{lastRefundTxHash}</span>
                  )}
                </p>
              )
            })()}
            <DialogFooter>
              <Button onClick={() => {
                setRefundSuccessDialogOpen(false)
                setRefundingTransaction(null)
                setLastRefundTxHash('')
              }}
              >
                Close
              </Button>
            </DialogFooter>
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

            {transactionToReaction && (
              <div className="mt-[16px] flex flex-col gap-[10px] rounded-[12px] bg-[#f5f5f5] p-[14px]">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#606067]">Transaction Name</span>
                  <span className="text-[13px] font-medium text-[#1c1c26]">{transactionToReaction.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#606067]">Transaction ID</span>
                  <span className="font-mono text-[13px] font-medium text-[#1c1c26]">{transactionToReaction.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#606067]">Payees</span>
                  <span className="text-[13px] font-medium text-[#1c1c26]">{transactionToReaction.members}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#606067]">Total Amount</span>
                  <span className="text-[13px] font-medium text-[#1c1c26]">
                    ${transactionToReaction.totalAmount} {transactionToReaction.currency}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PayrollSetupDialog
          open={payrollSetupDialogOpen}
          chainAssets={chainAssets}
          selectedChainId={selectedChainId}
          selectedToken={selectedToken}
          saving={savingPayrollSetup}
          onClose={closePayrollSetupDialog}
          onSave={handleSavePayrollSetup}
          onSelectedChainIdChange={setSelectedChainId}
          onSelectedTokenChange={setSelectedToken}
        />
      </div>
    </div>
  )
}
