import apis from '@/apis'
import type { ApiKeyCreatedItem, ApiKeyItem } from '@/apis/api-key.api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScrollArea,
  TableSkeletonRows,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { formatUtcDate, formatUtcDateTime } from '@/utils/date'
import { useTranslation } from '@/utils/i18n'
import { Copy, Plus, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

const PAGE_SIZE = 10
const SCOPE_OPTIONS = ['mcp:read', 'mcp:write']
const EXPIRATION_OPTIONS = [0, 30, 90, 365]

function KeyStatusPill({ status }: { status: string }) {
  const tone =
    status === 'active'
      ? 'bg-[rgba(93,221,34,0.12)] text-[#2f9d1d]'
      : 'bg-[rgba(28,28,38,0.08)] text-[#606067]'
  const label = status === 'active' ? 'Active' : 'Revoked'
  return <span className={`inline-flex rounded-full px-[10px] py-[4px] text-[12px] font-medium ${tone}`}>{label}</span>
}

function ScopePill({ scope }: { scope: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#f5f5f5] px-[10px] py-[4px] text-[12px] font-medium text-[#606067]">
      {scope}
    </span>
  )
}

export function ApiKeySection() {
  const { toast } = useToast()
  const { t } = useTranslation()

  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...SCOPE_OPTIONS])
  const [expirationDays, setExpirationDays] = useState(0)
  const [creating, setCreating] = useState(false)

  const [plainKeyResult, setPlainKeyResult] = useState<ApiKeyCreatedItem | null>(null)
  const [copyingPlainKey, setCopyingPlainKey] = useState(false)

  const [revokingTarget, setRevokingTarget] = useState<ApiKeyItem | null>(null)
  const [revoking, setRevoking] = useState(false)

  const [rotatingTarget, setRotatingTarget] = useState<ApiKeyItem | null>(null)
  const [rotating, setRotating] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    fetchKeys()
  }, [page])

  const fetchKeys = async () => {
    try {
      setLoading(true)
      const res = await apis.apiKey.getApiKeys({ page, pageSize: PAGE_SIZE })
      setKeys(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch {
      // request interceptor handles API errors
    } finally {
      setLoading(false)
    }
  }

  const resetCreateForm = () => {
    setCreateName('')
    setNameError(false)
    setSelectedScopes([...SCOPE_OPTIONS])
    setExpirationDays(0)
  }

  const handleToggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(item => item !== scope) : [...prev, scope],
    )
  }

  const handleCreate = async () => {
    if (!createName.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    try {
      setCreating(true)
      const created = await apis.apiKey.createApiKey({
        name: createName.trim(),
        scopes: selectedScopes,
        expiresInDays: expirationDays || undefined,
      })
      setCreateOpen(false)
      resetCreateForm()
      setPlainKeyResult(created)
      fetchKeys()
    } catch {
      // request interceptor handles API errors
    } finally {
      setCreating(false)
    }
  }

  const handleCopyPlainKey = async () => {
    if (!plainKeyResult) return
    try {
      setCopyingPlainKey(true)
      await navigator.clipboard.writeText(plainKeyResult.plainKey)
      toast({ title: t('pages.orgMembers.success'), description: t('pages.orgSettings.apiKeyCopied') })
    } catch {
      toast({ variant: 'destructive', title: t('common.error'), description: t('pages.orgSettings.apiKeyCopyFailed') })
    } finally {
      setCopyingPlainKey(false)
    }
  }

  const confirmRevoke = async () => {
    if (!revokingTarget) return
    try {
      setRevoking(true)
      await apis.apiKey.revokeApiKey(revokingTarget.id)
      setRevokingTarget(null)
      toast({ title: t('pages.orgMembers.success'), description: t('pages.orgSettings.apiKeyRevoked') })
      fetchKeys()
    } catch {
      // request interceptor handles API errors
    } finally {
      setRevoking(false)
    }
  }

  const confirmRotate = async () => {
    if (!rotatingTarget) return
    try {
      setRotating(true)
      const rotated = await apis.apiKey.rotateApiKey(rotatingTarget.id)
      setRotatingTarget(null)
      setPlainKeyResult(rotated)
      fetchKeys()
    } catch {
      // request interceptor handles API errors
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
        {t('pages.orgSettings.apiKeys')}
      </p>

      <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">
        <div className="flex flex-col gap-[16px] md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] leading-[20px] text-[#8d8d93]">{t('pages.orgSettings.apiKeysDescription')}</p>
          <Button
            className="h-[36px] shrink-0 rounded-[12px] bg-[#5e85ee] px-[16px] text-[13px] hover:bg-[#5e85ee] hover:opacity-90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t('pages.orgSettings.createApiKey')}
          </Button>
        </div>

        <TableScrollArea>
          <Table className="min-w-[900px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyName')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyKey')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyScopes')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyStatus')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyLastUsed')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyExpires')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('pages.orgSettings.apiKeyAction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows rows={4} cols={7} />
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-[10px] py-[32px]">
                      <img src="/empty-table.svg" alt={t('pages.orgSettings.apiKeyNoKeysAlt')} className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">{t('pages.orgSettings.apiKeyNoKeysFound')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                keys.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-[12px] text-[#606067]">{item.prefix}••••••••</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-[6px]">
                        {(item.scopes ?? []).map(scope => (
                          <ScopePill key={scope} scope={scope} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><KeyStatusPill status={item.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] text-[#606067]">
                      {item.lastUsedAt ? formatUtcDateTime(item.lastUsedAt) : '--'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] text-[#606067]">
                      {item.expiresAt ? formatUtcDate(item.expiresAt) : t('pages.orgSettings.apiKeyNeverExpires')}
                    </TableCell>
                    <TableCell>
                      {item.status === 'active' ? (
                        <div className="flex items-center gap-[12px]">
                          <button
                            type="button"
                            className="text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => setRotatingTarget(item)}
                          >
                            {t('pages.orgSettings.apiKeyRotate')}
                          </button>
                          <button
                            type="button"
                            className="text-[13px] text-[#d92b2b] transition-opacity hover:opacity-70"
                            onClick={() => setRevokingTarget(item)}
                          >
                            {t('pages.orgSettings.apiKeyRevoke')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[13px] text-[#8d8d93]">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableScrollArea>

        <div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            pageSize={PAGE_SIZE}
            itemLabel={t('pages.orgSettings.apiKeyKeys')}
            summaryText={t('pages.orgSettings.apiKeyTotalSummary', {
              total,
              pages: totalPages,
              suffix: totalPages === 1 ? '' : 's',
            })}
          />
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={open => {
        if (!creating && !open) {
          setCreateOpen(false)
          resetCreateForm()
        }
      }}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{t('pages.orgSettings.createApiKey')}</DialogTitle>
          </DialogHeader>

          <div className="mt-[12px] grid gap-[20px]">
            <div className="grid gap-[8px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">{t('pages.orgSettings.apiKeyName')}</span>
              <Input
                className="h-[44px] rounded-[14px] border-[rgba(0,0,0,0.12)] px-[16px] text-[15px] shadow-none"
                value={createName}
                onChange={event => {
                  setCreateName(event.target.value)
                  if (event.target.value.trim()) setNameError(false)
                }}
                placeholder={t('pages.orgSettings.apiKeyNamePlaceholder')}
              />
              {nameError && (
                <div className="flex items-center gap-[4px]">
                  <XCircle className="h-[14px] w-[14px] text-[#d92b2b] shrink-0" />
                  <p className="text-[12px] leading-[20px] text-[#d92b2b]">{t('pages.orgSettings.apiKeyNameRequired')}</p>
                </div>
              )}
            </div>

            <div className="grid gap-[10px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">{t('pages.orgSettings.apiKeyScopes')}</span>
              <p className="text-[12px] leading-[18px] text-[#8d8d93]">{t('pages.orgSettings.apiKeyScopesHint')}</p>
              <div className="flex flex-wrap items-center gap-[8px]">
                {SCOPE_OPTIONS.map(scope => {
                  const active = selectedScopes.includes(scope)
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => handleToggleScope(scope)}
                      className={`rounded-full px-[14px] py-[6px] text-[12px] font-medium transition-colors ${
                        active ? 'bg-[#5e85ee] text-white' : 'bg-[#f5f5f5] text-[#606067] hover:bg-[#ebebef]'
                      }`}
                    >
                      {scope}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-[10px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">{t('pages.orgSettings.apiKeyExpiration')}</span>
              <div className="flex flex-wrap items-center gap-[8px]">
                {EXPIRATION_OPTIONS.map(days => {
                  const active = expirationDays === days
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExpirationDays(days)}
                      className={`rounded-full px-[14px] py-[6px] text-[12px] font-medium transition-colors ${
                        active ? 'bg-[#5e85ee] text-white' : 'bg-[#f5f5f5] text-[#606067] hover:bg-[#ebebef]'
                      }`}
                    >
                      {days === 0 ? t('pages.orgSettings.apiKeyNeverExpires') : t('pages.orgSettings.apiKeyDays', { days })}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm() }} disabled={creating}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-[#5e85ee] hover:bg-[#5e85ee] hover:opacity-90"
              onClick={() => void handleCreate()}
              disabled={creating || selectedScopes.length === 0}
            >
              {creating ? t('pages.orgSettings.apiKeyCreating') : t('pages.orgSettings.createApiKey')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(plainKeyResult)}
        onOpenChange={open => {
          if (!copyingPlainKey && !open) setPlainKeyResult(null)
        }}
      >
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t('pages.orgSettings.apiKeyPlainTitle')}</DialogTitle>
            <DialogDescription>{t('pages.orgSettings.apiKeyPlainDescription')}</DialogDescription>
          </DialogHeader>

          <div className="mt-[12px] flex flex-col overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#f5f5f5] md:flex-row">
            <div className="min-w-0 flex-1 px-[14px] py-[10px]">
              <code className="block overflow-x-auto whitespace-nowrap font-mono text-[13px] leading-[20px] text-[#1c1c26]">
                {plainKeyResult?.plainKey}
              </code>
            </div>
            <div className="border-t border-[rgba(0,0,0,0.08)] md:border-l md:border-t-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleCopyPlainKey()}
                disabled={copyingPlainKey}
                className="h-full w-full rounded-none px-[12px] text-[13px] text-[#606067] hover:bg-[#ebebef] md:min-w-[110px]"
              >
                <Copy className="h-[14px] w-[14px]" />
                {t('pages.orgSettings.copyCommand')}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setPlainKeyResult(null)}>{t('pages.orgSettings.apiKeyDone')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokingTarget)}
        onOpenChange={open => {
          if (!revoking && !open) setRevokingTarget(null)
        }}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('pages.orgSettings.apiKeyRevokeTitle')}</DialogTitle>
            <DialogDescription>
              {revokingTarget ? t('pages.orgSettings.apiKeyRevokeDescription', { name: revokingTarget.name }) : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokingTarget(null)} disabled={revoking}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmRevoke()} disabled={revoking}>
              {revoking ? t('pages.orgSettings.apiKeyRevoking') : t('pages.orgSettings.apiKeyRevoke')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rotatingTarget)}
        onOpenChange={open => {
          if (!rotating && !open) setRotatingTarget(null)
        }}
      >
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t('pages.orgSettings.apiKeyRotateTitle')}</DialogTitle>
            <DialogDescription>
              {rotatingTarget ? t('pages.orgSettings.apiKeyRotateDescription', { name: rotatingTarget.name }) : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRotatingTarget(null)} disabled={rotating}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-[#5e85ee] hover:bg-[#5e85ee] hover:opacity-90"
              onClick={() => void confirmRotate()}
              disabled={rotating}
            >
              {rotating ? t('pages.orgSettings.apiKeyRotating') : t('pages.orgSettings.apiKeyRotate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
