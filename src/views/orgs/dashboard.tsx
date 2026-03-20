import apis from '@/apis'
import type { TokenAmount } from '@/apis/statistics.api'
import { TransactionListItem, TransactionPlan } from '@/apis/transaction.api'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { Permission, useHasPermission } from '@/utils/permissions'
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

import MembersView from '@/views/orgs/members'

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

  // 链上 deposit 成功后通知后端
  const handleDepositSuccess = async (txHash: string) => {
    if (!depositingTransaction) return
    try {
      await apis.transaction.confirmDeposit(depositingTransaction.id, txHash)
      setDepositConfirmDialogOpen(false)
      setLastDepositTxHash(txHash)
      setDepositSuccessDialogOpen(true)
      await fetchStats()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to confirm execute on server.',
        variant: 'destructive'
      })
    }
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
          <div className="bg-white rounded-[32px] p-[20px] text-[13px] text-[#8d8d93] text-center">
            No transactions ready to execute today
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

              // Status-driven colours
              const accentColor = isComplete ? '#5ddd22' : isPending ? '#ffa800' : '#5e85ee'
              const badgeBg = isComplete
                ? 'rgba(93,221,34,0.12)' : isPending
                  ? 'rgba(255,168,0,0.12)' : 'rgba(94,133,238,0.12)'
              const infoBg = isComplete
                ? 'rgba(93,221,34,0.04)' : isPending
                  ? 'rgba(255,168,0,0.04)' : 'rgba(94,133,238,0.04)'
              const statusLabel = isComplete ? 'Complete' : isPending ? 'Pending' : 'Ready'

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
                      <div
                        className="w-[fit-content] inline-flex items-center px-[8px] py-[2px] rounded-[8px] text-[12px] leading-[20px] whitespace-nowrap"
                        style={{ backgroundColor: badgeBg, color: accentColor }}
                      >
                        {statusLabel}
                      </div>
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

      {/* 团队成员列表 */}
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Team Members
        </p>
        <MembersView showInvite={false} />
      </div>
      {/* Execute 确认弹窗 */}
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

      {/* Execute 成功弹窗 */}
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

    </div>
  )
}
