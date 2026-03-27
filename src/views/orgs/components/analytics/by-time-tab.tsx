import apis from '@/apis'
import type { ByTimeStatistic, ByTimeStatisticsResponse } from '@/apis/statistics.api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  buildAmountTrend,
  buildByTimeChartData,
  buildYearOptions,
  escapeCsvValue,
  findMatchingStatistic,
  formatMonthYearLabel,
  formatTokenAmount,
  toChartNumber,
} from './analytics-utils'
import { AnalyticsExportButton, AnalyticsStatusBadge, AnalyticsTopBar, MessageState, MetricCard } from './shared'

function ByTimeLoadingState() {
  return (
    <div className="flex flex-col gap-[20px]">
      <div className="grid gap-[20px] xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-[128px] animate-pulse rounded-[28px] bg-white" />
        ))}
      </div>
      <div className="h-[360px] animate-pulse rounded-[32px] bg-white" />
      <div className="h-[360px] animate-pulse rounded-[32px] bg-white" />
    </div>
  )
}

function pickDefaultStatistic(statistics: ByTimeStatistic[]) {
  if (statistics.length === 0) return null

  return [...statistics].sort(
    (left, right) =>
      toChartNumber(right.totalPayoutVolume, right.decimals) - toChartNumber(left.totalPayoutVolume, left.decimals)
  )[0]
}

function formatDisplayAmount(amount: string, decimals: number, symbol: string) {
  const formatted = formatTokenAmount(amount, decimals)
  return symbol ? `${formatted} ${symbol}` : formatted
}

function buildAssetFilterKey(caipChainId: string, tokenAddress: string) {
  return `${caipChainId}::${tokenAddress}`
}

function parseAssetFilterKey(filterKey: string) {
  const separatorIndex = filterKey.lastIndexOf('::')

  if (separatorIndex === -1) {
    return null
  }

  return {
    caipChainId: filterKey.slice(0, separatorIndex),
    tokenAddress: filterKey.slice(separatorIndex + 2),
  }
}

export function ByTimeTab({ tabsNav }: { tabsNav: ReactNode }) {
  const { toast } = useToast()
  const currentMember = useOrganizationStore(s => s.currentMember)
  const chainAssets = useChainAssetStore(s => s.chainAssets)
  const fetchChainAssets = useChainAssetStore(s => s.fetchChainAssets)
  const fetchChains = useChainAssetStore(s => s.fetchChains)
  const getChain = useChainAssetStore(s => s.getChain)

  const yearOptions = useMemo(() => buildYearOptions(6), [])
  const [selectedYear, setSelectedYear] = useState(yearOptions[0] ?? String(new Date().getFullYear()))
  const [selectedAssetFilterKey, setSelectedAssetFilterKey] = useState('all')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stats, setStats] = useState<ByTimeStatisticsResponse | null>(null)
  const [previousYearStats, setPreviousYearStats] = useState<ByTimeStatisticsResponse | null>(null)

  const canAccessAnalytics = useMemo(() => {
    const roles = currentMember?.roles.map(role => role.role) ?? []
    return roles.some(role => role === 'Owner' || role === 'Admin' || role === 'Operator')
  }, [currentMember])

  useEffect(() => {
    let cancelled = false

    if (!canAccessAnalytics) {
      setSelectedAssetFilterKey('all')
      return
    }

    async function loadAssets() {
      try {
        await Promise.all([fetchChainAssets(), fetchChains()])
      } catch {
        if (cancelled) return
      }
    }

    loadAssets()

    return () => {
      cancelled = true
    }
  }, [canAccessAnalytics, fetchChainAssets, fetchChains])

  const assetOptions = useMemo(
    () =>
      Array.from(
        new Map(chainAssets.map(item => [buildAssetFilterKey(item.caipChainId, item.contractAddress || ''), item])).values()
      ).sort((left, right) => {
        const leftChainName = getChain(left.caipChainId)?.name || left.chain.name || left.caipChainId
        const rightChainName = getChain(right.caipChainId)?.name || right.chain.name || right.caipChainId
        const leftLabel = `${left.asset.symbol} ${leftChainName}`.toLowerCase()
        const rightLabel = `${right.asset.symbol} ${rightChainName}`.toLowerCase()
        return leftLabel.localeCompare(rightLabel)
      }),
    [chainAssets, getChain]
  )

  useEffect(() => {
    if (selectedAssetFilterKey === 'all') return

    const exists = assetOptions.some(
      option => buildAssetFilterKey(option.caipChainId, option.contractAddress || '') === selectedAssetFilterKey
    )

    if (!exists) {
      setSelectedAssetFilterKey('all')
    }
  }, [assetOptions, selectedAssetFilterKey])

  useEffect(() => {
    let cancelled = false
    const year = Number(selectedYear)
    const selectedAsset = selectedAssetFilterKey === 'all' ? null : parseAssetFilterKey(selectedAssetFilterKey)

    if (!canAccessAnalytics) {
      setLoading(false)
      setErrorMessage(null)
      setStats(null)
      setPreviousYearStats(null)
      return
    }

    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const [currentResponse, previousResponse] = await Promise.all([
          apis.statistics.getByTimeStatistics({
            year,
            caipChainId: selectedAsset?.caipChainId,
            tokenAddress: selectedAsset?.tokenAddress,
          }),
          apis.statistics.getByTimeStatistics({
            year: year - 1,
            caipChainId: selectedAsset?.caipChainId,
            tokenAddress: selectedAsset?.tokenAddress,
          }).catch(() => null),
        ])

        if (cancelled) return

        setStats(currentResponse)
        setPreviousYearStats(previousResponse)
      } catch (error: any) {
        if (cancelled) return

        const status = error?.response?.status
        if (status === 403) {
          setErrorMessage('The By Time analytics endpoint is available only to Owner, Admin, and Operator members.')
        } else {
          setErrorMessage(error?.response?.data?.message || 'Failed to load time-based analytics.')
        }

        setStats(null)
        setPreviousYearStats(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [canAccessAnalytics, selectedAssetFilterKey, selectedYear])

  const selectedStatistic = useMemo(() => {
    if (!stats?.statistics.length) return null

    return pickDefaultStatistic(stats.statistics) ?? null
  }, [stats])

  const previousStatistic = useMemo(
    () => findMatchingStatistic(previousYearStats?.statistics ?? [], selectedStatistic),
    [previousYearStats, selectedStatistic]
  )

  const chartData = useMemo(
    () => buildByTimeChartData(selectedStatistic, Number(selectedYear)),
    [selectedStatistic, selectedYear]
  )

  const totalPayoutTrend = useMemo(
    () =>
      buildAmountTrend(selectedStatistic?.totalPayoutVolume ?? '0', previousStatistic?.totalPayoutVolume, selectedStatistic?.decimals ?? 0, {
        neutralLabel: 'No change vs last year',
        compareSuffix: 'vs last year',
        positiveSuffix: 'New this year',
        negativeSuffix: 'vs last year',
      }),
    [previousStatistic, selectedStatistic]
  )

  const avgMonthlyTrend = useMemo(
    () =>
      buildAmountTrend(selectedStatistic?.avgMonthlyPayout ?? '0', previousStatistic?.avgMonthlyPayout, selectedStatistic?.decimals ?? 0, {
        neutralLabel: 'Stable trend',
        positiveSuffix: 'New benchmark',
      }),
    [previousStatistic, selectedStatistic]
  )

  const avgPerMemberTrend = useMemo(
    () =>
      buildAmountTrend(selectedStatistic?.avgPayoutPerMember ?? '0', previousStatistic?.avgPayoutPerMember, selectedStatistic?.decimals ?? 0, {
        neutralLabel: 'Stable trend',
        positiveSuffix: 'New benchmark',
      }),
    [previousStatistic, selectedStatistic]
  )

  const handleExport = () => {
    if (!selectedStatistic) {
      toast({ description: 'No by-time analytics data is available to export.' })
      return
    }

    const rows = [
      ['Month', 'Total Payout', 'Transaction Count', 'Unique Members', 'Status', 'Year', 'Symbol', 'caipChainId', 'tokenAddress'],
      ...chartData.map(item => [
        formatMonthYearLabel(item.month, Number(selectedYear)),
        item.amountLabel,
        item.transactionCount,
        item.uniqueMembers,
        item.status,
        selectedYear,
        selectedStatistic.symbol,
        selectedStatistic.caipChainId,
        selectedStatistic.tokenAddress,
      ]),
    ]

    const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `analytics-by-time-${selectedYear}-${selectedStatistic.symbol || 'token'}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderContent = () => {
    if (!canAccessAnalytics) {
      return (
        <MessageState
          title="Access restricted"
          description="The By Time analytics endpoint is available only to Owner, Admin, and Operator members."
        />
      )
    }

    if (loading) {
      return <ByTimeLoadingState />
    }

    if (errorMessage) {
      return <MessageState title="Unable to load analytics" description={errorMessage} />
    }

    if (!stats?.statistics.length || !selectedStatistic) {
      return (
        <MessageState
          title="No by-time analytics data"
          description={`No completed payout analytics were found for ${selectedYear}.`}
        />
      )
    }

    return (
      <>
        <div className="grid gap-[20px] xl:grid-cols-3">
          <MetricCard
            title="Total Payout Volume"
            value={formatDisplayAmount(selectedStatistic.totalPayoutVolume, selectedStatistic.decimals, selectedStatistic.symbol)}
            trend={totalPayoutTrend}
          />
          <MetricCard
            title="Avg. Monthly Payout"
            value={formatDisplayAmount(selectedStatistic.avgMonthlyPayout, selectedStatistic.decimals, selectedStatistic.symbol)}
            trend={avgMonthlyTrend}
          />
          <MetricCard
            title="Avg. Payout per Member"
            value={formatDisplayAmount(selectedStatistic.avgPayoutPerMember, selectedStatistic.decimals, selectedStatistic.symbol)}
            trend={avgPerMemberTrend}
            titleClassName="text-[12px] leading-[20px] md:text-[14px] md:leading-[22px]"
          />
        </div>

        <div className="flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[4px] md:flex-row md:items-center md:justify-between">
            <p className="text-[18px] leading-[28px] text-[#1c1c26]">Monthly Payout Distribution Chart</p>
            <p className="text-[14px] leading-[22px] text-[#606067] md:text-[16px] md:leading-[24px]">Month / Payout Amount</p>
          </div>

          <div className="rounded-[32px] bg-white px-[12px] py-[24px] md:px-[24px] md:py-[28px] xl:px-[40px]">
            <div className="h-[320px] w-full md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="24%">
                  <XAxis
                    dataKey="shortMonthLabel"
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    tick={{ fill: '#8d8d93', fontSize: 13 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null

                      const point = payload[0].payload as (typeof chartData)[number]

                      return (
                        <div className="rounded-[12px] bg-[rgba(0,0,0,0.8)] px-[12px] py-[10px] text-[13px] leading-[20px] text-white shadow-[0px_10px_24px_rgba(0,0,0,0.18)]">
                          <div className="grid min-w-[220px] gap-[8px]">
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">Month</span>
                              <span>{point.monthLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">Expenditure</span>
                              <span>{point.amountLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">Transaction Count</span>
                              <span>{point.transactionCount}</span>
                            </div>
                            <div className="flex items-center justify-between gap-[12px]">
                              <span className="text-[#bbbbbe]">Total Member</span>
                              <span>{point.uniqueMembers}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="amount" fill="#5e85ee" radius={[12, 12, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[12px]">
          <p className="text-[18px] leading-[28px] text-[#1c1c26]">Monthly Breakdown Table</p>

          <div className="overflow-hidden rounded-[32px] bg-white p-[24px]">
            <div className="overflow-x-auto">
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
                    <TableHead className="w-[220px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Month</TableHead>
                    <TableHead className="w-[220px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Total Payout</TableHead>
                    <TableHead className="w-[200px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Transaction Count</TableHead>
                    <TableHead className="w-[200px] px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Unique Members</TableHead>
                    <TableHead className="px-0 pb-[12px] pt-0 text-[14px] font-normal text-[#8d8d93]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map(item => (
                    <TableRow key={item.month} className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
                      <TableCell className="px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                        {formatMonthYearLabel(item.month, Number(selectedYear))}
                      </TableCell>
                      <TableCell className="px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                        {item.amountLabel}
                      </TableCell>
                      <TableCell className="px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                        {item.transactionCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-0 py-[16px] text-[14px] leading-[22px] text-[#1c1c26]">
                        {item.uniqueMembers.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-0 py-[16px]">
                        <AnalyticsStatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-[20px] pb-[24px]">
      <AnalyticsTopBar
        tabsNav={tabsNav}
        actions={
          <>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-[44px] min-w-[140px] rounded-[12px] border-[rgba(0,0,0,0.12)] bg-white text-[14px] text-[#1c1c26] shadow-none focus:ring-0 focus:ring-offset-0 md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[16px]">
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAssetFilterKey} onValueChange={setSelectedAssetFilterKey}>
              <SelectTrigger className="h-[44px] min-w-[220px] rounded-[12px] border-[rgba(0,0,0,0.12)] bg-white text-[14px] text-[#1c1c26] shadow-none focus:ring-0 focus:ring-offset-0 md:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-[16px]">
                <SelectItem value="all">All Chains / Currencies</SelectItem>
                {assetOptions.map(option => {
                  const filterKey = buildAssetFilterKey(option.caipChainId, option.contractAddress || '')
                  const chainName = getChain(option.caipChainId)?.name || option.chain.name || option.caipChainId
                  return (
                    <SelectItem key={filterKey} value={filterKey}>
                      {option.asset.symbol} / {chainName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <AnalyticsExportButton onClick={handleExport} />
          </>
        }
      />

      {renderContent()}
    </div>
  )
}
