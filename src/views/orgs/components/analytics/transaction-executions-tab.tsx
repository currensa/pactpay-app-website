import apis from '@/apis'
import type { TransactionPlansResponse } from '@/apis/transaction.api'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { getStatusDisplayName, PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import { Permission, useHasPermission } from '@/utils/permissions'
import { TransactionStatusBadge } from '@/views/transaction/components/transaction-status-badge'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  escapeCsvValue,
  EXECUTIONS_PAGE_SIZE,
  formatPlanTokenAmount,
  formatUtcDateTime,
  getTransactionPlanName,
} from './analytics-utils'
import { AnalyticsExportButton, AnalyticsTopBar, MessageState } from './shared'

function TransactionExecutionsLoadingState() {
  return (
    <div className="rounded-[32px] bg-white p-[24px]">
      <div className="space-y-[18px]">
        <div className="h-[22px] w-full animate-pulse rounded-[8px] bg-[#f5f5f5]" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-[66px] animate-pulse rounded-[12px] bg-[#fafafa]" />
        ))}
        <div className="flex items-center justify-between pt-[8px]">
          <div className="h-[20px] w-[220px] animate-pulse rounded-[8px] bg-[#f5f5f5]" />
          <div className="h-[36px] w-[220px] animate-pulse rounded-[18px] bg-[#f5f5f5]" />
        </div>
      </div>
    </div>
  )
}

function buildExecutionPaginationItems(currentPage: number, totalPages: number) {
  const pages: Array<number | 'ellipsis'> = []
  const maxVisible = 5

  if (totalPages <= maxVisible) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  pages.push(1)

  if (currentPage <= 3) {
    pages.push(2, 3)
    pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  if (currentPage >= totalPages - 2) {
    pages.push('ellipsis')
    pages.push(totalPages - 2, totalPages - 1, totalPages)
    return pages
  }

  pages.push('ellipsis')
  pages.push(currentPage)
  pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

function TransactionExecutionsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-[4px]">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] text-[#606067] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-[18px] w-[18px]" />
      </button>

      {buildExecutionPaginationItems(currentPage, totalPages).map((item, index) => {
        if (item === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="flex h-[36px] w-[36px] items-center justify-center text-[14px] leading-[22px] text-[#606067]">
              ...
            </span>
          )
        }

        const isActive = item === currentPage

        return (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`flex h-[36px] w-[36px] items-center justify-center rounded-[12px] text-[14px] leading-[22px] text-[#606067] transition-colors hover:bg-[#f5f5f5] ${isActive ? 'bg-[rgba(28,28,38,0.1)] text-[#1c1c26]' : ''}`}
          >
            {item}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] text-[#606067] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}

export function TransactionExecutionsTab({ tabsNav }: { tabsNav: ReactNode }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const hasPermission = useHasPermission()
  const canViewExecutions = hasPermission(Permission.VIEW_HISTORY)
  const { fetchChainAssets, fetchChains, getTokenDecimals, getTokenSymbol } = useChainAssetStore()

  const [executionPlans, setExecutionPlans] = useState<TransactionPlansResponse | null>(null)
  const [executionsLoading, setExecutionsLoading] = useState(false)
  const [executionsErrorMessage, setExecutionsErrorMessage] = useState<string | null>(null)
  const [executionsPage, setExecutionsPage] = useState(1)
  const [executionsSortDirection, setExecutionsSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    let cancelled = false

    if (!canViewExecutions) {
      setExecutionsLoading(false)
      setExecutionsErrorMessage('You do not have permission to view transaction execution history.')
      setExecutionPlans(null)
      return
    }

    async function load() {
      try {
        setExecutionsLoading(true)
        setExecutionsErrorMessage(null)

        await Promise.all([fetchChainAssets(), fetchChains()])
        const response = await apis.transaction.getTransactionPlans(
          executionsPage,
          EXECUTIONS_PAGE_SIZE,
          PayrollTransactionStatus.COMPLETE
        )

        if (cancelled) return
        setExecutionPlans(response)
      } catch {
        if (cancelled) return
        setExecutionsErrorMessage('Unable to load completed transaction executions right now.')
        setExecutionPlans(null)
      } finally {
        if (!cancelled) {
          setExecutionsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [canViewExecutions, executionsPage, fetchChainAssets, fetchChains])

  const executionRows = useMemo(() => {
    const rows = (executionPlans?.data ?? []).map(plan => {
      const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress || '')
      const symbol = getTokenSymbol(plan.caipChainId, plan.tokenAddress || '')
        || plan.tokenAddress?.slice(0, 6).toUpperCase()
        || 'TOKEN'
      const totalAmount = formatPlanTokenAmount(plan.totalAmount || '0', decimals)
      const name = getTransactionPlanName(plan)
      const payDayTimestamp = new Date(plan.payPeriod).getTime()

      return {
        id: plan.id,
        name,
        membersCount: plan.items.length,
        amountLabel: `${totalAmount} ${symbol}`,
        payDayLabel: formatUtcDateTime(plan.payPeriod),
        payDayTimestamp: Number.isNaN(payDayTimestamp) ? 0 : payDayTimestamp,
        status: plan.transactionStatus,
      }
    })

    return [...rows].sort((left, right) =>
      executionsSortDirection === 'asc'
        ? left.payDayTimestamp - right.payDayTimestamp
        : right.payDayTimestamp - left.payDayTimestamp
    )
  }, [executionPlans, executionsSortDirection, getTokenDecimals, getTokenSymbol])

  const handleExport = () => {
    if (executionRows.length === 0) {
      toast({ description: 'No completed transaction executions are available to export.' })
      return
    }

    const rows = [
      ['Transaction', 'Members', 'Amount', 'Status', 'Pay Day', 'Transaction ID'],
      ...executionRows.map(item => [
        item.name,
        item.membersCount,
        item.amountLabel,
        getStatusDisplayName(item.status),
        item.payDayLabel,
        item.id,
      ]),
    ]

    const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `analytics-transaction-executions-page-${executionsPage}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderContent = () => {
    if (!canViewExecutions) {
      return (
        <MessageState
          title="Access restricted"
          description="You do not have permission to view transaction execution history."
        />
      )
    }

    if (executionsLoading) {
      return <TransactionExecutionsLoadingState />
    }

    if (executionsErrorMessage) {
      return <MessageState title="Unable to load transaction executions" description={executionsErrorMessage} />
    }

    if (!executionPlans || executionRows.length === 0) {
      return (
        <MessageState
          title="No completed transaction executions"
          description="Completed transactions will appear here once they have been executed."
        />
      )
    }

    const totalPages = Math.max(1, Math.ceil(executionPlans.total / EXECUTIONS_PAGE_SIZE))
    const startIndex = (executionPlans.page - 1) * executionPlans.pageSize + 1
    const endIndex = Math.min(startIndex + executionRows.length - 1, executionPlans.total)
    const PayDaySortIcon = executionsSortDirection === 'asc' ? ChevronUp : ChevronDown

    return (
      <div className="rounded-[32px] bg-white p-[24px]">
        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
                <TableHead className="h-auto w-[240px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Transaction</TableHead>
                <TableHead className="h-auto w-[120px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Members</TableHead>
                <TableHead className="h-auto w-[120px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Amount</TableHead>
                <TableHead className="h-auto w-[90px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Status</TableHead>
                <TableHead className="h-auto w-[120px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">
                  <button
                    type="button"
                    className="inline-flex items-center gap-[4px] text-[14px] font-normal text-[#8d8d93]"
                    onClick={() => setExecutionsSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')}
                  >
                    Pay Day
                    <PayDaySortIcon className="h-[14px] w-[14px]" />
                  </button>
                </TableHead>
                <TableHead className="h-auto px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executionRows.map(item => (
                <TableRow key={item.id} className="h-[66px] border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
                  <TableCell className="w-[240px] px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                    <span className="block max-w-[220px] truncate">{item.name}</span>
                  </TableCell>
                  <TableCell className="w-[120px] px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                    {item.membersCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="w-[160px] px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                    {item.amountLabel}
                  </TableCell>
                  <TableCell className="w-[160px] px-0 py-[16px]">
                    <TransactionStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="w-[200px] px-0 py-[16px] text-[16px] leading-[24px] text-[#1c1c26]">
                    {item.payDayLabel}
                  </TableCell>
                  <TableCell className="px-0 py-[16px]">
                    <button
                      type="button"
                      className="text-[14px] leading-[22px] text-[#5e85ee] transition-opacity hover:opacity-70"
                      onClick={() => navigate(`/orgs/transaction/${item.id}`)}
                    >
                      View Details
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-[24px] flex flex-col gap-[16px] md:flex-row md:items-center md:justify-between">
          <p className="text-[14px] leading-[22px] text-[#606067]">
            Showing {startIndex}-{endIndex} of {executionPlans.total} transactions
          </p>

          <TransactionExecutionsPagination
            currentPage={executionPlans.page}
            totalPages={totalPages}
            onPageChange={setExecutionsPage}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px] pb-[24px]">
      <AnalyticsTopBar tabsNav={tabsNav} actions={<AnalyticsExportButton onClick={handleExport} />} />
      {renderContent()}
    </div>
  )
}
