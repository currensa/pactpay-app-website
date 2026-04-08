import type { ByTimeMonthlyStat, ByTimeStatistic, TransactionAnalyticsNode } from '@/apis/statistics.api'
import type { TransactionPlan } from '@/apis/transaction.api'
import { getStatusDisplayName, PayrollTransactionStatus } from '@/enums/transaction'
import { formatUnits } from 'ethers'

export type AnalyticsTab = 'time' | 'transaction' | 'executions' | 'members'

export type TrendTone = 'positive' | 'negative' | 'neutral'

export interface TrendMeta {
  tone: TrendTone
  label: string
}

export interface TransactionChartPoint {
  batchId: string
  xAxisKey: string
  transactionName: string
  shortName: string
  executionDateLabel: string
  xLabel: string
  amount: number
  amountLabel: string
  compactAmountLabel: string
  memberCount: number
}

export interface ByTimeChartPoint {
  month: number
  monthLabel: string
  shortMonthLabel: string
  amount: number
  amountLabel: string
  transactionCount: number
  uniqueMembers: number
  status: string
}

export const ANALYTICS_TABS: Array<{ id: AnalyticsTab; label: string }> = [
  { id: 'time', label: 'By Time' },
  { id: 'transaction', label: 'By Transaction' },
  { id: 'executions', label: 'Transaction Executions' },
  { id: 'members', label: 'By Member' },
]

export const PERIOD_OPTIONS = [
  { value: '12', label: 'Last 12 Months' },
  { value: '6', label: 'Last 6 Months' },
  { value: '3', label: 'Last 3 Months' },
  { value: '1', label: 'Last 1 Month' },
]

export const EXECUTIONS_PAGE_SIZE = 10

const SHORT_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function buildYearOptions(length = 6, baseYear = new Date().getFullYear()) {
  return Array.from({ length }, (_, index) => String(baseYear - index))
}

export function shiftDecimalLeft(value: string, decimals: number) {
  const normalized = value.trim()

  if (!normalized) return '0'

  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [wholeRaw = '0', fractionRaw = ''] = unsigned.split('.')
  const wholeDigits = wholeRaw.replace(/[^\d]/g, '') || '0'
  const fractionDigits = fractionRaw.replace(/[^\d]/g, '')
  const combinedDigits = `${wholeDigits}${fractionDigits}`.replace(/^0+(?=\d)/, '') || '0'
  const scale = Math.max(0, decimals) + fractionDigits.length
  const paddedWhole = combinedDigits.padStart(scale + 1, '0')
  const integerPart = (scale === 0 ? paddedWhole : paddedWhole.slice(0, -scale) || '0').replace(/^0+(?=\d)/, '') || '0'
  const decimalPart = (scale === 0 ? '' : paddedWhole.slice(-scale)).replace(/0+$/, '')
  const result = decimalPart ? `${integerPart}.${decimalPart}` : integerPart

  return negative && result !== '0' ? `-${result}` : result
}

export function formatDecimalString(value: string, minFractionDigits = 0, maxFractionDigits = 2) {
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [integerRaw = '0', fractionRaw = ''] = unsigned.split('.')
  const integerPart = (integerRaw.replace(/^0+(?=\d)/, '') || '0').replace(/[^\d]/g, '') || '0'
  let fractionPart = fractionRaw.replace(/[^\d]/g, '').slice(0, maxFractionDigits)

  if (maxFractionDigits > minFractionDigits) {
    fractionPart = fractionPart.replace(/0+$/, '')
  }

  if (minFractionDigits > 0) {
    fractionPart = fractionPart.padEnd(Math.min(minFractionDigits, maxFractionDigits), '0')
  }

  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const prefix = negative && (groupedInteger !== '0' || fractionPart) ? '-' : ''

  return `${prefix}${groupedInteger}${fractionPart ? `.${fractionPart}` : ''}`
}

export function formatTokenAmount(amount: string, decimals: number, minFractionDigits = 2, maxFractionDigits = 2) {
  return formatDecimalString(shiftDecimalLeft(amount, decimals), minFractionDigits, maxFractionDigits)
}

export function toChartNumber(amount: string, decimals: number) {
  const value = Number(shiftDecimalLeft(amount, decimals))
  return Number.isFinite(value) ? value : 0
}

export function formatCompactAmount(amount: string, decimals: number) {
  const value = toChartNumber(amount, decimals)
  const absValue = Math.abs(value)

  if (absValue >= 1_000_000) {
    return `${formatDecimalString(String(value / 1_000_000), 1, 1)}m`
  }

  if (absValue >= 1_000) {
    return `${formatDecimalString(String(value / 1_000), 1, 1)}k`
  }

  return formatDecimalString(String(value), 2, 2)
}

export function formatPlanTokenAmount(amount: string, decimals: number, minFractionDigits = 0, maxFractionDigits = 2) {
  try {
    return formatDecimalString(formatUnits(BigInt(amount || '0'), decimals), minFractionDigits, maxFractionDigits)
  } catch {
    return '0'
  }
}

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`
}

export { formatUtcDate, formatUtcDateTime } from '@/utils/date'

export function formatUtcShortDate(dateValue: string) {
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return '--'

  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')

  return `${month}/${day}`
}

export function formatMonthYearLabel(month: number, year: number, variant: 'short' | 'long' = 'short') {
  const labels = variant === 'long' ? LONG_MONTH_LABELS : SHORT_MONTH_LABELS
  const safeIndex = Math.max(1, Math.min(12, month)) - 1
  return `${labels[safeIndex]} ${year}`
}

export function getShortMonthLabel(month: number) {
  return SHORT_MONTH_LABELS[Math.max(1, Math.min(12, month)) - 1]
}

export function getTransactionSymbol(node: TransactionAnalyticsNode) {
  return node.amount.symbol || node.amount.tokenAddress.slice(0, 6).toUpperCase()
}

export function getTransactionPlanName(plan: TransactionPlan) {
  return plan.transactionName?.trim() || `Transaction ${plan.id.slice(0, 12)}`
}

export function buildNewThisMonthTrend(nodes: TransactionAnalyticsNode[]): TrendMeta {
  const now = new Date()
  const count = nodes.filter(node => {
    const date = new Date(node.analyticsDate)
    return !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth()
  }).length

  if (count <= 0) {
    return { tone: 'neutral', label: 'No new transactions this month' }
  }

  return { tone: 'positive', label: `${count} new this month` }
}

export function buildFrequencyTrend(totalTransactions: number, periodMonths: number): TrendMeta {
  if (totalTransactions <= 0) {
    return { tone: 'neutral', label: 'No activity yet' }
  }

  if (totalTransactions >= periodMonths) {
    return { tone: 'neutral', label: 'Consistent frequency' }
  }

  return { tone: 'neutral', label: 'Building momentum' }
}

export function escapeCsvValue(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function getStatisticKey(statistic: Pick<ByTimeStatistic, 'caipChainId' | 'tokenAddress'>) {
  return `${statistic.caipChainId}:${statistic.tokenAddress}`
}

export function findMatchingStatistic(
  statistics: ByTimeStatistic[],
  target: Pick<ByTimeStatistic, 'caipChainId' | 'tokenAddress'> | null | undefined
) {
  if (!target) return null
  return statistics.find(item => getStatisticKey(item) === getStatisticKey(target)) ?? null
}

export function buildByTimeChartData(statistic: ByTimeStatistic | null, year: number): ByTimeChartPoint[] {
  const monthlyStatsMap = new Map<number, ByTimeMonthlyStat>()

  for (const monthlyStat of statistic?.monthlyStats ?? []) {
    monthlyStatsMap.set(monthlyStat.month, monthlyStat)
  }

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const monthlyStat = monthlyStatsMap.get(month)
    const decimals = statistic?.decimals ?? 0
    const symbol = statistic?.symbol ?? ''

    return {
      month,
      monthLabel: formatMonthYearLabel(month, year, 'long'),
      shortMonthLabel: getShortMonthLabel(month),
      amount: toChartNumber(monthlyStat?.totalPayoutVolume ?? '0', decimals),
      amountLabel: symbol
        ? `${formatTokenAmount(monthlyStat?.totalPayoutVolume ?? '0', decimals)} ${symbol}`
        : formatTokenAmount(monthlyStat?.totalPayoutVolume ?? '0', decimals),
      transactionCount: monthlyStat?.transactionCount ?? 0,
      uniqueMembers: monthlyStat?.uniqueMembers ?? 0,
      status: monthlyStat?.status || 'No Activity',
    }
  })
}

export function buildAmountTrend(
  currentValue: string,
  previousValue: string | undefined,
  decimals: number,
  options: {
    neutralLabel: string
    compareSuffix?: string
    positiveSuffix?: string
    negativeSuffix?: string
  }
): TrendMeta {
  const current = toChartNumber(currentValue, decimals)
  const previous = previousValue ? toChartNumber(previousValue, decimals) : 0

  if (previous <= 0) {
    if (current <= 0) return { tone: 'neutral', label: options.neutralLabel }
    return { tone: 'positive', label: options.positiveSuffix || 'New activity' }
  }

  const deltaPercent = ((current - previous) / previous) * 100

  if (!Number.isFinite(deltaPercent) || Math.abs(deltaPercent) < 1) {
    return { tone: 'neutral', label: options.neutralLabel }
  }

  const value = `${Math.abs(deltaPercent).toFixed(1)}%`

  if (deltaPercent > 0) {
    return {
      tone: 'positive',
      label: options.compareSuffix ? `${value} ${options.compareSuffix}` : `${value} increase`,
    }
  }

  return {
    tone: 'negative',
    label: options.negativeSuffix ? `${value} ${options.negativeSuffix}` : `${value} decrease`,
  }
}

export function formatStatusLabel(status: string) {
  switch (status) {
    case PayrollTransactionStatus.COMPLETE:
    case PayrollTransactionStatus.PENDING:
    case PayrollTransactionStatus.READY:
      return getStatusDisplayName(status)
    default:
      return status
        .split(/[_-\s]+/)
        .filter(Boolean)
        .map(token => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(' ')
  }
}
