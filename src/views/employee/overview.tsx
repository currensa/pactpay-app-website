import apis from '@/apis'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { IconBuilding, IconCurrencyDollar, IconShieldCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface ActivityItem {
  date: string
  organization: string
  amount: number
  token: string
  status: 'completed' | 'pending'
}

const activities: ActivityItem[] = [
  {
    date: '2025-11-19 16:12',
    organization: 'TechCorp Inc.',
    amount: 1500,
    token: 'USDC',
    status: 'pending'
  },
  {
    date: '2025-11-18 14:23',
    organization: 'TechCorp Inc.',
    amount: 5000,
    token: 'USDC',
    status: 'completed'
  },
  {
    date: '2025-11-15 09:45',
    organization: 'Digital Ventures',
    amount: 3200,
    token: 'USDT',
    status: 'completed'
  },
  {
    date: '2025-11-10 11:30',
    organization: 'Crypto Solutions Ltd',
    amount: 2800,
    token: 'USDC',
    status: 'completed'
  },
  {
    date: '2025-11-05 13:20',
    organization: 'Digital Ventures',
    amount: 4100,
    token: 'USDT',
    status: 'completed'
  },
  {
    date: '2025-10-28 10:15',
    organization: 'TechCorp Inc.',
    amount: 6000,
    token: 'USDC',
    status: 'completed'
  }
]

interface DistributionData {
  name: string
  value: number
  color: string
}

const distributionData: DistributionData[] = [
  { name: 'TechCorp Inc.', value: 50, color: '#3b82f6' },
  { name: 'Digital Ventures', value: 30, color: '#a855f7' },
  { name: 'Crypto Solutions Ltd', value: 20, color: '#ec4899' }
]

function PieChart({ data }: { data: DistributionData[] }) {
  let currentAngle = -90
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const paths = data.map((item, index) => {
    const percentage = (item.value / total) * 100
    const angle = (percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle

    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const radius = 80
    const centerX = 100
    const centerY = 100

    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')

    currentAngle = endAngle

    return <path key={index} d={pathData} fill={item.color} stroke="white" strokeWidth="2" />
  })

  return (
    <div className="flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {paths}
      </svg>
    </div>
  )
}

/** 钱包签名 → 确定性 metaPrivKey（与 bind-wallet.tsx 保持完全一致） */
async function deriveMetaPrivKey(walletProvider: Provider, address: string): Promise<`0x${string}`> {
  const sig = await walletProvider.request<string>({
    method: 'personal_sign',
    params: ['PactPay MetaKey v1', address],
  }) as `0x${string}`
  return ethers.keccak256(ethers.getBytes(sig)) as `0x${string}`
}

export default function EmployeeOverview() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pendingCount, setPendingCount] = useState(0)
  const [payrollLoading, setPayrollLoading] = useState(false)

  useEffect(() => {
    loadPayrollItems()
  }, [])

  const loadPayrollItems = async () => {
    try {
      setPayrollLoading(true)
      const data = await apis.transaction.getMyPayrollItems({ status: 'pending', page: 1, pageSize: 1 })
      setPendingCount(data.total ?? 0)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load payroll items.',
        variant: 'destructive',
      })
    } finally {
      setPayrollLoading(false)
    }
  }

  const handleOrganizationClick = (organization: string) => {
    navigate('/employee/orgdetail', { state: { orgName: organization, orgId: '', memberId: '' } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
                <IconCurrencyDollar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$21,100.00</div>
            <CardDescription className="mt-1">All-time earnings</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/20">
                <IconCurrencyDollar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,500.00</div>
            <CardDescription className="mt-1">Awaiting confirmation</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">My Organizations</CardTitle>
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/20">
                <IconBuilding className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <CardDescription className="mt-1">Active organizations</CardDescription>
          </CardContent>
        </Card>

        {/* Claim Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Claimable Payroll</CardTitle>
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/20">
                <IconShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold">
                {payrollLoading ? '...' : pendingCount}
              </div>
              <CardDescription className="mt-1">Pending items</CardDescription>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => navigate('/employee/claim')}
              disabled={payrollLoading || pendingCount === 0}
            >
              {`Claim (${pendingCount})`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Income Distribution */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{activity.date}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleOrganizationClick(activity.organization)}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        {activity.organization}
                      </button>
                    </TableCell>
                    <TableCell>{activity.amount.toLocaleString()}</TableCell>
                    <TableCell>{activity.token}</TableCell>
                    <TableCell>
                      <Badge variant={activity.status === 'completed' ? 'success' : 'warning'}>{activity.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Income Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Income Distribution</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <PieChart data={distributionData} />
              <div className="flex flex-col gap-3">
                {distributionData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
