import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { IconArrowUp, IconDownload, IconExternalLink } from '@tabler/icons-react'
import { useState } from 'react'
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// 交易支付趋势数据
const transactionTrendData = [
  { date: '07/15', name: 'Monthly Salary - Jul', amount: 25.0 },
  { date: '07/22', name: 'Weekly Bonus 01', amount: 5.0 },
  { date: '08/15', name: 'Monthly Salary - Aug', amount: 26.5 },
  { date: '08/28', name: 'Referral Bonus', amount: 3.2 },
  { date: '09/15', name: 'Monthly Salary - Sep', amount: 27.0 },
  { date: '10/15', name: 'Monthly Salary - Oct', amount: 26.0 },
  { date: '10/30', name: 'Q3 Incentive', amount: 15.0 },
  { date: '11/15', name: 'Monthly Salary - Nov', amount: 28.5 },
  { date: '12/15', name: 'Monthly Salary - Dec', amount: 29.0 },
  { date: '12/25', name: 'Year-end Bonus', amount: 45.0 }
]

// 最近交易详情数据
const recentTransactions = [
  {
    id: '1',
    name: 'Year-end Bonus',
    executionDate: '2024-12-25',
    amount: 45000,
    currency: 'USDC',
    members: 25
  }
]

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'time' | 'transaction'>('transaction')
  const [period, setPeriod] = useState('last12months')

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-1 border-b">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('time')}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'time'
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            By Time
          </button>
          <button
            onClick={() => setActiveTab('transaction')}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'transaction'
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            By Transaction
          </button>
        </div>
        <Button variant="outline" className="mb-1">
          <IconDownload className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Period:</span>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last12months">Last 12 Months</SelectItem>
            <SelectItem value="last6months">Last 6 Months</SelectItem>
            <SelectItem value="last3months">Last 3 Months</SelectItem>
            <SelectItem value="thisyear">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      {activeTab === 'transaction' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">124</div>
              <p className="mt-2 flex items-center gap-1 text-sm text-green-600">
                <IconArrowUp className="h-4 w-4" />
                12 new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">Avg. Transactions per Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">10.3</div>
              <p className="text-muted-foreground mt-2 text-sm">- Consistent frequency</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Payout Trend Chart */}
      {activeTab === 'transaction' && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Payout Trend (Per Transaction Node)</CardTitle>
            <CardDescription className="text-xs">
              Line shows amount variation across individual transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transactionTrendData}>
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide={true} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-background rounded-lg border p-3 shadow-md">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-muted-foreground text-sm">${data.amount}k</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Transaction Details Table */}
      {activeTab === 'transaction' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TRANSACTION NAME</TableHead>
                  <TableHead>EXECUTION DATE</TableHead>
                  <TableHead>AMOUNT</TableHead>
                  <TableHead>MEMBERS</TableHead>
                  <TableHead>ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.name}</TableCell>
                    <TableCell>{transaction.executionDate}</TableCell>
                    <TableCell>
                      ${transaction.amount.toLocaleString()} {transaction.currency}
                    </TableCell>
                    <TableCell>{transaction.members} members</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8">
                        View Details
                        <IconExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* By Time View */}
      {activeTab === 'time' && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">Total Payout Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$1,260,400.00</div>
                <p className="mt-2 flex items-center gap-1 text-sm text-green-600">
                  <IconArrowUp className="h-4 w-4" />
                  15.2% vs last year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">Avg. Monthly Payout</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$105,033.00</div>
                <p className="text-muted-foreground mt-2 text-sm">- Stable Trend</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm font-medium">Avg. Payout per Member</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$22,916.36</div>
                <p className="mt-2 flex items-center gap-1 text-sm text-green-600">
                  <IconArrowUp className="h-4 w-4" />
                  4.2% increase
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Payout Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payout Distribution (Annual View)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { month: 'Jan', amount: 95 },
                    { month: 'Feb', amount: 98 },
                    { month: 'Mar', amount: 102 },
                    { month: 'Apr', amount: 105 },
                    { month: 'May', amount: 108 },
                    { month: 'Jun', amount: 110 },
                    { month: 'Jul', amount: 112 },
                    { month: 'Aug', amount: 115 },
                    { month: 'Sep', amount: 118 },
                    { month: 'Oct', amount: 120 },
                    { month: 'Nov', amount: 115 },
                    { month: 'Dec', amount: 125 }
                  ]}
                >
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide={true} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-md">
                            <div className="h-3 w-3 shrink-0 rounded bg-[#3b82f6]" />
                            <span className="text-muted-foreground text-sm">{data.month}</span>
                            <span className="text-sm font-semibold">${data.amount}k</span>
                          </div>
                        )
                      }
                      return null
                    }}
                    cursor={false}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: '#3b82f6', opacity: 1 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MONTH</TableHead>
                    <TableHead>TOTAL PAYOUT</TableHead>
                    <TableHead>TRANSACTION COUNT</TableHead>
                    <TableHead>UNIQUE MEMBERS</TableHead>
                    <TableHead>STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Dec 2024</TableCell>
                    <TableCell>$125,400.00 USDC</TableCell>
                    <TableCell>14</TableCell>
                    <TableCell>55</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Complete
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Nov 2024</TableCell>
                    <TableCell>$115,000.00 USDC</TableCell>
                    <TableCell>12</TableCell>
                    <TableCell>52</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Complete
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Oct 2024</TableCell>
                    <TableCell>$95,000.00 USDC</TableCell>
                    <TableCell>8</TableCell>
                    <TableCell>46</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Complete
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
