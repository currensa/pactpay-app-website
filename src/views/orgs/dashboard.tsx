import apis from '@/apis'
import type { TokenAmount } from '@/apis/statistics.api'
import { TransactionListItem, TransactionPlan } from '@/apis/transaction.api'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { useTranslation } from '@/utils/i18n'
import { Permission, useHasPermission } from '@/utils/permissions'
import { OnboardingGuide } from '@/views/orgs/components/onboarding-guide'
import { TokenAmountStatCard, formatTokenAmountItem, getTokenAmountFontClass } from '@/views/orgs/components/token-amount-stat-card'
import {
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
} from '@/views/transaction/components'
import { TransactionStatusBadge } from '@/views/transaction/components/transaction-status-badge'
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
  const { language, t } = useTranslation()
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
  const [totalPaidIdx, setTotalPaidIdx] = useState(0)
  const [yearToDateIdx, setYearToDateIdx] = useState(0)
  const [thisMonthIdx, setThisMonthIdx] = useState(0)
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
    } catch {
      // request interceptor handles API errors
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
    <div className="flex flex-col gap-[16px] md:gap-[20px]">
      {/* 使用引导 */}
      <OnboardingGuide />

      {/* 顶部概览卡片 */}
      <div ref={dropdownRef} className="grid grid-cols-1 gap-[12px] md:gap-[20px] xl:grid-cols-4">
        {/* Total Members */}
        <div className="flex items-start justify-between rounded-[24px] bg-white p-[18px] md:p-[24px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[14px] leading-[22px] text-[#1c1c26]">{t('pages.orgDashboard.totalMembers')}</span>
            <span className="text-[24px] font-medium leading-[32px] text-[#1c1c26] md:text-[28px] md:leading-[40px]">
              {stats.totalMembers.toLocaleString()}
            </span>
          </div>
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-[#f5f5f5] md:h-[52px] md:w-[52px]">
            <Users size={26} className="text-[#1c1c26]" />
          </div>
        </div>

        {/* Total Paid / Year to Date / This Month — shared font size */}
        {(() => {
          const getItem = (items: TokenAmount[], idx: number) => items[Math.min(idx, Math.max(0, items.length - 1))]
          const fmt = (items: TokenAmount[], idx: number) => {
            const item = getItem(items, idx)
            return item ? formatTokenAmountItem(item) : '0'
          }
          const maxLen = Math.max(
            fmt(stats.totalPaid, totalPaidIdx).length,
            fmt(stats.yearToDate, yearToDateIdx).length,
            fmt(stats.thisMonth, thisMonthIdx).length,
          )
          const sharedFontClass = getTokenAmountFontClass(maxLen)
          return (
            <>
              <TokenAmountStatCard
                title={t('pages.orgDashboard.totalPaid')}
                items={stats.totalPaid}
                icon={DollarSign}
                dropdownKey="totalPaid"
                openDropdown={openDropdown}
                onOpenDropdown={setOpenDropdown}
                selectedIdx={totalPaidIdx}
                onSelectedIdxChange={setTotalPaidIdx}
                valueFontClass={sharedFontClass}
              />
              <TokenAmountStatCard
                title={t('pages.orgDashboard.yearToDate')}
                items={stats.yearToDate}
                icon={CreditCardIcon}
                dropdownKey="yearToDate"
                openDropdown={openDropdown}
                onOpenDropdown={setOpenDropdown}
                selectedIdx={yearToDateIdx}
                onSelectedIdxChange={setYearToDateIdx}
                valueFontClass={sharedFontClass}
              />
              <TokenAmountStatCard
                title={t('pages.orgDashboard.thisMonth')}
                items={stats.thisMonth}
                icon={Calendar}
                dropdownKey="thisMonth"
                openDropdown={openDropdown}
                onOpenDropdown={setOpenDropdown}
                selectedIdx={thisMonthIdx}
                onSelectedIdxChange={setThisMonthIdx}
                valueFontClass={sharedFontClass}
              />
            </>
          )
        })()}
      </div>

      {/* 今日执行任务区域 */}
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          {t('pages.orgDashboard.todaysExecutions')}
        </p>
        {todayTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-[12px] rounded-[24px] bg-white p-[20px] md:rounded-[32px]">
            <img src="/empty-data.svg" alt={t('pages.orgDashboard.noExecutionsAlt')} className="h-[120px] w-[120px]" />
            <p className="text-[13px] leading-[20px] text-[#8d8d93]">{t('pages.orgDashboard.noTransactionsToday')}</p>
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
              const payDate = (() => {
                const d = new Date(transaction.payPeriod)
                const date = d.toLocaleDateString(language).replace(/\//g, '/')
                const time = d.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false })
                return `${date} ${time}`
              })()
              const isComplete = transaction.transactionStatus === PayrollTransactionStatus.COMPLETE
              const isReady = transaction.transactionStatus === PayrollTransactionStatus.READY
              const isRefunded = transaction.transactionStatus === PayrollTransactionStatus.REFUNDED

              // Status-driven colours
              const accentColor = isComplete ? '#5ddd22' : isReady ? '#5e85ee' : isRefunded ? '#d92b2b' : '#606067'
              const infoBg = isComplete
                ? 'rgba(93,221,34,0.04)' : isReady
                  ? 'rgba(94,133,238,0.04)' : isRefunded
                    ? 'rgba(217,43,43,0.04)' : 'rgba(0,0,0,0.03)'
              return (
                <div key={transaction.id} className="relative flex flex-col gap-[16px] overflow-hidden rounded-[24px] bg-white p-[16px] md:rounded-[28px] md:p-[20px] xl:flex-row xl:items-start xl:gap-[24px]">
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-[18px] h-[20px] w-[4px] rounded-r-[100px] md:top-[22px]"
                    style={{ backgroundColor: accentColor }}
                  />

                  {/* Left panel */}
                  <div className="flex w-full flex-col items-start gap-[14px] pt-[2px] xl:w-[280px] xl:shrink-0 xl:self-stretch">
                    <div className="flex flex-col gap-[6px]">
                      {/* Status badge */}
                      <TransactionStatusBadge status={transaction.transactionStatus} />
                      {/* Name */}
                      <p className="text-[15px] font-bold leading-[22px] text-[#1c1c26]">
                        {transaction.transactionName || `Transaction ${transaction.id.slice(0, 8)}`}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-[10px]">
                      {!isComplete && hasPermission(Permission.EXECUTE_TRANSACTION) && (
                        <button
                          onClick={() => handleExecuteNow(transaction)}
                          className="rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[12px] leading-[18px] text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          {t('pages.orgDashboard.executeNow')}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/orgs/transaction/${transaction.id}`)
                          toast({ description: t('pages.orgDashboard.linkCopied') })
                        }}
                        className="rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[12px] leading-[18px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors flex items-center gap-[4px] whitespace-nowrap"
                      >
                        <Copy className="h-[12px] w-[12px]" />
                        {t('pages.orgDashboard.copyLink')}
                      </button>
                      <button
                        onClick={() => handleViewDetails(transaction)}
                        className="text-[12px] leading-[18px] text-[#5e85ee] hover:opacity-70 transition-opacity whitespace-nowrap"
                      >
                        {t('pages.orgDashboard.viewDetails')}
                      </button>
                    </div>
                  </div>

                  {/* Right info panel */}
                  <div
                    className="flex min-w-0 flex-1 flex-col gap-[10px] rounded-[20px] p-[16px] md:p-[20px]"
                    style={{ backgroundColor: infoBg }}
                  >
                    {/* Date + Network row */}
                    <div className="flex flex-col gap-[8px] sm:flex-row sm:items-center">
                      <div className="flex items-center gap-[4px]">
                        <CalendarDays className="h-[15px] w-[15px] text-[#606067] shrink-0" />
                        <span className="break-words text-[13px] leading-[20px] text-[#1c1c26]">{payDate}</span>
                      </div>
                      <div className="hidden h-[14px] w-px bg-[rgba(0,0,0,0.12)] sm:block" />
                      <div className="flex items-center gap-[4px]">
                        <Globe2 className="h-[15px] w-[15px] text-[#606067] shrink-0" />
                        <span className="break-words text-[13px] leading-[20px] text-[#1c1c26]">{networkName}</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-[14px] text-[13px] leading-[20px] flex-wrap">
                      <span>
                        <span className="text-[#8d8d93]">{t('pages.orgDashboard.members')}: </span>
                        <span className="text-[#1c1c26]">{transaction.items.length.toLocaleString()}</span>
                      </span>
                      <span>
                        <span className="text-[#8d8d93]">{t('pages.orgDashboard.amount')}: </span>
                        <span className="text-[#1c1c26]">{formattedAmount}{symbol ? ` ${symbol}` : ''}</span>
                      </span>
                    </div>

                    {/* Created date */}
                    <div className="text-[13px] leading-[20px]">
                      <span className="text-[#8d8d93]">{t('pages.orgDashboard.created')}: </span>
                      <span className="text-[#1c1c26]">
                        {new Date(transaction.createdAt).toLocaleDateString(language).replace(/\//g, '/')}
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
          <DialogTitle className="sr-only">{t('pages.orgDashboard.transactionSummary')}</DialogTitle>
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
