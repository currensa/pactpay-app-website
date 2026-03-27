import apis from '@/apis'
import type {
  MemberHistoryDetailResponse,
  MemberHistoryListItem,
  MemberHistoryListResponse,
  MemberHistoryStatus,
} from '@/apis/statistics.api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { getMemberStatusDisplayName } from '@/enums/org'
import { cn } from '@/lib/utils'
import useOrganizationStore from '@/stores/organization'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { escapeCsvValue, formatTokenAmount, formatUtcDate } from './analytics-utils'
import { AnalyticsExportButton, AnalyticsTopBar, MessageState } from './shared'

const PAGE_SIZE = 20

const STATUS_FILTER_OPTIONS: Array<{ value: 'all' | MemberHistoryStatus; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'current', label: 'Active' },
  { value: 'left', label: 'Left' },
  { value: 'deleted', label: 'Delete' },
]

function formatUtcDateTime(dateValue: string | null | undefined) {
  if (!dateValue) return '--'

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return '--'

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  const hours = String(parsed.getUTCHours()).padStart(2, '0')
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}`
}

function getDisplayName(member: Pick<MemberHistoryListItem, 'memberId' | 'showName' | 'email'>) {
  return member.showName?.trim() || member.email?.split(',')[0]?.trim() || member.memberId
}

function getInitials(value: string) {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) return '?'
  if (tokens.length === 1) return tokens[0].slice(0, 1).toUpperCase()
  return `${tokens[0][0] || ''}${tokens[1][0] || ''}`.toUpperCase()
}

function getMemberHistoryStatusLabel(status: MemberHistoryStatus) {
  if (status === 'current') return 'Active'
  if (status === 'left') return 'Left'
  return 'Delete'
}

function MemberHistoryStatusBadge({ status }: { status: MemberHistoryStatus }) {
  const colorClasses = status === 'current'
    ? 'bg-[rgba(93,221,34,0.12)] text-[#5ddd22]'
    : status === 'left'
      ? 'bg-[rgba(255,168,0,0.12)] text-[#ffa800]'
      : 'bg-[rgba(0,0,0,0.04)] text-[#606067]'

  return (
    <span className={cn('inline-flex items-center rounded-[8px] px-[8px] py-[2px] text-[14px] leading-[22px] whitespace-nowrap', colorClasses)}>
      {getMemberHistoryStatusLabel(status)}
    </span>
  )
}

function getPaginationItems(currentPage: number, totalPages: number) {
  const pages: Array<number | 'ellipsis'> = []
  const maxVisible = 5

  if (totalPages <= maxVisible) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  pages.push(1)

  if (currentPage <= 3) {
    for (let page = 2; page <= 4; page += 1) {
      pages.push(page)
    }
    pages.push('ellipsis')
    pages.push(totalPages)
    return pages
  }

  if (currentPage >= totalPages - 2) {
    pages.push('ellipsis')
    for (let page = totalPages - 3; page <= totalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  pages.push('ellipsis')
  pages.push(currentPage - 1, currentPage, currentPage + 1)
  pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

function MemberHistoryPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-[6px]">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] text-[#606067] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-[18px] w-[18px]" />
      </button>

      {getPaginationItems(currentPage, totalPages).map((item, index) => {
        if (item === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="px-[6px] text-[14px] leading-[22px] text-[#606067]">
              ...
            </span>
          )
        }

        const active = item === currentPage

        return (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={cn(
              'flex h-[36px] min-w-[36px] items-center justify-center rounded-[12px] px-[10px] text-[14px] leading-[22px] text-[#606067] transition-colors hover:bg-[#f5f5f5]',
              active && 'bg-[rgba(28,28,38,0.1)]'
            )}
          >
            {item}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] text-[#606067] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}

function LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-[32px] bg-white p-[24px]">
      <div className="space-y-[16px]">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-[52px] animate-pulse rounded-[14px] bg-[#f5f5f5]" />
        ))}
      </div>
    </div>
  )
}

function DetailMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#f5f5f5] px-[16px] py-[14px]">
      <p className="text-[13px] leading-[20px] text-[#8d8d93]">{label}</p>
      <p className="mt-[4px] text-[14px] leading-[22px] text-[#1c1c26]">{value}</p>
    </div>
  )
}

export function MemberHistoryTab({ tabsNav }: { tabsNav: ReactNode }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const currentMember = useOrganizationStore(s => s.currentMember)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MemberHistoryStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const [listLoading, setListLoading] = useState(false)
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null)
  const [listData, setListData] = useState<MemberHistoryListResponse | null>(null)

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<MemberHistoryDetailResponse | null>(null)

  const canAccessMemberHistory = useMemo(() => {
    const roles = currentMember?.roles.map(role => role.role) ?? []
    return roles.some(role => role === 'Owner' || role === 'Admin' || role === 'Operator')
  }, [currentMember])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)

    return () => {
      window.clearTimeout(timer)
    }
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    let cancelled = false

    if (!canAccessMemberHistory) {
      setListLoading(false)
      setListErrorMessage(null)
      setListData(null)
      return
    }

    async function load() {
      try {
        setListLoading(true)
        setListErrorMessage(null)

        const response = await apis.statistics.getMemberHistory({
          page: currentPage,
          pageSize: PAGE_SIZE,
          status: statusFilter === 'all' ? undefined : statusFilter,
          keyword: debouncedSearch || undefined,
        })

        if (cancelled) return
        setListData(response)
      } catch (error: any) {
        if (cancelled) return

        const status = error?.response?.status
        if (status === 403) {
          setListErrorMessage('The Member History endpoint is available only to Owner, Admin, and Operator members.')
        } else {
          setListErrorMessage(error?.response?.data?.message || 'Failed to load member history.')
        }

        setListData(null)
      } finally {
        if (!cancelled) {
          setListLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [canAccessMemberHistory, currentPage, debouncedSearch, statusFilter])

  useEffect(() => {
    let cancelled = false

    if (!canAccessMemberHistory || !selectedMemberId) {
      setDetailLoading(false)
      setDetailErrorMessage(null)
      setDetailData(null)
      return
    }

    async function load() {
      try {
        setDetailLoading(true)
        setDetailErrorMessage(null)

        const response = await apis.statistics.getMemberHistoryDetail(selectedMemberId)

        if (cancelled) return
        setDetailData(response)
      } catch (error: any) {
        if (cancelled) return

        const status = error?.response?.status
        if (status === 403) {
          setDetailErrorMessage('The Member History detail endpoint is available only to Owner, Admin, and Operator members.')
        } else {
          setDetailErrorMessage(error?.response?.data?.message || 'Failed to load member history detail.')
        }

        setDetailData(null)
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [canAccessMemberHistory, selectedMemberId])

  const handleExport = () => {
    if (!listData?.data.length) {
      toast({ description: 'No member history data is available to export.' })
      return
    }

    const rows = [
      ['Member ID', 'Display Name', 'Email', 'Status', 'Deleted At'],
      ...listData.data.map(item => [
        item.memberId,
        item.showName || '',
        item.email || '',
        getMemberHistoryStatusLabel(item.status),
        item.deletedAt ? formatUtcDateTime(item.deletedAt) : '',
      ]),
    ]

    const csv = rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `analytics-member-history-page-${currentPage}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderListContent = () => {
    if (!canAccessMemberHistory) {
      return (
        <MessageState
          title="Access restricted"
          description="The Member History endpoint is available only to Owner, Admin, and Operator members."
        />
      )
    }

    if (listLoading && !listData) {
      return <LoadingCard rows={5} />
    }

    if (listErrorMessage) {
      return <MessageState title="Unable to load member history" description={listErrorMessage} />
    }

    const items = listData?.data ?? []
    const total = listData?.total ?? 0
    const page = listData?.page ?? currentPage
    const pageSize = listData?.pageSize ?? PAGE_SIZE
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1
    const showingEnd = total === 0 ? 0 : Math.min(page * pageSize, total)

    return (
      <div className="overflow-hidden rounded-[32px] bg-white p-[24px]">
        <div className={cn('transition-opacity', listLoading && 'opacity-60')}>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px] pl-0">Members</TableHead>
                  <TableHead className="w-[320px]">Email</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px] pr-0">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="px-0 py-[56px]">
                      <div className="flex flex-col items-center justify-center gap-[8px]">
                        <Search className="h-[40px] w-[40px] text-[#8d8d93]" />
                        <p className="text-[14px] leading-[22px] text-[#1c1c26]">No member history found</p>
                        <p className="text-[14px] leading-[22px] text-[#8d8d93]">Try adjusting the search keyword or status filter.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(item => {
                    const displayName = getDisplayName(item)

                    return (
                      <TableRow key={item.memberId}>
                        <TableCell className="pl-0">
                          <div className="flex items-center gap-[6px]">
                            <Avatar className="h-[32px] w-[32px]">
                              <AvatarFallback className="bg-[#e8eefe] text-[12px] font-medium text-[#5e85ee]">
                                {getInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="max-w-[180px] truncate text-[14px] leading-[22px] text-[#1c1c26]" title={displayName}>
                              {displayName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate" title={item.email || undefined}>
                          {item.email || '--'}
                        </TableCell>
                        <TableCell>
                          <MemberHistoryStatusBadge status={item.status} />
                        </TableCell>
                        <TableCell className="pr-0">
                          <Button
                            variant="ghost"
                            className="h-auto px-0 py-0 text-[14px] font-normal text-[#5e85ee] hover:bg-transparent hover:text-[#4d69bd]"
                            onClick={() => setSelectedMemberId(item.memberId)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-[24px] flex flex-col gap-[16px] md:flex-row md:items-center md:justify-between">
            <p className="text-[14px] leading-[22px] text-[#606067]">
              Showing {showingStart}-{showingEnd} of {total.toLocaleString()} members
            </p>
            <MemberHistoryPagination currentPage={page} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>
    )
  }

  const renderDetailContent = () => {
    if (detailLoading && !detailData) {
      return (
        <div className="flex flex-col gap-[20px]">
          <LoadingCard rows={2} />
          <LoadingCard rows={5} />
          <LoadingCard rows={4} />
        </div>
      )
    }

    if (detailErrorMessage) {
      return <MessageState title="Unable to load member history detail" description={detailErrorMessage} />
    }

    if (!detailData) {
      return <MessageState title="Member not found" description="The selected member history record is unavailable." />
    }

    const { member, payoutHistory, activityLogs } = detailData
    const displayName = member.showName?.trim() || member.email || member.memberId

    return (
      <div className="flex flex-col gap-[20px]">
        <div className="rounded-[32px] bg-white p-[24px]">
          <div className="flex flex-col gap-[20px] xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-[12px]">
              <Avatar className="h-[56px] w-[56px]">
                <AvatarImage src={member.avatarUrl || undefined} alt={displayName} className="object-cover" />
                <AvatarFallback className="bg-[#e8eefe] text-[18px] font-medium text-[#5e85ee]">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[8px]">
                  <p className="text-[20px] leading-[30px] text-[#1c1c26]">{displayName}</p>
                  <MemberHistoryStatusBadge status={member.status} />
                </div>
                <p className="mt-[4px] max-w-[420px] truncate text-[14px] leading-[22px] text-[#606067]" title={member.email || undefined}>
                  {member.email || 'No email on record'}
                </p>
                <p className="mt-[2px] text-[13px] leading-[20px] text-[#8d8d93]">Member ID: {member.memberId}</p>
              </div>
            </div>

            <div className="grid gap-[12px] md:grid-cols-2 xl:min-w-[460px]">
              <DetailMetaItem label="Member Status" value={getMemberStatusDisplayName(member.memberStatus)} />
              <DetailMetaItem label="Created At" value={formatUtcDateTime(member.createdAt)} />
              <DetailMetaItem label="Updated At" value={formatUtcDateTime(member.updatedAt)} />
              <DetailMetaItem label="Deleted At" value={formatUtcDateTime(member.deletedAt)} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[32px]">
          <div className="flex flex-col gap-[12px]">
            <p className="text-[18px] leading-[28px] text-[#1c1c26]">Payout Summary (This Org)</p>

            <div className="overflow-hidden rounded-[32px] bg-white p-[24px]">
              <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[220px] pl-0">Date</TableHead>
                      <TableHead className="w-[320px]">Transaction</TableHead>
                      <TableHead className="pr-0">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutHistory.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={3} className="px-0 py-[48px] text-center text-[14px] leading-[22px] text-[#8d8d93]">
                          No payout history for this member.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payoutHistory.map(item => {
                        const decimals = item.amount.decimals ?? 0
                        const symbol = item.amount.symbol || item.amount.tokenAddress?.slice(0, 6)?.toUpperCase() || ''
                        const transactionLabel = item.transactionName || item.batchId

                        return (
                          <TableRow key={`${item.batchId}-${item.analyticsDate}`}>
                            <TableCell className="pl-0 text-[16px] leading-[24px] text-[#1c1c26]">
                              {formatUtcDate(item.analyticsDate)}
                            </TableCell>
                            <TableCell className="max-w-[320px]">
                              <Button
                                variant="ghost"
                                className="h-auto max-w-full justify-start px-0 py-0 text-[14px] font-normal text-[#1c1c26] hover:bg-transparent hover:text-[#5e85ee]"
                                onClick={() => navigate(`/orgs/transaction/${item.batchId}`)}
                              >
                                <span className="truncate" title={transactionLabel}>
                                  {transactionLabel}
                                </span>
                              </Button>
                            </TableCell>
                            <TableCell className="pr-0 text-[14px] leading-[22px] text-[#1c1c26]">
                              {formatTokenAmount(item.amount.amount, decimals)} {symbol}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[12px]">
            <p className="text-[18px] leading-[28px] text-[#1c1c26]">Activity Log</p>

            <div className="rounded-[32px] bg-white p-[24px]">
              {activityLogs.length === 0 ? (
                <p className="py-[24px] text-[14px] leading-[22px] text-[#8d8d93]">No activity logs for this member.</p>
              ) : (
                <div className="flex flex-col gap-[24px]">
                  {activityLogs.map((log, index) => (
                    <div key={`${log.eventType}-${log.createdAt}-${index}`} className="flex flex-col gap-[2px]">
                      <p className="text-[14px] leading-[22px] text-[#8d8d93]">{formatUtcDateTime(log.createdAt)}</p>
                      <p className="text-[16px] leading-[24px] text-[#1c1c26]">{log.displayText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px] pb-[24px]">
      <AnalyticsTopBar
        tabsNav={tabsNav}
        actions={
          selectedMemberId ? (
            <Button
              variant="outline"
              className="h-[44px] rounded-[12px] border-[rgba(0,0,0,0.12)] bg-white px-[14px] text-[14px] font-normal text-[#1c1c26] shadow-none hover:bg-[#f5f5f5]"
              onClick={() => setSelectedMemberId(null)}
            >
              <ChevronLeft className="h-[16px] w-[16px]" />
              Back to List
            </Button>
          ) : (
            <>
              <div className="flex h-[44px] w-full min-w-[240px] items-center gap-[8px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] md:w-[280px]">
                <Search className="h-[16px] w-[16px] shrink-0 text-[#8d8d93]" />
                <Input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search by member ID, name, email..."
                  className="h-auto border-0 bg-transparent px-0 py-0 text-[14px] leading-[22px] text-[#1c1c26] shadow-none focus-visible:ring-0"
                />
              </div>

              <Select value={statusFilter} onValueChange={value => setStatusFilter(value as 'all' | MemberHistoryStatus)}>
                <SelectTrigger className="h-[44px] min-w-[160px] rounded-[12px] border-[rgba(0,0,0,0.12)] bg-white text-[14px] text-[#1c1c26] shadow-none focus:ring-0 focus:ring-offset-0 md:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[16px]">
                  {STATUS_FILTER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AnalyticsExportButton onClick={handleExport} disabled={!listData?.data.length} />
            </>
          )
        }
      />

      {selectedMemberId ? renderDetailContent() : renderListContent()}
    </div>
  )
}
