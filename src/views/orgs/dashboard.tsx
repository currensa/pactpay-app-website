import apis from '@/apis'
import type { TokenAmount } from '@/apis/statistics.api'
import { TransactionListItem, TransactionPlan } from '@/apis/transaction.api'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { TransactionStatusBadge } from '@/components/ui/transaction-status-badge'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { Permission, useHasPermission } from '@/utils/permissions'
import { OnboardingGuide } from '@/views/orgs/components/onboarding-guide'
import { TokenAmountStatCard } from '@/views/orgs/components/token-amount-stat-card'
import {
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
} from '@/views/transaction/components'
import type { Transaction } from '@/views/transaction/components/types'
import { formatUnits } from 'ethers'
import { Calendar, CalendarDays, Copy, CreditCard as CreditCardIcon, DollarSign, Globe2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'


interface DashboardStats {
  totalMembers: number
  totalPaid: TokenAmount[]
  yearToDate: TokenAmount[]
  thisMonth: TokenAmount[]
}

export default function Dashboard() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const hasPermission = useHasPermission()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalPaid: [],
    yearToDate: [],
    thisMonth: [],
  })
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [todayTransactions, setTodayTransactions] = useState<TransactionListItem[]>([])

  // Execute 弹窗状态
  const [depositConfirmDialogOpen, setDepositConfirmDialogOpen] = useState(false)
  const [depositingTransaction, setDepositingTransaction] = useState<Transaction | null>(null)
  const [depositingTransactionPlan, setDepositingTransactionPlan] = useState<TransactionPlan | null>(null)
  const [depositSuccessDialogOpen, setDepositSuccessDialogOpen] = useState(false)
  const [lastDepositTxHash, setLastDepositTxHash] = useState('')

  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const { getTokenSymbol, getTokenDecimals, fetchChains, getChain } = useChainAssetStore()

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const chainAssetStore = useChainAssetStore.getState()

      const [dashboardStats, todayTransactionsRes] = await Promise.all([
        apis.statistics.getDashboardStatistics(),
        apis.transaction.getReadyToExecuteTodayList(1, 5),
        chainAssetStore.fetchChainAssets()
      ])

      setStats({
        totalMembers: dashboardStats.totalMembers,
        totalPaid: dashboardStats.totalPaid ?? [],
        yearToDate: dashboardStats.yearToDate ?? [],
        thisMonth: dashboardStats.thisMonth ?? [],
      })

      setTodayTransactions(todayTransactionsRes.data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      await fetchChains()
      await fetchPayrollTokenSymbol()
      await fetchStats()
    }
    init()
  }, [])

  useEffect(() => {
    if (!openDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])
  // 获取网络名称
  const getNetworkName = (caipChainId: string) => {
    const chain = getChain(caipChainId)
    return chain?.name
  }
  // 将 TransactionPlan 转换为 Transaction 类型
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
      || plan.transactionStatus === PayrollTransactionStatus.CLAIMED
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

  // 处理执行交易
  const handleExecuteNow = (transaction: TransactionListItem) => {
    const plan = transaction as unknown as TransactionPlan
    setDepositingTransaction(transformTransactionPlan(plan))
    setDepositingTransactionPlan(plan)
    setDepositConfirmDialogOpen(true)
  }

  const handleDepositSuccess = async (txHash: string) => {
    if (!depositingTransaction) return
    setDepositConfirmDialogOpen(false)
    setLastDepositTxHash(txHash)
    setDepositSuccessDialogOpen(true)
    await new Promise(r => setTimeout(r, 2000))
    await fetchStats()
  }

  // 查看交易详情
  const handleViewDetails = (transaction: TransactionListItem) => {
    navigate(`/orgs/transaction/${transaction.id}`)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* 使用引导 */}
      <OnboardingGuide />

      {/* 顶部概览卡片 */}
      <div ref={dropdownRef} className="flex gap-[20px]">
        {/* Total Members */}
        <div className="flex flex-1 items-start justify-between bg-white rounded-[24px] p-[24px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[14px] leading-[22px] text-[#1c1c26]">Total Members</span>
            <span className="text-[28px] font-medium leading-[40px] text-[#1c1c26]">
              {stats.totalMembers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-center w-[52px] h-[52px] bg-[#f5f5f5] rounded-[14px] shrink-0">
            <Users size={26} className="text-[#1c1c26]" />
          </div>
        </div>

        {/* Total Paid */}
        <TokenAmountStatCard
          title="Total Paid"
          items={stats.totalPaid}
          icon={DollarSign}
          dropdownKey="totalPaid"
          openDropdown={openDropdown}
          onOpenDropdown={setOpenDropdown}
        />

        {/* Year to Date */}
        <TokenAmountStatCard
          title="Year to Date"
          items={stats.yearToDate}
          icon={CreditCardIcon}
          dropdownKey="yearToDate"
          openDropdown={openDropdown}
          onOpenDropdown={setOpenDropdown}
        />

        {/* This Month */}
        <TokenAmountStatCard
          title="This Month"
          items={stats.thisMonth}
          icon={Calendar}
          dropdownKey="thisMonth"
          openDropdown={openDropdown}
          onOpenDropdown={setOpenDropdown}
        />
      </div>

      {/* 今日执行任务区域 */}
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Today's Executions
        </p>
        {todayTransactions.length === 0 ? (
          <div className="bg-white rounded-[32px] p-[20px] flex flex-col items-center justify-center gap-[12px]">
            <img src="/empty-data.svg" alt="No executions" className="h-[120px] w-[120px]" />
            <p className="text-[13px] leading-[20px] text-[#8d8d93]">No transactions ready to execute today</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {todayTransactions.map(transaction => {
              const store = useChainAssetStore.getState()
              const decimals = store.getTokenDecimals(transaction.caipChainId, transaction.tokenAddress || '')
              const symbol = store.getTokenSymbol(transaction.caipChainId, transaction.tokenAddress || '') || ''
              const formattedAmount = (() => {
                try {
                  return parseFloat(formatUnits(BigInt(transaction.totalAmount || '0'), decimals))
                    .toLocaleString('en-US', { maximumFractionDigits: 6 })
                } catch { return '0' }
              })()
              const networkName = getNetworkName(transaction.caipChainId) || transaction.caipChainId
              const payDate = new Date(transaction.payPeriod)
                .toLocaleDateString('zh-CN').replace(/\//g, '/')
              const isComplete = transaction.transactionStatus === PayrollTransactionStatus.COMPLETE
              const isPending = transaction.transactionStatus === PayrollTransactionStatus.PENDING
              const isClaimed = transaction.transactionStatus === PayrollTransactionStatus.CLAIMED
              const isRefunded = transaction.transactionStatus === PayrollTransactionStatus.REFUNDED

              // Status-driven colours
              const accentColor = isClaimed ? '#22a106' : isComplete ? '#5ddd22' : isPending ? '#5e85ee' : isRefunded ? '#d92b2b' : '#606067'
              const infoBg = isClaimed
                ? 'rgba(34,161,6,0.04)' : isComplete
                  ? 'rgba(93,221,34,0.04)' : isPending
                    ? 'rgba(94,133,238,0.04)' : isRefunded
                      ? 'rgba(217,43,43,0.04)' : 'rgba(0,0,0,0.03)'
              return (
                <div key={transaction.id} className="relative bg-white rounded-[28px] p-[20px] flex gap-[24px] items-start overflow-hidden">
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-[22px] w-[4px] h-[20px] rounded-r-[100px]"
                    style={{ backgroundColor: accentColor }}
                  />

                  {/* Left panel */}
                  <div className="flex flex-col gap-[14px] items-start shrink-0 w-[280px] self-stretch pt-[2px]">
                    <div className="flex flex-col gap-[6px]">
                      {/* Status badge */}
                      <TransactionStatusBadge status={transaction.transactionStatus} />
                      {/* Name */}
                      <p className="text-[15px] font-bold leading-[22px] text-[#1c1c26]">
                        {transaction.transactionName || `Transaction ${transaction.id.slice(0, 8)}`}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-[10px]">
                      {!isComplete && hasPermission(Permission.EXECUTE_TRANSACTION) && (
                        <button
                          onClick={() => handleExecuteNow(transaction)}
                          className="rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[12px] leading-[18px] text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          Execute Now
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/orgs/transaction/${transaction.id}`)
                          toast({ description: 'Link copied.' })
                        }}
                        className="rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[12px] leading-[18px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors flex items-center gap-[4px] whitespace-nowrap"
                      >
                        <Copy className="h-[12px] w-[12px]" />
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleViewDetails(transaction)}
                        className="text-[12px] leading-[18px] text-[#5e85ee] hover:opacity-70 transition-opacity whitespace-nowrap"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Right info panel */}
                  <div
                    className="flex-1 min-w-0 rounded-[20px] p-[20px] flex flex-col gap-[10px]"
                    style={{ backgroundColor: infoBg }}
                  >
                    {/* Date + Network row */}
                    <div className="flex items-center gap-[8px]">
                      <div className="flex items-center gap-[4px]">
                        <CalendarDays className="h-[15px] w-[15px] text-[#606067] shrink-0" />
                        <span className="text-[13px] leading-[20px] text-[#1c1c26]">{payDate}</span>
                      </div>
                      <div className="w-px h-[14px] bg-[rgba(0,0,0,0.12)]" />
                      <div className="flex items-center gap-[4px]">
                        <Globe2 className="h-[15px] w-[15px] text-[#606067] shrink-0" />
                        <span className="text-[13px] leading-[20px] text-[#1c1c26]">{networkName}</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-[14px] text-[13px] leading-[20px] flex-wrap">
                      <span>
                        <span className="text-[#8d8d93]">Members: </span>
                        <span className="text-[#1c1c26]">{transaction.items.length.toLocaleString()}</span>
                      </span>
                      <span>
                        <span className="text-[#8d8d93]">Amount: </span>
                        <span className="text-[#1c1c26]">{formattedAmount}{symbol ? ` ${symbol}` : ''}</span>
                      </span>
                    </div>

                    {/* Created date */}
                    <div className="text-[13px] leading-[20px]">
                      <span className="text-[#8d8d93]">Created: </span>
                      <span className="text-[#1c1c26]">
                        {new Date(transaction.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '/')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Execute 确认弹窗 */}
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

      {/* Execute 成功弹窗 */}
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

    </div>
  )
}
