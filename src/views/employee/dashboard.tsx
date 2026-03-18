import apis from '@/apis'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { IconChartPie, IconCurrencyDollar, IconMoneybag } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'

// ─── Mock data ────────────────────────────────────────────────────────────────

interface ActivityItem {
  date: string
  organization: string
  amount: number
  token: string
  status: 'completed' | 'pending'
}

const activities: ActivityItem[] = [
  { date: '2025-11-19 16:12', organization: 'TechCorp Inc.', amount: 1500, token: 'USDC', status: 'pending' },
  { date: '2025-11-18 14:23', organization: 'TechCorp Inc.', amount: 5000, token: 'USDC', status: 'completed' },
  { date: '2025-11-15 09:45', organization: 'Digital Ventures', amount: 3200, token: 'USDT', status: 'completed' },
  { date: '2025-11-10 11:30', organization: 'Crypto Solutions Ltd', amount: 2800, token: 'USDC', status: 'completed' },
  { date: '2025-11-05 13:20', organization: 'Digital Ventures', amount: 4100, token: 'USDT', status: 'completed' },
  { date: '2025-10-28 10:15', organization: 'TechCorp Inc.', amount: 6000, token: 'USDC', status: 'completed' },
]

interface TokenItem { symbol: string; amount: number }
interface DistributionItem { name: string; value: number; color: string }

const claimedTokens: TokenItem[] = [
  { symbol: 'USDT', amount: 2000 },
  { symbol: 'USDC', amount: 2000 },
  { symbol: 'ETH', amount: 2000 },
  { symbol: 'BNB', amount: 500 },
  { symbol: 'SOL', amount: 300 },
]

const pendingTokens: TokenItem[] = [
  { symbol: 'USDT', amount: 2000 },
  { symbol: 'USDC', amount: 2000 },
  { symbol: 'ETH', amount: 2000 },
  { symbol: 'MATIC', amount: 800 },
]

const distributionData: DistributionItem[] = [
  { name: 'Crypto Solutions', value: 40, color: '#1c1c26' },
  { name: 'Restaur LtdDigital Ventures', value: 25, color: '#5e85ee' },
  { name: 'TechCorp Inc.', value: 20, color: '#ffa800' },
  { name: 'ant food', value: 10, color: '#c2d5fe' },
  { name: 'LtdDigital Ventures', value: 5, color: '#feeee2' },
]

// ─── Token icon ───────────────────────────────────────────────────────────────

const TOKEN_META: Record<string, { bg: string; label: string }> = {
  USDT: { bg: '#26a17b', label: 'T' },
  USDC: { bg: '#2775ca', label: 'C' },
  ETH: { bg: '#627eea', label: 'E' },
  BNB: { bg: '#f3ba2f', label: 'B' },
  SOL: { bg: '#9945ff', label: 'S' },
  MATIC: { bg: '#8247e5', label: 'M' },
}

function TokenIcon({ symbol }: { symbol: string }) {
  const meta = TOKEN_META[symbol] ?? { bg: '#8d8d93', label: symbol[0] }
  return (
    <div
      className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: meta.bg }}
    >
      <span className="text-[12px] font-bold text-white">{meta.label}</span>
    </div>
  )
}

// ─── Token row ────────────────────────────────────────────────────────────────

function TokenRow({ item }: { item: TokenItem }) {
  return (
    <div className="flex items-center justify-between bg-[#f5f5f5] rounded-[16px] px-[16px] py-[10px] w-full shrink-0">
      <div className="flex items-center gap-[6px]">
        <TokenIcon symbol={item.symbol} />
        <p className="text-[16px] leading-[24px] text-black">{item.symbol}</p>
      </div>
      <p className="text-[18px] leading-[28px] font-bold text-[#1c1c26]">
        {item.amount.toLocaleString()}
      </p>
    </div>
  )
}

// ─── Summary card (Claimed / Pending) ─────────────────────────────────────────

interface SummaryCardProps {
  title: string
  icon: React.ReactNode
  tokens: TokenItem[]
  claimButton?: React.ReactNode
}

function SummaryCard({ title, icon, tokens, claimButton }: SummaryCardProps) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? tokens : tokens.slice(0, 3)
  const hasMore = tokens.length > 3

  return (
    <div className="bg-white rounded-[24px] p-[20px] flex flex-1 flex-col gap-[16px] min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-[12px]">
          <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#f5f5f5]">
            {icon}
          </div>
          <p className="text-[15px] leading-[24px] text-[#1c1c26]">{title}</p>
        </div>
        {claimButton}
      </div>

      {/* Token list + Show All */}
      <div className="flex flex-col gap-[8px]">
        <div className={`h-[176px] flex flex-col gap-[10px] ${showAll ? 'overflow-y-auto pr-[4px]' : 'overflow-hidden'}`}>
          {(showAll ? tokens : tokens.slice(0, 3)).map(item => <TokenRow key={item.symbol} item={item} />)}
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-[14px] leading-[22px] text-[#5e85ee] text-left hover:opacity-80 transition-opacity"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ data }: { data: DistributionItem[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="relative shrink-0 h-[160px] w-[160px]" style={{ overflow: 'visible' }}>
      <PieChart width={160} height={160} style={{ overflow: 'visible' }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx={80}
          cy={80}
          innerRadius={46}
          outerRadius={72}
          startAngle={90}
          endAngle={-270}
          strokeWidth={2}
          stroke="#fff"
          cornerRadius={6}
          paddingAngle={2}
        >
          {data.map((item, i) => (
            <Cell key={i} fill={item.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value, name]}
          contentStyle={{ borderRadius: 8, fontSize: 12, backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
          wrapperStyle={{ zIndex: 50 }}
        />
      </PieChart>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 0 }}>
        <p className="text-[18px] leading-[28px] font-bold text-[#1c1c26]">{total.toLocaleString()}</p>
        <p className="text-[13px] leading-[20px] text-[#8d8d93]">Total</p>
      </div>
    </div>
  )
}

// ─── Income Distribution card ─────────────────────────────────────────────────

function IncomeDistributionCard({ data }: { data: DistributionItem[] }) {
  return (
    <div className="bg-white rounded-[24px] p-[20px] flex flex-1 flex-col gap-[16px] min-w-0 self-stretch">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-[12px]">
          <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#f5f5f5]">
            <IconChartPie className="h-[26px] w-[26px] text-[#1c1c26]" />
          </div>
          <p className="text-[15px] leading-[24px] text-[#1c1c26]">Income Distribution</p>
        </div>
        <p className="text-[14px] leading-[22px] text-[#606067]">Last 30 days</p>
      </div>

      {/* Chart + legend */}
      <div className="flex items-center gap-[24px]">
        <DonutChart data={data} />
        <div className="flex flex-1 flex-col gap-[10px] min-w-0 max-h-[160px] overflow-y-auto">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-[8px] shrink-0">
              <div className="h-[8px] w-[10px] shrink-0 rounded-[12px]" style={{ backgroundColor: item.color }} />
              <p className="text-[14px] leading-[22px] text-[#1c1c26] truncate">{item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
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
    <div className="flex flex-col gap-[24px]">
      {/* Summary Cards */}
      <div className="flex gap-[24px]">
        <SummaryCard
          title="Total Claimed"
          icon={<IconMoneybag className="h-[32px] w-[32px] text-[#1c1c26]" />}
          tokens={claimedTokens}
        />
        <SummaryCard
          title="Pending"
          icon={<IconCurrencyDollar className="h-[32px] w-[32px] text-[#1c1c26]" />}
          tokens={pendingTokens}
          claimButton={
            <button
              onClick={() => navigate('/employee/claim')}
              disabled={payrollLoading || pendingCount === 0}
              className="flex items-center justify-center rounded-[12px] bg-[#5e85ee] px-[14px] py-[10px] text-[14px] leading-[22px] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Claim all
            </button>
          }
        />
        <IncomeDistributionCard data={distributionData} />
      </div>

      {/* Data Summary */}
      <div>
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26] pb-[16px] ">Data Summary</p>
        <div className="bg-white rounded-[32px] p-[16px] flex flex-col gap-[16px]">
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
                      className="text-[#5e85ee] hover:underline cursor-pointer"
                    >
                      {activity.organization}
                    </button>
                  </TableCell>
                  <TableCell>{activity.amount.toLocaleString()}</TableCell>
                  <TableCell>{activity.token}</TableCell>
                  <TableCell>
                    <Badge variant={activity.status === 'completed' ? 'success' : 'warning'}>
                      {activity.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
