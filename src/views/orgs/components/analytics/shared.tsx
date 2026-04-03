import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ChartColumn, Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { ANALYTICS_TABS, type AnalyticsTab, type TrendMeta, formatStatusLabel } from './analytics-utils'

function AnalyticsTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center justify-center gap-[6px] text-left transition-colors">
      <span
        className={cn(
          'text-[14px] leading-[22px] md:text-[16px] md:leading-[24px]',
          active ? 'font-bold text-[#1c1c26]' : 'font-normal text-[#606067]'
        )}
      >
        {label}
      </span>
      <span className={cn('h-[3px] w-full rounded-full', active ? 'bg-[#1868e9]' : 'bg-transparent')} />
    </button>
  )
}

export function AnalyticsTabsNav({
  activeTab,
  onTabChange,
}: {
  activeTab: AnalyticsTab
  onTabChange: (tab: AnalyticsTab) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-[20px] md:gap-[24px]">
      {ANALYTICS_TABS.map(tab => (
        <AnalyticsTabButton
          key={tab.id}
          active={tab.id === activeTab}
          label={tab.label}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  )
}

export function AnalyticsTopBar({
  tabsNav,
  actions,
}: {
  tabsNav: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-[16px] xl:flex-row xl:items-end xl:justify-between">
      {tabsNav}
      {actions ? <div className="flex flex-wrap items-center gap-[12px]">{actions}</div> : null}
    </div>
  )
}

function TrendPill({ trend }: { trend: TrendMeta }) {
  const toneClasses = trend.tone === 'positive'
    ? 'bg-[rgba(93,221,34,0.12)] text-[#5ddd22]'
    : trend.tone === 'negative'
      ? 'bg-[rgba(217,43,43,0.12)] text-[#d92b2b]'
      : 'bg-[#f5f5f5] text-[#606067]'

  return (
    <div className={cn('inline-flex items-center gap-[4px] rounded-full px-[4px] py-[4px] text-[12px] leading-[18px] md:text-[12px] md:leading-[22px]', toneClasses)}>
      {trend.tone === 'positive' ? <ArrowUpRight className="h-[14px] w-[14px]" /> : <ChartColumn className="h-[14px] w-[14px]" />}
      <span>{trend.label}</span>
    </div>
  )
}

export function MetricCard({
  title,
  value,
  trend,
  titleClassName,
}: {
  title: string
  value: string
  trend: TrendMeta
  titleClassName?: string
}) {
  return (
    <div className="flex min-h-[120px] flex-col justify-between rounded-[28px] bg-white p-[20px] md:min-h-[128px] md:p-[24px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex min-w-0 flex-col gap-[8px]">
          <p className={cn('text-[14px] leading-[22px] text-[#1c1c26] md:text-[16px] md:leading-[24px]', titleClassName)}>{title}</p>
          <span className="break-all text-[28px] font-medium leading-[36px] text-[#1c1c26] md:text-[22px] md:leading-[44px]">{value}</span>
        </div>
        <TrendPill trend={trend} />
      </div>
    </div>
  )
}

export function MessageState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[32px] bg-white px-[24px] py-[20px] flex flex-col items-center justify-center gap-[12px] text-center">
      <img src="/empty-data.svg" alt="No data" className="h-[120px] w-[120px]" />
      <p className="text-[18px] leading-[28px] text-[#1c1c26]">{title}</p>
      <p className="mx-auto max-w-[520px] text-[14px] leading-[22px] text-[#8d8d93]">{description}</p>
    </div>
  )
}

export function PlaceholderState({ label }: { label: string }) {
  return (
    <div className="rounded-[32px] bg-white px-[24px] py-[20px] text-center">
      <div className="mx-auto flex h-[56px] w-[56px] items-center justify-center rounded-[18px] bg-[#f5f5f5]">
        <ChartColumn className="h-[24px] w-[24px] text-[#606067]" />
      </div>
      <p className="mt-[16px] text-[18px] leading-[28px] text-[#1c1c26]">{label}</p>
      <p className="mt-[8px] text-[14px] leading-[22px] text-[#8d8d93]">This view is not part of the current implementation scope.</p>
    </div>
  )
}

export function AnalyticsStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const colorClasses = (() => {
    if (normalized === 'complete' || normalized === 'completed') {
      return 'bg-[rgba(93,221,34,0.12)] text-[#5ddd22]'
    }

    if (normalized === 'pending') {
      return 'bg-[rgba(255,168,0,0.12)] text-[#ffa800]'
    }

    if (normalized === 'ready') {
      return 'bg-[rgba(94,133,238,0.12)] text-[#5e85ee]'
    }

    if (normalized === 'refunded') {
      return 'bg-[rgba(217,43,43,0.12)] text-[#d92b2b]'
    }

    return 'bg-[#f5f5f5] text-[#606067]'
  })()

  return (
    <span className={cn('inline-flex items-center rounded-[8px] px-[8px] py-[2px] text-[12px] leading-[18px] whitespace-nowrap md:text-[14px] md:leading-[22px]', colorClasses)}>
      {formatStatusLabel(status)}
    </span>
  )
}

export function AnalyticsExportButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      variant="outline"
      className="h-[36px] rounded-[12px] border-[rgba(0,0,0,0.12)] bg-white px-[14px] text-[14px] font-normal text-[#1c1c26] shadow-none hover:bg-[#f5f5f5]"
      onClick={onClick}
      disabled={disabled}
    >
      <Download className="h-[16px] w-[16px]" />
      Export
    </Button>
  )
}
