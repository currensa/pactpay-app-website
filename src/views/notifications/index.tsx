import apis from '@/apis'
import type { NotificationItem } from '@/apis/notification.api'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/use-toast'
import useNotificationStore from '@/stores/notification'
import useOrganizationStore from '@/stores/organization'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const PAGE_SIZE = 20

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCta(html: string): { text: string; href: string } | null {
  const match = html.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
  if (!match) return null
  return { href: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() }
}

function removeCta(html: string): string {
  return html.replace(/<a[^>]+href="[^"]+"[^>]*>[\s\S]*?<\/a>/i, ' ')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\//g, '/').replace(',', '')
}

// ─── Notification body renderer (for CTA links via react-router) ─────────────

function NotificationBody({ html }: { html: string }) {
  const navigate = useNavigate()
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (href?.startsWith('/')) {
      e.preventDefault()
      navigate(href)
    }
  }
  return <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({
  item,
  selected,
  onSelect,
  onMarkRead,
}: {
  item: NotificationItem
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onMarkRead: (id: string) => void
}) {
  const navigate = useNavigate()
  const cta = extractCta(item.body)
  const preview = stripHtml(removeCta(item.body))
  const isUnread = !item.readAt

  const handleCta = () => {
    if (!item.readAt) onMarkRead(item.id)
    if (cta?.href?.startsWith('/')) navigate(cta.href)
  }

  return (
    <div className="flex gap-[24px] items-start pb-[16px] border-b border-[rgba(0,0,0,0.12)]">
      {/* Checkbox */}
      <div className="flex items-center justify-center p-[10px] shrink-0 h-[24px] w-[24px] mt-[2px]">
        <div
          onClick={() => onSelect(item.id, !selected)}
          className={`h-[16px] w-[16px] rounded-[3px] border border-[rgba(0,0,0,0.12)] cursor-pointer flex items-center justify-center shrink-0 ${selected ? 'bg-[#5e85ee] border-[#5e85ee]' : 'bg-white'
            }`}
        >
          {selected && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-[4px] min-w-0">
        <div className="flex items-center gap-[8px] w-full min-w-0">
          {/* Unread dot */}
          {isUnread && (
            <div className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#5e85ee]" />
          )}
          <p className="text-[15px] leading-[24px] font-bold text-[#1c1c26] shrink-0 max-w-[40%] truncate">
            {item.title}
          </p>
          <p className="flex-1 text-[15px] leading-[24px] text-[#8d8d93] truncate min-w-0">
            {preview}
          </p>
        </div>
        <p className="text-[13px] leading-[22px] text-[#8d8d93]">{formatDate(item.createdAt)}</p>
      </div>

      {/* CTA */}
      {cta && (
        <button
          onClick={handleCta}
          className="shrink-0 py-[10px] text-[14px] leading-[22px] text-[#5e85ee] hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          {cta.text}
        </button>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { toast } = useToast()
  const { setUnreadCount } = useNotificationStore()
  const { currentOrgId } = useOrganizationStore()
  const location = useLocation()
  const isMember = location.pathname.startsWith('/member')
  const orgId = isMember ? undefined : (currentOrgId ?? undefined)

  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const allSelected = items.length > 0 && selected.size === items.length

  useEffect(() => {
    loadPage(1)
  }, [orgId, unreadOnly])

  useEffect(() => {
    if (page === 1) return
    loadPage(page)
  }, [page])

  const loadPage = async (p: number) => {
    try {
      setLoading(true)
      setSelected(new Set())
      const data = await apis.notification.getList({
        ...(orgId ? { orgId } : {}),
        page: p,
        pageSize: PAGE_SIZE,
        ...(unreadOnly ? { unreadOnly: true } : {}),
      })
      setItems(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to load notifications.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await apis.notification.markAllRead(orgId ? { orgId } : {})
      setUnreadCount(0)
      setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to mark all as read.', variant: 'destructive' })
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await apis.notification.markRead(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      setUnreadCount(0) // will be re-fetched by polling
    } catch {
      // silent
    }
  }

  const handleSelect = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map(i => i.id)))
  }

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="bg-white rounded-[32px] p-[24px] flex flex-col gap-[24px]">

        {/* Toolbar */}
        <div className="flex items-center justify-between h-[44px] shrink-0">
          <div className="flex items-center gap-[12px]">
            {/* Select all checkbox */}
            <div className="flex items-center justify-center p-[10px] h-[24px] w-[24px]">
              <div
                onClick={toggleSelectAll}
                className={`h-[16px] w-[16px] rounded-[3px] border cursor-pointer flex items-center justify-center shrink-0 ${allSelected
                  ? 'bg-[#5e85ee] border-[#5e85ee]'
                  : 'bg-white border-[rgba(0,0,0,0.12)]'
                  }`}
              >
                {allSelected && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>

            {/* Status filter */}
            <div className="relative">
              <button
                onClick={() => setStatusOpen(v => !v)}
                className="flex items-center justify-between gap-[8px] border border-[rgba(0,0,0,0.12)] rounded-[12px] px-[16px] py-[10px] min-w-[140px] text-[15px] leading-[24px] text-[#8d8d93] outline-none"
              >
                <span>{unreadOnly ? 'Unread' : 'Status'}</span>
                <ChevronDown className="h-[20px] w-[20px] shrink-0" />
              </button>
              {statusOpen && (
                <div className="absolute top-full left-0 mt-[4px] bg-white rounded-[12px] border border-[rgba(0,0,0,0.12)] shadow-lg z-10 overflow-hidden min-w-[140px]">
                  {[{ label: 'All', value: false }, { label: 'Unread', value: true }].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => { setUnreadOnly(opt.value); setStatusOpen(false); setPage(1) }}
                      className={`w-full px-[16px] py-[10px] text-left text-[14px] leading-[22px] hover:bg-[#f5f5f5] transition-colors ${unreadOnly === opt.value ? 'text-[#5e85ee] font-medium' : 'text-[#1c1c26]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mark all as read */}
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-[4px] border border-[rgba(0,0,0,0.12)] rounded-[12px] px-[14px] py-[10px] text-[14px] leading-[22px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
          >
            Mark all as read
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-[16px]">
          {loading ? (
            <p className="text-[14px] text-[#8d8d93] py-[24px] text-center">Loading...</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-[12px] py-[24px]">
              <img src="/empty-data.svg" alt="No notifications" className="h-[120px] w-[120px]" />
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">No notifications</p>
            </div>
          ) : (
            items.map(item => (
              <NotificationRow
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onSelect={handleSelect}
                onMarkRead={handleMarkRead}
              />
            ))
          )}
        </div>

        {/* Footer: count + pagination */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between shrink-0">
            <p className="text-[14px] leading-[22px] text-[#606067]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
