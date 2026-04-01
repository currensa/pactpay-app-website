import apis from '@/apis'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import { PayrollHistoryTable } from '@/views/member/components/payroll-history-table'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconChartPie, IconCurrencyDollar, IconLoader2, IconMoneybag } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'

interface TokenItem { symbol: string; amount: number; iconUrl?: string | null }
interface DistributionItem { name: string; value: number; color: string; caipChainId: string; tokenAddress: string; rawAmount: number }

const DISTRIBUTION_COLORS = ['#1c1c26', '#5e85ee', '#ffa800', '#c2d5fe', '#feeee2', '#8247e5', '#26a17b']

// ─── Token icon ───────────────────────────────────────────────────────────────

function TokenIcon({ symbol, iconUrl }: { symbol: string; iconUrl?: string | null }) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={symbol}
        className="h-[32px] w-[32px] shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <div
      className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#8d8d93]"
    >
      <span className="text-[12px] font-bold text-white">{(symbol[0] ?? '?').toUpperCase()}</span>
    </div>
  )
}

// ─── Token row ────────────────────────────────────────────────────────────────

function TokenRow({ item }: { item: TokenItem }) {
  return (
    <div className="flex items-center justify-between bg-[#f5f5f5] rounded-[16px] px-[16px] py-[10px] w-full shrink-0">
      <div className="flex items-center gap-[6px]">
        <TokenIcon symbol={item.symbol} iconUrl={item.iconUrl} />
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
  loading?: boolean
  claimButton?: React.ReactNode
}

function SummaryCard({ title, icon, tokens, loading, claimButton }: SummaryCardProps) {
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
          {loading
            ? <p className="text-[14px] text-[#8d8d93] py-[8px]">Loading...</p>
            : tokens.length === 0
              ? (
                <div className="flex h-full flex-col items-center justify-center gap-[10px]">
                  <img src="/empty-data.svg" alt="No data" className="h-[120px] w-[120px]" />
                  <p className="text-[13px] leading-[20px] text-[#8d8d93]">No data available</p>
                </div>
              )
              : (showAll ? tokens : tokens.slice(0, 3)).map(item => <TokenRow key={item.symbol} item={item} />)
          }
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

function DonutChart({ data, getTokenSymbol }: { data: DistributionItem[]; getTokenSymbol: (caipChainId: string, token: string) => string | null }) {
  // Group by token, sum raw amounts
  const tokenTotals: Record<string, { amount: number; symbol: string }> = {}
  for (const d of data) {
    const key = `${d.caipChainId}:${d.tokenAddress}`
    const symbol = getTokenSymbol(d.caipChainId, d.tokenAddress) ?? d.tokenAddress.slice(0, 6)
    if (!tokenTotals[key]) tokenTotals[key] = { amount: 0, symbol }
    tokenTotals[key].amount += d.rawAmount
  }
  const entries = Object.values(tokenTotals)
  const centerAmount = entries.reduce((s, e) => s + e.amount, 0).toLocaleString()
  const centerSymbol = entries.length === 1 ? entries[0].symbol : 'Mixed'

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
          formatter={(value: number, name: string) => [`${value}%`, name]}
          contentStyle={{ borderRadius: 8, fontSize: 12, backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
          wrapperStyle={{ zIndex: 50 }}
        />
      </PieChart>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 0 }}>
        <p className="text-[15px] leading-[22px] font-bold text-[#1c1c26]">{centerAmount}</p>
        <p className="text-[12px] leading-[18px] text-[#8d8d93]">{centerSymbol}</p>
      </div>
    </div>
  )
}

// ─── Income Distribution card ─────────────────────────────────────────────────

function IncomeDistributionCard({ data, loading, getTokenSymbol }: { data: DistributionItem[]; loading?: boolean; getTokenSymbol: (caipChainId: string, token: string) => string | null }) {
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
        {loading
          ? <p className="text-[14px] text-[#8d8d93]">Loading...</p>
          : data.length === 0
            ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-[10px]">
                <img src="/empty-data.svg" alt="No data" className="h-[120px] w-[120px]" />
                <p className="text-[13px] leading-[20px] text-[#8d8d93]">No data available</p>
              </div>
            )
            : (
              <>
                <DonutChart data={data} getTokenSymbol={getTokenSymbol} />
                <div className="flex flex-1 flex-col gap-[10px] min-w-0 max-h-[160px] overflow-y-auto">
                  {data.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-[8px] shrink-0">
                      <div className="h-[8px] w-[10px] shrink-0 rounded-[12px]" style={{ backgroundColor: item.color }} />
                      <p className="text-[14px] leading-[22px] text-[#1c1c26] truncate flex-1">{item.name}</p>
                      <p className="text-[13px] leading-[22px] text-[#606067] shrink-0">{item.value}%</p>
                    </div>
                  ))}
                </div>
              </>
            )
        }
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MemberDashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const { fetchChainAssets, getTokenSymbol, getTokenDecimals, getTokenIconUrl } = useChainAssetStore()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')

  const [claimedTokens, setClaimedTokens] = useState<TokenItem[]>([])
  const [pendingTokens, setPendingTokens] = useState<TokenItem[]>([])
  const [distributionData, setDistributionData] = useState<DistributionItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      setSummaryLoading(true)
      await fetchChainAssets()
      const data = await apis.transaction.getMySummary()

      setClaimedTokens(data.claimed.map(item => ({
        symbol: getTokenSymbol(item.caipChainId, item.tokenAddress) ?? item.tokenAddress.slice(0, 6),
        amount: Number(item.totalAmount) / Math.pow(10, getTokenDecimals(item.caipChainId, item.tokenAddress)),
        iconUrl: getTokenIconUrl(item.caipChainId, item.tokenAddress),
      })))

      setPendingTokens(data.pendingClaim.map(item => ({
        symbol: getTokenSymbol(item.caipChainId, item.tokenAddress) ?? item.tokenAddress.slice(0, 6),
        amount: Number(item.totalAmount) / Math.pow(10, getTokenDecimals(item.caipChainId, item.tokenAddress)),
        iconUrl: getTokenIconUrl(item.caipChainId, item.tokenAddress),
      })))

      const totalDist = data.incomeDistribution.reduce((s, d) => s + Number(d.totalAmount), 0) || 1
      setDistributionData(data.incomeDistribution.map((item, i) => ({
        name: item.orgName,
        value: Math.round((Number(item.totalAmount) / totalDist) * 100),
        color: DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
        caipChainId: item.caipChainId,
        tokenAddress: item.tokenAddress,
        rawAmount: Number(item.totalAmount) / Math.pow(10, getTokenDecimals(item.caipChainId, item.tokenAddress)),
      })))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load summary.',
        variant: 'destructive',
      })
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleClaimAll = async () => {
    if (!address || !walletProvider) {
      toast({ description: 'Please connect your wallet first.', variant: 'destructive' })
      return
    }
    try {
      setVerifying(true)
      const { signMessage } = await apis.auth.getMySignMessage()
      const signature = await walletProvider.request<string>({
        method: 'personal_sign',
        params: [signMessage, address],
      }) as string
      const result = await apis.auth.verifyMetaPub({ address, signature })
      if (!result.verified) {
        toast({ title: 'Verification failed', description: result.reason, variant: 'destructive' })
        return
      }
      sessionStorage.setItem('metapub-verify-token', result.token)
      navigate('/member/claim')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Wallet verification failed.',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleOrganizationClick = (orgId: string, orgName: string, memberId: string) => {
    navigate('/member/orgdetail', { state: { orgName, orgId, memberId } })
  }

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Summary Cards */}
      <div className="flex gap-[24px]">
        <SummaryCard
          title="Total Claimed"
          icon={<IconMoneybag className="h-[32px] w-[32px] text-[#1c1c26]" />}
          tokens={claimedTokens}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Pending"
          icon={<IconCurrencyDollar className="h-[32px] w-[32px] text-[#1c1c26]" />}
          tokens={pendingTokens}
          loading={summaryLoading}
          claimButton={
            <button
              onClick={handleClaimAll}
              disabled={summaryLoading || pendingTokens.length === 0 || verifying}
              className="flex items-center justify-center gap-[6px] rounded-[12px] bg-[#5e85ee] px-[14px] py-[10px] text-[14px] leading-[22px] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {verifying && <IconLoader2 className="h-[14px] w-[14px] animate-spin" />}
              Claim all
            </button>
          }
        />
        <IncomeDistributionCard data={distributionData} loading={summaryLoading} getTokenSymbol={getTokenSymbol} />
      </div>

      {/* Data Summary */}
      <div>
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26] pb-[16px]">Data Summary</p>
        <div className="bg-white rounded-[32px] p-[16px]">
          <PayrollHistoryTable onOrgClick={handleOrganizationClick} />
        </div>
      </div>
    </div>
  )
}
