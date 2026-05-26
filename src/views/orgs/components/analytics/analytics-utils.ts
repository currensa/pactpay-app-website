import type { ByTimeMonthlyStat, ByTimeStatistic, TransactionAnalyticsNode } from '@/apis/statistics.api'
import type { TransactionPlan } from '@/apis/transaction.api'
import type { PreferenceLanguage } from '@/apis/preference.api'
import type { I18nKey } from '@/i18n/messages'
import { getStatusDisplayName, PayrollTransactionStatus } from '@/enums/transaction'
import { memberStatus } from '@/enums/org'
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
  { value: '12', labelKey: 'pages.analytics.last12Months' },
  { value: '6', labelKey: 'pages.analytics.last6Months' },
  { value: '3', labelKey: 'pages.analytics.last3Months' },
  { value: '1', labelKey: 'pages.analytics.last1Month' },
] satisfies Array<{ value: string; labelKey: I18nKey }>

const MONTH_LABELS: Record<PreferenceLanguage, { short: string[]; long: string[] }> = {
  'en-US': {
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    long: [
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
    ],
  },
  'zh-CN': {
    short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    long: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  },
}

const getMonthLabelSet = (language: PreferenceLanguage) => MONTH_LABELS[language] ?? MONTH_LABELS['en-US']

const formatYearMonthLabel = (monthLabel: string, year: number, language: PreferenceLanguage) => {
  return language === 'zh-CN' ? `${year}年${monthLabel}` : `${monthLabel} ${year}`
}

export type AnalyticsTranslate = (key: I18nKey, params?: Record<string, string | number>) => string

export const getAnalyticsStatusLabel = (status: string, translate: AnalyticsTranslate) => {
  if (status === 'No Activity') return translate('pages.analytics.statusNoActivity')
  return status
}

export const getTranslatedRelativeExecutionDateLabel = (
  relativeDate: { label: string; diffDays: number | null },
  translate: AnalyticsTranslate
) => {
  if (relativeDate.diffDays == null) return relativeDate.label
  if (relativeDate.diffDays === 0) return translate('pages.analytics.today')

  const count = Math.abs(relativeDate.diffDays)
  const dayLabel = translate(count === 1 ? 'pages.analytics.daySingular' : 'pages.analytics.dayPlural')
  return relativeDate.diffDays > 0
    ? translate('pages.analytics.inDays', { count, dayLabel })
    : translate('pages.analytics.daysAgo', { count, dayLabel })
}

export const getMemberStatusLabel = (status: string, translate: AnalyticsTranslate) => {
  if (status === 'current') return translate('pages.analytics.active')
  if (status === 'left') return translate('pages.analytics.left')
  return translate('pages.analytics.delete')
}

export const getOrgMemberStatusLabel = (status: string, translate: AnalyticsTranslate) => {
  if (status === memberStatus.REVIEW) return translate('pages.analytics.pendingReview')
  if (status === memberStatus.ACTIVATION) return translate('pages.analytics.pendingActivation')
  if (status === memberStatus.ACTIVE) return translate('pages.analytics.active')
  return status
}

export const EXECUTIONS_PAGE_SIZE = 10

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

export function formatMonthYearLabel(month: number, year: number, variant: 'short' | 'long' = 'short', language: PreferenceLanguage = 'en-US') {
  const labelSet = getMonthLabelSet(language)
  const labels = variant === 'long' ? labelSet.long : labelSet.short
  const safeIndex = Math.max(1, Math.min(12, month)) - 1
  return formatYearMonthLabel(labels[safeIndex], year, language)
}

export function getShortMonthLabel(month: number, language: PreferenceLanguage = 'en-US') {
  return getMonthLabelSet(language).short[Math.max(1, Math.min(12, month)) - 1]
}

export function getTransactionSymbol(node: TransactionAnalyticsNode) {
  return node.amount.symbol || node.amount.tokenAddress.slice(0, 6).toUpperCase()
}

export function getTransactionPlanName(plan: TransactionPlan, translate?: AnalyticsTranslate) {
  return plan.transactionName?.trim() || (translate ? translate('pages.analytics.transactionFallback', { id: plan.id.slice(0, 12) }) : `Transaction ${plan.id.slice(0, 12)}`)
}

export function buildNewThisMonthTrend(nodes: TransactionAnalyticsNode[], translate: AnalyticsTranslate): TrendMeta {
  const now = new Date()
  const count = nodes.filter(node => {
    const date = new Date(node.analyticsDate)
    return !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth()
  }).length

  if (count <= 0) {
    return { tone: 'neutral', label: translate('pages.analytics.noNewTransactionsThisMonth') }
  }

  return { tone: 'positive', label: translate('pages.analytics.newThisMonth', { count }) }
}

export function buildFrequencyTrend(totalTransactions: number, periodMonths: number, translate: AnalyticsTranslate): TrendMeta {
  if (totalTransactions <= 0) {
    return { tone: 'neutral', label: translate('pages.analytics.noActivityYet') }
  }

  if (totalTransactions >= periodMonths) {
    return { tone: 'neutral', label: translate('pages.analytics.consistentFrequency') }
  }

  return { tone: 'neutral', label: translate('pages.analytics.buildingMomentum') }
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

export function buildByTimeChartData(statistic: ByTimeStatistic | null, year: number, language: PreferenceLanguage = 'en-US', translate?: AnalyticsTranslate): ByTimeChartPoint[] {
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
      monthLabel: formatMonthYearLabel(month, year, 'long', language),
      shortMonthLabel: getShortMonthLabel(month, language),
      amount: toChartNumber(monthlyStat?.totalPayoutVolume ?? '0', decimals),
      amountLabel: symbol
        ? `${formatTokenAmount(monthlyStat?.totalPayoutVolume ?? '0', decimals)} ${symbol}`
        : formatTokenAmount(monthlyStat?.totalPayoutVolume ?? '0', decimals),
      transactionCount: monthlyStat?.transactionCount ?? 0,
      uniqueMembers: monthlyStat?.uniqueMembers ?? 0,
      status: monthlyStat?.status || (translate ? translate('pages.analytics.statusNoActivity') : 'No Activity'),
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
    translate?: AnalyticsTranslate
  }
): TrendMeta {
  const current = toChartNumber(currentValue, decimals)
  const previous = previousValue ? toChartNumber(previousValue, decimals) : 0

  if (previous <= 0) {
    if (current <= 0) return { tone: 'neutral', label: options.neutralLabel }
    return { tone: 'positive', label: options.positiveSuffix || options.translate?.('pages.analytics.newActivity') || 'New activity' }
  }

  const deltaPercent = ((current - previous) / previous) * 100

  if (!Number.isFinite(deltaPercent) || Math.abs(deltaPercent) < 1) {
    return { tone: 'neutral', label: options.neutralLabel }
  }

  const value = `${Math.abs(deltaPercent).toFixed(1)}%`

  if (deltaPercent > 0) {
    return {
      tone: 'positive',
      label: options.compareSuffix ? `${value} ${options.compareSuffix}` : options.translate?.('pages.analytics.increase', { value }) || `${value} increase`,
    }
  }

  return {
    tone: 'negative',
    label: options.negativeSuffix ? `${value} ${options.negativeSuffix}` : options.translate?.('pages.analytics.decrease', { value }) || `${value} decrease`,
  }
}

export function formatStatusLabel(status: string) {
  switch (status) {
    case PayrollTransactionStatus.COMPLETE:
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

export function formatTranslatedStatusLabel(status: string, translate: AnalyticsTranslate) {
  switch (status) {
    case PayrollTransactionStatus.READY:
      return translate('pages.analytics.statusAwaitingPayment')
    case PayrollTransactionStatus.COMPLETE:
      return translate('pages.analytics.statusClaimable')
    case PayrollTransactionStatus.REFUNDED:
      return translate('pages.analytics.statusRefunded')
    default:
      return formatStatusLabel(status)
  }
}
