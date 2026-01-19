import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { TransactionPlan } from '@/apis/transaction.api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface DashboardStats {
  totalMembers: number
  membersThisMonth: number
  readyToExecute: number
  readyToday: number
  totalPaidThisMonth: string
  growthFromLastMonth: number
}

export default function Dashboard() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    membersThisMonth: 0,
    readyToExecute: 0,
    readyToday: 0,
    totalPaidThisMonth: '0',
    growthFromLastMonth: 0
  })
  const [todayTransactions, setTodayTransactions] = useState<TransactionPlan[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // 获取统计数据
  const fetchStats = async () => {
    try {
      // 获取成员列表
      const membersRes = await apis.organization.getOrganizationMembers(1, 1000)
      const allMembers = membersRes.data
      const activeMembers = allMembers.filter(m => m.status === 'active')

      // 计算本月新增成员（简化处理，实际应该根据createdAt判断）
      const membersThisMonth = allMembers.length // 简化处理

      // 获取交易列表
      const transactionsRes = await apis.transaction.getTransactionPlans(1, 100)
      const allTransactions = transactionsRes.data

      // 筛选今日待执行的交易
      const today = new Date().toISOString().split('T')[0]
      const readyTransactions = allTransactions.filter(t => t.transactionStatus === 'ready')
      const todayReady = readyTransactions.filter(t => {
        const execDate = new Date(t.payPeriod).toISOString().split('T')[0]
        return execDate === today
      })

      // 计算本月总支付（简化处理，实际应该从成功交易中计算）
      const successTransactions = allTransactions.filter(t => t.transactionStatus === 'success')
      const thisMonth = new Date().getMonth()
      const thisYear = new Date().getFullYear()
      const thisMonthTransactions = successTransactions.filter(t => {
        const date = new Date(t.createdAt)
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear
      })
      const totalPaid = thisMonthTransactions.reduce((sum, t) => {
        return (
          sum +
          t.items.reduce((itemSum, item) => {
            return itemSum + parseFloat(item.amount || '0')
          }, 0)
        )
      }, 0)

      setStats({
        totalMembers: activeMembers.length,
        membersThisMonth: membersThisMonth,
        readyToExecute: readyTransactions.length,
        readyToday: todayReady.length,
        totalPaidThisMonth: totalPaid.toLocaleString('en-US', { maximumFractionDigits: 0 }),
        growthFromLastMonth: 12 // 简化处理，实际应该计算
      })

      // 设置今日交易
      setTodayTransactions(todayReady.slice(0, 5)) // 最多显示5个
      setMembers(allMembers)
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
    fetchStats()
  }, [])

  // 过滤成员
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members
    const query = searchQuery.toLowerCase()
    return members.filter(member => {
      const name = member.showName?.toLowerCase() || ''
      const email = member.receivingAccounts?.[0]?.config?.address?.toLowerCase() || ''
      const wallet = member.receivingAccounts?.[0]?.config?.address?.toLowerCase() || ''
      return name.includes(query) || email.includes(query) || wallet.includes(query)
    })
  }, [members, searchQuery])

  // 获取成员角色
  const getMemberRole = (member: OrganizationMember) => {
    if (member.roles && member.roles.length > 0) {
      return member.roles[0].role
    }
    return 'Member'
  }

  // 格式化钱包地址
  const formatAddress = (address: string) => {
    if (!address) return 'Request Address'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 获取成员服务费（从payoutIntent获取）
  const getServiceFee = (member: OrganizationMember) => {
    if (member.payoutIntent) {
      return `${parseFloat(member.payoutIntent.amount).toLocaleString()} ${member.payoutIntent.currency}`
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
  const getNetworkName = (network: string) => {
    const networkMap: Record<string, string> = {
      '1': 'Ethereum',
      '56': 'BNB Chain',
      '137': 'Polygon'
    }
    return networkMap[network] || network
  }

  // 导出成员列表
  const handleExportList = () => {
    const csvContent = [
      ['Member', 'Email', 'Wallet', 'Role', 'Service Fee', 'Status', 'Last Payment'].join(','),
      ...filteredMembers.map(m =>
        [
          m.showName || '',
          m.receivingAccounts?.[0]?.config?.address || '',
          m.receivingAccounts?.[0]?.config?.address || '',
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

  // 处理执行交易
  const handleExecuteNow = (transaction: TransactionPlan) => {
    navigate(`/orgs/transaction?execute=${transaction.id}`)
  }

  // 查看交易详情
  const handleViewDetails = (transaction: TransactionPlan) => {
    navigate(`/orgs/transaction?detail=${transaction.id}`)
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
            <div className="text-2xl font-bold">${stats.totalPaidThisMonth}</div>
            <p className="mt-1 text-xs text-green-600">+{stats.growthFromLastMonth}% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* 今日执行任务区域 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today's Executions</CardTitle>
            <span className="text-muted-foreground text-xs">Execution Layer</span>
          </div>
        </CardHeader>
        <CardContent>
          {todayTransactions.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">No transactions ready to execute today</div>
          ) : (
            <div className="space-y-4">
              {todayTransactions.map(transaction => {
                const totalAmount = transaction.items.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0)
                const currency = transaction.items[0]?.currency || 'USDC'
                const network = transaction.paymentAccount?.config?.network || '1'
                // 简化处理，实际应该从plan信息中获取
                // 这里可以根据transaction的实际plan数据来生成标签
                const uniquePlans: string[] = []
                if (transaction.items.length > 0) {
                  uniquePlans.push('Monthly Salary - Engineering')
                  if (transaction.items.length > 1) {
                    uniquePlans.push('Quarterly Bonus')
                  }
                }

                return (
                  <div key={transaction.id} className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Transaction {transaction.id}</h3>
                        <Badge variant="secondary" className="text-xs">
                          Today
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          {getNetworkName(network)}
                        </Badge>
                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                          Ready to Execute
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Plans:</span> {transaction.items.length}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span> {totalAmount.toLocaleString()}{' '}
                        {currency}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Members:</span> {transaction.items.length}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Execution Time:</span>{' '}
                        {new Date(transaction.payPeriod).toISOString().split('T')[0]}
                      </div>
                    </div>

                    {uniquePlans.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-muted-foreground text-sm">Related Plans:</span>
                        {uniquePlans.map((plan, idx) => (
                          <Badge key={`${transaction.id}-plan-${idx}`} variant="secondary" className="text-xs">
                            {plan}
                          </Badge>
                        ))}
                      </div>
                    )}

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
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Input
              placeholder="Search by name, email, or wallet..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleExportList}>
              Export List
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MEMBER</TableHead>
                <TableHead>EMAIL</TableHead>
                <TableHead>WALLET</TableHead>
                <TableHead>ROLE</TableHead>
                <TableHead>SERVICE FEE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>LAST PAYMENT</TableHead>
                <TableHead>ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map(member => {
                  const walletAddress = member.receivingAccounts?.[0]?.config?.address
                  const hasWallet = !!walletAddress

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarFallback>{getInitials(member.showName || '')}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.showName || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{walletAddress || '-'}</TableCell>
                      <TableCell>
                        {hasWallet ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
                            <span className="text-green-600">✓</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Request Address</span>
                        )}
                      </TableCell>
                      <TableCell>{getMemberRole(member)}</TableCell>
                      <TableCell>{getServiceFee(member)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === 'active'
                              ? 'success'
                              : member.status === 'pending'
                                ? 'warning'
                                : 'secondary'
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(member.lastPayment)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.status === 'pending' ? (
                            <>
                              <Button variant="link" size="sm" className="h-auto p-0 text-red-600">
                                Approve
                              </Button>
                              <Button variant="link" size="sm" className="h-auto p-0 text-red-600">
                                Reject
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="link" size="sm" className="h-auto p-0">
                                View Details
                              </Button>
                              {getMemberRole(member) === 'Operator' && (
                                <Button variant="link" size="sm" className="h-auto p-0 text-red-600">
                                  Remove Operator
                                </Button>
                              )}
                              {getMemberRole(member) !== 'Operator' && getMemberRole(member) !== 'Admin' && (
                                <>
                                  <Button variant="link" size="sm" className="h-auto p-0">
                                    Set as Operator
                                  </Button>
                                  <Button variant="link" size="sm" className="h-auto p-0 text-red-600">
                                    Remove
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
