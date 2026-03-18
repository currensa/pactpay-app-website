import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { TransactionListItem, TransactionPlan } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { getStatusDisplayName, PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { getMemberRoles, getPrimaryRole, MemberRole } from '@/utils/permissions'
import {
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  TransactionDetailDialogContent,
} from '@/views/transaction/components'
import type { Transaction } from '@/views/transaction/components/types'
import { formatUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'

import MembersView from '@/views/orgs/members'

interface CurrencyPayment {
  symbol: string
  amount: string
  changePercentage: string
}

interface DashboardStats {
  totalMembers: number
  membersThisMonth: number
  readyToExecute: number
  readyToday: number
  currencyPayments: CurrencyPayment[]
}

export default function Dashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    membersThisMonth: 0,
    readyToExecute: 0,
    readyToday: 0,
    currencyPayments: []
  })
  const [todayTransactions, setTodayTransactions] = useState<TransactionListItem[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Execute 弹窗状态
  const [depositConfirmDialogOpen, setDepositConfirmDialogOpen] = useState(false)
  const [depositingTransaction, setDepositingTransaction] = useState<Transaction | null>(null)
  const [depositingTransactionPlan, setDepositingTransactionPlan] = useState<TransactionPlan | null>(null)
  const [depositSuccessDialogOpen, setDepositSuccessDialogOpen] = useState(false)
  const [lastDepositTxHash, setLastDepositTxHash] = useState('')

  // Transaction 详情弹窗状态
  const [transactionDetailDialogOpen, setTransactionDetailDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [transactionDetailMembers, setTransactionDetailMembers] = useState<any[]>([])

  // TODO: 从 context 或 store 获取当前用户角色
  const currentUserRoles: MemberRole[] = ['Owner']

  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const { getTokenSymbol, getTokenDecimals, fetchChains, getChain } = useChainAssetStore()

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const chainAssetStore = useChainAssetStore.getState()

      const [dashboardStats, membersRes, todayTransactionsRes] = await Promise.all([
        apis.statistics.getDashboardStatistics(),
        apis.organization.getOrganizationMembers({ page: 1, pageSize: 1000, status: 'active' }),
        apis.transaction.getReadyToExecuteTodayList(1, 5),
        chainAssetStore.fetchChainAssets()
      ])

      // 处理所有货币的支付统计
      const currencyPayments: CurrencyPayment[] = dashboardStats.paymentStatistics.currencies.map(currency => {
        // 获取 token symbol
        const tokenSymbol = chainAssetStore.getTokenSymbol(currency.caipChainId, currency.currency)
        const symbol = tokenSymbol || currency.currency.slice(0, 6).toUpperCase()

        // 获取 decimals 并转换金额
        const decimals = chainAssetStore.getTokenDecimals(currency.caipChainId, currency.currency)
        const rawAmount = Number(currency.totalPaidThisMonth)
        const convertedAmount = rawAmount / Math.pow(10, decimals)

        // 格式化显示：最多显示 6 位小数，但去掉末尾的 0
        const formatted = convertedAmount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        })

        return {
          symbol,
          amount: formatted,
          changePercentage: currency.changePercentage
        }
      })

      setStats({
        totalMembers: dashboardStats.memberStatistics.totalMembers,
        membersThisMonth: dashboardStats.memberStatistics.newMembersThisMonth,
        readyToExecute: dashboardStats.transactionStatistics.totalReady,
        readyToday: dashboardStats.transactionStatistics.readyToExecuteToday,
        currencyPayments
      })

      setTodayTransactions(todayTransactionsRes.data)
      setMembers(membersRes.data)
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

  // 过滤成员
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members
    const query = searchQuery.toLowerCase()
    return members.filter(member => {
      const name = member.showName?.toLowerCase() || ''
      const email = member.email?.toLowerCase() || ''
      return name.includes(query) || email.includes(query)
    })
  }, [members, searchQuery])

  // 获取成员角色(显示用)
  const getMemberRole = (member: OrganizationMember) => {
    const roles = getMemberRoles(member)
    return getPrimaryRole(roles)
  }

  // 格式化钱包地址
  const formatAddress = (address: string) => {
    if (!address) return '-'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 获取成员服务费（从 payoutIntent 获取）
  const getServiceFee = (member: OrganizationMember) => {
    const intent = member.payoutIntent
    if (intent) {
      return parseFloat(intent.amount).toLocaleString()
    }
    return '-'
  }

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toISOString().split('T')[0]
  }

  // 获取成员首字母
  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // 获取网络名称
  const getNetworkName = (caipChainId: string) => {
    const networkMap: Record<string, string> = {
      'eip155:1': 'Ethereum',
      'eip155:56': 'BNB Chain',
      'eip155:137': 'Polygon',
      'eip155:11155111': 'Sepolia'
    }
    return networkMap[caipChainId] || caipChainId
  }

  // 导出成员列表
  const handleExportList = () => {
    const csvContent = [
      ['Member', 'Email', 'Role', 'Service Fee', 'Status', 'Last Payment'].join(','),
      ...filteredMembers.map(m =>
        [
          m.showName || '',
          m.email || '',
          '',
          getMemberRole(m),
          getServiceFee(m),
          m.status,
          formatDate(m.lastPayment)
        ].join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `members-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
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
    const plan = transaction as unknown as TransactionPlan
    setSelectedTransaction(transformTransactionPlan(plan))
    setTransactionDetailMembers(plan.items)
    setTransactionDetailDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部概览卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="mt-1 text-xs text-green-600">+{stats.membersThisMonth} this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">Ready to Execute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyToExecute}</div>
            <p className="mt-1 text-xs text-green-600">{stats.readyToday} ready today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Paid (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.currencyPayments.length === 0 ? (
              <div className="text-muted-foreground text-sm">No payment data</div>
            ) : (
              <div className="space-y-2">
                {stats.currencyPayments.map((payment, idx) => (
                  <div key={idx}>
                    <div className="text-lg font-bold">
                      {payment.amount} <span className="text-sm font-normal text-muted-foreground">{payment.symbol}</span>
                    </div>
                    <p className="text-xs text-green-600">+{payment.changePercentage}% from last month</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 今日执行任务区域 */}
      <CardTitle>Today's Executions Section</CardTitle>
      <Card>
        <CardContent>
          {todayTransactions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">No transactions ready to execute today</div>
          ) : (
            <div className="space-y-4">
              {todayTransactions.map(transaction => {
                const chainAssetStore = useChainAssetStore.getState()
                const totalAmount = parseFloat(transaction.totalAmount)
                const decimals = chainAssetStore.getTokenDecimals(transaction.caipChainId, '')
                const convertedAmount = totalAmount / Math.pow(10, decimals)
                const formattedAmount = convertedAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })

                return (
                  <div key={transaction.id} className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{transaction.transactionName || `Transaction ${transaction.id}`}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(transaction.payPeriod).toISOString().split('T')[0]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          {getNetworkName(transaction.caipChainId)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            transaction.transactionStatus === PayrollTransactionStatus.READY
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : transaction.transactionStatus === PayrollTransactionStatus.PENDING
                                ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                          }
                        >
                          {getStatusDisplayName(transaction.transactionStatus)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Members:</span> {transaction.items.length}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span> {formattedAmount}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span> {transaction.transactionType}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>{' '}
                        {new Date(transaction.createdAt).toISOString().split('T')[0]}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleExecuteNow(transaction)} className="flex-1">
                        Execute Now
                      </Button>
                      <Button variant="outline" onClick={() => handleViewDetails(transaction)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 团队成员列表 */}
      <CardTitle>Team Members</CardTitle>
      <Card>
        <CardContent>
          <MembersView showInvite={false} />
        </CardContent>
      </Card>
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

      {/* Transaction 详情弹窗 */}
      <Dialog open={transactionDetailDialogOpen} onOpenChange={setTransactionDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <TransactionDetailDialogContent
            selectedTransaction={selectedTransaction}
            transactionDetailMembers={transactionDetailMembers}
            onExecuteNow={() => { }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
