import apis from '@/apis'
import type {
  TokenUsagePlanApiKeyItem,
  TokenUsagePlanApiKeyStatus,
  TokenUsagePlanDetail,
  TokenUsagePlanUsageLogItem,
} from '@/apis/token-usage-plan.api'
import { localDateToUtc8Timestamp, normalizeQuotaToUsdAmount, utc8TimestampToLocalDate } from '@/apis/token-usage-plan.api'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/datePickerInput'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import useHeaderStore from '@/stores/header'
import useOrganizationStore from '@/stores/organization'
import { Check, ChevronDown, Copy, Eye, EyeOff, Plus, Search, Terminal } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatDisplayAmount, getErrorMessage, getModelLabel, getModelValue } from './components/ai-api/utils'

type KeyEditorState = {
  open: boolean
  mode: 'create' | 'edit'
  apiKey: TokenUsagePlanApiKeyItem | null
  name: string
  group: string
  expirationMode: 'never' | '1month' | '1week' | '1day' | 'date'
  expirationDate: Date | null
  quotaMode: 'unlimited' | 'amount'
  quotaAmount: string
  selectedModels: string[]
}

type ExpirationPresetMode = Exclude<KeyEditorState['expirationMode'], 'date' | 'never'>

const defaultEditorState: KeyEditorState = {
  open: false,
  mode: 'create',
  apiKey: null,
  name: '',
  group: 'default',
  expirationMode: 'never',
  expirationDate: null,
  quotaMode: 'unlimited',
  quotaAmount: '',
  selectedModels: [],
}

const DEFAULT_GROUP = 'default'
const USAGE_LOGS_PAGE_SIZE = 20
const EXPIRATION_OPTIONS: Array<{ label: string; value: 'never' | ExpirationPresetMode }> = [
  { label: 'Never expires', value: 'never' },
  { label: '1 month', value: '1month' },
  { label: '1 week', value: '1week' },
  { label: '1 day', value: '1day' },
]
const integerFormatter = new Intl.NumberFormat('en-US')

function StatusPill({ status }: { status: 'Active' | 'Disabled' | TokenUsagePlanApiKeyStatus }) {
  const tone = status === 'Active'
    ? 'bg-[rgba(93,221,34,0.12)] text-[#2f9d1d]'
    : status === 'Disabled'
      ? 'bg-[rgba(28,28,38,0.08)] text-[#606067]'
      : 'bg-[rgba(217,43,43,0.08)] text-[#d92b2b]'
  return <span className={`inline-flex rounded-full px-[10px] py-[4px] text-[12px] font-medium ${tone}`}>{status}</span>
}

function ModelPill({ model }: { model: string }) {
  const normalized = model.toLowerCase()
  const tone = normalized.includes('claude')
    ? { dot: 'bg-[#dd7a1f]', text: 'text-[#606067]' }
    : normalized.includes('gpt')
      ? { dot: 'bg-[#20b486]', text: 'text-[#606067]' }
      : normalized.includes('llama')
        ? { dot: 'bg-[#2f80ed]', text: 'text-[#606067]' }
        : { dot: 'bg-[#8d8d93]', text: 'text-[#606067]' }

  return (
    <span className={`inline-flex items-center gap-[6px] rounded-full bg-[#f5f5f5] px-[10px] py-[4px] text-[12px] font-medium ${tone.text}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${tone.dot}`} />
      <span className="whitespace-nowrap">{model}</span>
    </span>
  )
}

function addDurationDate(mode: ExpirationPresetMode) {
  const now = new Date()
  if (mode === '1day') return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (mode === '1week') return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
}

function buildExpiredTime(mode: KeyEditorState['expirationMode'], dateValue: Date | null) {
  if (mode === 'never') return -1
  if (mode === '1day' || mode === '1week' || mode === '1month') {
    return localDateToUtc8Timestamp(dateValue ?? addDurationDate(mode))
  }
  if (!dateValue) return -1
  return localDateToUtc8Timestamp(dateValue)
}

function formatUsdDisplay(value: string) {
  const normalized = String(value || '0').trim()
  return `$${normalized || '0'}`
}

function formatIntegerDisplay(value: number) {
  return integerFormatter.format(Math.max(0, Number.isFinite(value) ? value : 0))
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}

function formatUsageLogTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '-'
  const date = new Date(timestamp * 1000)
  if (Number.isNaN(date.getTime())) return '-'
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-') + ` ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {}
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function readAmount(value: unknown, quotaValue: unknown): number {
  const direct = readNumber(value)
  if (direct != null) return Math.max(0, direct)
  const quota = readNumber(quotaValue)
  if (quota != null) return Math.max(0, Number(normalizeQuotaToUsdAmount(quota)))
  return 0
}

function resolveApiKeyUsage(rawValue: unknown) {
  const raw = asRecord(rawValue)
  const unlimitedQuota = Boolean(raw.unlimited_quota)
  const usedAmount = readAmount(null, raw.used_quota)
  if (unlimitedQuota) {
    return {
      unlimitedQuota: true,
      usedDisplay: formatUsdDisplay(String(usedAmount)),
      totalDisplay: null,
      progress: 0,
    }
  }

  const totalAmount = readAmount(null, raw.remain_quota + raw.used_quota)
  const progress = totalAmount > 0 ? Math.max(0, Math.min(100, (usedAmount / totalAmount) * 100)) : 0

  return {
    unlimitedQuota: false,
    usedDisplay: formatUsdDisplay(String(usedAmount)),
    totalDisplay: formatUsdDisplay(String(totalAmount)),
    progress,
  }
}

function getApiKeyStatusLabel(apiKey: TokenUsagePlanApiKeyItem): TokenUsagePlanApiKeyStatus {
  if (apiKey.status === 4) return 'Exhausted'
  if (apiKey.status === 3) return 'Expired'
  if (apiKey.status === 2) return 'Disabled'
  return 'Active'
}

function formatApiKeyExpiration(expiredTime: number) {
  if (expiredTime === -1) return 'Never expires'
  return utc8TimestampToLocalDate(expiredTime)?.toLocaleString() || '-'
}

function formatApiKeyQuota(apiKey: TokenUsagePlanApiKeyItem) {
  if (apiKey.unlimited_quota) return 'Unlimited'
  return formatUsdDisplay(normalizeQuotaToUsdAmount(apiKey.remain_quota))
}

function shouldBlockInputKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false

  const blockedKeys = new Set([
    'Backspace',
    'Delete',
    'Enter',
    'Tab',
  ])

  return blockedKeys.has(event.key) || event.key.length === 1
}

export default function TokenUsagePlanDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { setHeader, clearHeader } = useHeaderStore()
  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)

  const [detail, setDetail] = useState<TokenUsagePlanDetail | null>(null)
  const [apiKeys, setApiKeys] = useState<TokenUsagePlanApiKeyItem[]>([])
  const [usageLogs, setUsageLogs] = useState<TokenUsagePlanUsageLogItem[]>([])
  const [models, setModels] = useState<Array<string | Record<string, any>>>([])
  const [loading, setLoading] = useState(true)
  const [keysLoading, setKeysLoading] = useState(true)
  const [usageLogsLoading, setUsageLogsLoading] = useState(false)
  const [usageLogsTotal, setUsageLogsTotal] = useState(0)
  const [usageLogsPageSize, setUsageLogsPageSize] = useState(USAGE_LOGS_PAGE_SIZE)
  const [savingKey, setSavingKey] = useState(false)
  const [deletingKey, setDeletingKey] = useState(false)
  const [editor, setEditor] = useState<KeyEditorState>(defaultEditorState)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})
  const [fullKeys, setFullKeys] = useState<Record<string, string>>({})
  const [revealingKeyIds, setRevealingKeyIds] = useState<Record<string, boolean>>({})
  const [copyingKeyIds, setCopyingKeyIds] = useState<Record<string, boolean>>({})
  const [copyingTestCommandIds, setCopyingTestCommandIds] = useState<Record<string, boolean>>({})
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Record<string, boolean>>({})
  const [apiKeyToDelete, setApiKeyToDelete] = useState<TokenUsagePlanApiKeyItem | null>(null)
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const activeTab = searchParams.get('tab') === 'usage-logs' ? 'usage-logs' : 'api-keys'
  const usageLogsPage = useMemo(() => {
    const parsed = Number(searchParams.get('logsPage') || '1')
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
  }, [searchParams])

  const filteredModels = useMemo(() => {
    const keyword = modelSearch.trim().toLowerCase()
    if (!keyword) return models
    return models.filter(model => {
      const label = getModelLabel(model).toLowerCase()
      const value = getModelValue(model).toLowerCase()
      return label.includes(keyword) || value.includes(keyword)
    })
  }, [modelSearch, models])

  const selectedModelTags = useMemo(() => editor.selectedModels.map(modelValue => {
    const matchedModel = models.find(model => getModelValue(model) === modelValue)
    return {
      value: modelValue,
      label: matchedModel ? getModelLabel(matchedModel) : modelValue,
    }
  }), [editor.selectedModels, models])

  const usageLogsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(usageLogsTotal / Math.max(usageLogsPageSize, 1))),
    [usageLogsPageSize, usageLogsTotal],
  )
  const usageLogsPageCountDisplay = usageLogsTotal === 0 ? 0 : usageLogsTotalPages

  const setActiveTab = (tab: 'api-keys' | 'usage-logs') => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'usage-logs') next.set('tab', 'usage-logs')
    else next.delete('tab')
    next.delete('logsPage')
    setSearchParams(next, { replace: true })
  }

  const setUsageLogsPageParam = (page: number) => {
    const normalizedPage = Math.max(1, Math.floor(page))
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'usage-logs')
    if (normalizedPage === 1) next.delete('logsPage')
    else next.set('logsPage', String(normalizedPage))
    setSearchParams(next, { replace: true })
  }

  const fetchDetail = async () => {
    const response = await apis.tokenUsagePlan.getUsagePlanDetail(id)
    setDetail(response)
    setHeader({
      backUrl: '/orgs/members?tab=ai-api',
      breadcrumb: [
        { label: 'Payees', href: '/orgs/members?tab=ai-api' },
        { label: response.plan.planName || 'Usage Plan' },
      ],
    })
  }

  const fetchKeys = async () => {
    setKeysLoading(true)
    try {
      const response = await apis.tokenUsagePlan.getApiKeys(id)
      setApiKeys(response.data.items)
    } finally {
      setKeysLoading(false)
    }
  }

  const fetchReferenceData = async () => {
    try {
      const modelList = await apis.tokenUsagePlan.getPlanModels(id)
      setModels(modelList)
    } catch (error) {
      console.error(error)
    }
  }

  const refreshAll = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchDetail(), fetchKeys(), fetchReferenceData()])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to load usage plan detail.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshAll()
    return () => clearHeader()
  }, [id])

  useEffect(() => {
    if (activeTab !== 'usage-logs') return

    let cancelled = false

    const fetchUsageLogs = async () => {
      setUsageLogsLoading(true)
      try {
        const response = await apis.tokenUsagePlan.getUsageLogs(id, {
          page: usageLogsPage,
          pageSize: USAGE_LOGS_PAGE_SIZE,
          type: 2,
        })

        if (cancelled) return

        setUsageLogs(response.list)
        setUsageLogsTotal(response.total)
        setUsageLogsPageSize(response.pageSize || USAGE_LOGS_PAGE_SIZE)

        const resolvedTotalPages = Math.max(1, Math.ceil(response.total / Math.max(response.pageSize || USAGE_LOGS_PAGE_SIZE, 1)))
        const resolvedPage = Math.min(Math.max(response.page, 1), resolvedTotalPages)
        if (resolvedPage !== usageLogsPage) {
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('tab', 'usage-logs')
            if (resolvedPage === 1) next.delete('logsPage')
            else next.set('logsPage', String(resolvedPage))
            return next
          }, { replace: true })
        }
      } catch (error: any) {
        if (cancelled) return
        toast({
          title: 'Error',
          description: getErrorMessage(error, 'Failed to load usage logs.'),
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setUsageLogsLoading(false)
      }
    }

    void fetchUsageLogs()

    return () => {
      cancelled = true
    }
  }, [activeTab, id, usageLogsPage])

  const openCreateDialog = () => {
    setEditor({
      ...defaultEditorState,
      open: true,
      group: DEFAULT_GROUP,
    })
    setModelSearch('')
    setModelPopoverOpen(false)
  }

  const openEditDialog = (apiKey: TokenUsagePlanApiKeyItem) => {
    const localExpirationDate = utc8TimestampToLocalDate(apiKey.expired_time)
    setEditor({
      open: true,
      mode: 'edit',
      apiKey,
      name: apiKey.name,
      group: apiKey.group || DEFAULT_GROUP,
      expirationMode: apiKey.expired_time === -1 ? 'never' : 'date',
      expirationDate: localExpirationDate,
      quotaMode: apiKey.unlimited_quota ? 'unlimited' : 'amount',
      quotaAmount: normalizeQuotaToUsdAmount(apiKey.remain_quota),
      selectedModels: String(apiKey.model_limits || '')
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean),
    })
    setModelSearch('')
    setModelPopoverOpen(false)
  }

  const closeDialog = () => {
    setEditor(defaultEditorState)
    setModelSearch('')
    setModelPopoverOpen(false)
  }

  const ensureFullKey = async (apiKey: TokenUsagePlanApiKeyItem) => {
    if (fullKeys[apiKey.id]) return fullKeys[apiKey.id]
    const key = await apis.tokenUsagePlan.getApiKeyKey(id, String(apiKey.id))
    const resolvedKey = key || apiKey.key
    if (!resolvedKey) throw new Error('Failed to load full key.')
    setFullKeys(prev => ({ ...prev, [apiKey.id]: resolvedKey }))
    return resolvedKey
  }

  const handleToggleReveal = async (apiKey: TokenUsagePlanApiKeyItem) => {
    if (revealedKeys[apiKey.id]) {
      setRevealedKeys(prev => ({ ...prev, [apiKey.id]: false }))
      return
    }

    try {
      setRevealingKeyIds(prev => ({ ...prev, [apiKey.id]: true }))
      await ensureFullKey(apiKey)
      setRevealedKeys(prev => ({ ...prev, [apiKey.id]: true }))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to load full key.'),
        variant: 'destructive',
      })
    } finally {
      setRevealingKeyIds(prev => ({ ...prev, [apiKey.id]: false }))
    }
  }

  const handleCopyKey = async (apiKey: TokenUsagePlanApiKeyItem) => {
    try {
      setCopyingKeyIds(prev => ({ ...prev, [apiKey.id]: true }))
      const key = await ensureFullKey(apiKey)
      await navigator.clipboard.writeText(key)
      toast({ title: 'Success', description: 'Key copied.' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to copy key.'),
        variant: 'destructive',
      })
    } finally {
      setCopyingKeyIds(prev => ({ ...prev, [apiKey.id]: false }))
    }
  }

  const handleCopyTestCommand = async (apiKey: TokenUsagePlanApiKeyItem) => {
    try {
      setCopyingTestCommandIds(prev => ({ ...prev, [apiKey.id]: true }))
      const response = await apis.tokenUsagePlan.getApiKeyTestCommand(id, String(apiKey.id))
      if (!response.command) throw new Error('Failed to load test command.')
      await navigator.clipboard.writeText(response.command)
      toast({ title: 'Success', description: 'Test command copied.' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to copy test command.'),
        variant: 'destructive',
      })
    } finally {
      setCopyingTestCommandIds(prev => ({ ...prev, [apiKey.id]: false }))
    }
  }

  const handleToggleKeyStatus = async (apiKey: TokenUsagePlanApiKeyItem) => {
    const nextStatus = apiKey.status === 1 ? 2 : 1
    const successMessage = nextStatus === 1 ? 'Key enabled.' : 'Key disabled.'

    try {
      setUpdatingStatusIds(prev => ({ ...prev, [apiKey.id]: true }))
      await apis.tokenUsagePlan.updateApiKeyStatus(id, String(apiKey.id), nextStatus)
      toast({ title: 'Success', description: successMessage })
      await fetchKeys()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to update key status.'),
        variant: 'destructive',
      })
    } finally {
      setUpdatingStatusIds(prev => ({ ...prev, [apiKey.id]: false }))
    }
  }

  const saveKey = async () => {
    if (!editor.name.trim()) {
      toast({ title: 'Error', description: 'API name is required.', variant: 'destructive' })
      return
    }
    if (editor.quotaMode === 'amount' && !editor.quotaAmount.trim()) {
      toast({ title: 'Error', description: 'Quota amount is required.', variant: 'destructive' })
      return
    }

    try {
      setSavingKey(true)
      const payload = {
        name: editor.name.trim(),
        group: DEFAULT_GROUP,
        expiredTime: buildExpiredTime(editor.expirationMode, editor.expirationDate),
        unlimitedQuota: editor.quotaMode === 'unlimited',
        remainAmount: editor.quotaMode === 'amount' ? editor.quotaAmount.trim() : undefined,
        modelLimitsEnabled: editor.selectedModels.length > 0,
        modelLimits: editor.selectedModels.join(','),
        crossGroupRetry: false,
      }

      if (editor.mode === 'create') {
        await apis.tokenUsagePlan.createApiKey(id, payload)
        toast({ title: 'Success', description: 'Key created' })
      } else if (editor.apiKey) {
        await apis.tokenUsagePlan.updateApiKey(id, String(editor.apiKey.id), payload)
        toast({ title: 'Success', description: 'Key updated' })
      }

      closeDialog()
      await fetchKeys()
      await fetchDetail()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to save API key.'),
        variant: 'destructive',
      })
    } finally {
      setSavingKey(false)
    }
  }

  const confirmDeleteKey = async () => {
    if (!apiKeyToDelete) return

    try {
      setDeletingKey(true)
      await apis.tokenUsagePlan.deleteApiKey(id, String(apiKeyToDelete.id))
      toast({
        title: 'Success',
        description: 'Key deleted.',
      })
      setApiKeyToDelete(null)
      await fetchKeys()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to delete key.'),
        variant: 'destructive',
      })
    } finally {
      setDeletingKey(false)
    }
  }

  const profile = detail?.profile
  const remainingQuota = Math.max(0, profile?.quota ?? 0)
  const usedQuota = Math.max(0, profile?.used_quota ?? 0)
  const totalPurchased = remainingQuota + usedQuota
  const consumedRate = totalPurchased > 0 ? Math.round((usedQuota / totalPurchased) * 100) : 0
  const apiKeysCount = apiKeys.length
  const planStatus = profile?.status === 2 || detail?.plan.deletedAt ? 'Disabled' : 'Active'

  if (loading || !detail) {
    return (
      <div className="flex flex-col gap-[16px]">
        <div className="rounded-[32px] bg-white p-[20px]">
          <Table>
            <TableBody>
              <TableSkeletonRows rows={3} cols={4} />
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="rounded-[32px] bg-white p-[20px]">
        <div className="flex items-start justify-between gap-[20px]">
          <div className="flex flex-col gap-[12px]">
            <div className="flex items-center gap-[12px]">
              <p className="text-[24px] font-semibold leading-[34px] text-[#1c1c26]">{detail.plan.planName}</p>
              <StatusPill status={planStatus} />
            </div>
          </div>

          <Button
            onClick={() => navigate(`/orgs/transaction/create-ai?planId=${encodeURIComponent(detail.plan.id)}`)}
          >
            Top up
          </Button>
        </div>

        <div className="mt-[20px] grid gap-[12px] md:grid-cols-4">
          <div className="rounded-[20px] bg-[#f5f5f5] p-[16px]">
            <p className="text-[13px] text-[#8d8d93]">Total Purchased</p>
            <p className="mt-[8px] text-[20px] font-semibold text-[#1c1c26]">
              {formatUsdDisplay(normalizeQuotaToUsdAmount(totalPurchased))}
            </p>
          </div>
          <div className="rounded-[20px] bg-[#f5f5f5] p-[16px]">
            <p className="text-[13px] text-[#8d8d93]">Remaining</p>
            <p className="mt-[8px] text-[20px] font-semibold text-[#1c1c26]">
              {formatUsdDisplay(normalizeQuotaToUsdAmount(remainingQuota))}
            </p>
          </div>
          <div className="rounded-[20px] bg-[#f5f5f5] p-[16px]">
            <p className="text-[13px] text-[#8d8d93]">Budget</p>
            <p className="mt-[8px] text-[20px] font-semibold text-[#1c1c26]">
              ${formatDisplayAmount(detail.plan.budget)}
            </p>
          </div>
          <div className="rounded-[20px] bg-[#f5f5f5] p-[16px]">
            <p className="text-[13px] text-[#8d8d93]">API Keys</p>
            <p className="mt-[8px] text-[20px] font-semibold text-[#1c1c26]">{apiKeysCount}</p>
          </div>
        </div>

        <div className="mt-[18px]">
          <div className="mb-[8px] flex items-center justify-between text-[13px]">
            <span className="text-[#8d8d93]">Consumption</span>
            <span className="text-[#1c1c26]">
              {formatUsdDisplay(normalizeQuotaToUsdAmount(usedQuota))} / {formatUsdDisplay(normalizeQuotaToUsdAmount(totalPurchased))} ({consumedRate}%)
            </span>
          </div>
          <div className="h-[8px] rounded-full bg-[#edf0f6]">
            <div
              className="h-[8px] rounded-full bg-[#5e85ee] transition-all"
              style={{ width: `${Math.min(100, Math.max(0, consumedRate))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[32px] bg-white p-[20px]">
        <div className="mb-[16px] flex flex-col gap-[16px] md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-[12px]">
            <div className="flex w-fit items-center gap-[8px] rounded-[18px] bg-[rgba(94,133,238,0.08)] p-[6px]">
              <button
                type="button"
                onClick={() => setActiveTab('api-keys')}
                className={`rounded-[14px] px-[14px] py-[8px] text-[13px] font-medium transition-colors ${activeTab === 'api-keys' ? 'bg-[#5e85ee] text-white' : 'text-[#5e85ee] hover:bg-white/80'
                  }`}
              >
                API Keys
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('usage-logs')}
                className={`rounded-[14px] px-[14px] py-[8px] text-[13px] font-medium transition-colors ${activeTab === 'usage-logs' ? 'bg-[#5e85ee] text-white' : 'text-[#5e85ee] hover:bg-white/80'
                  }`}
              >
                Usage Logs
              </button>
            </div>
            <div>
              <p className="text-[20px] font-semibold leading-[30px] text-[#1c1c26]">
                {activeTab === 'api-keys' ? 'API Keys' : 'Usage Logs'}
              </p>
              <p className="text-[13px] leading-[20px] text-[#8d8d93]">
                {activeTab === 'api-keys'
                  ? 'Create and manage API credentials for this usage plan.'
                  : 'Review token consumption records for this usage plan.'}
              </p>
            </div>
          </div>
          {activeTab === 'api-keys' ? (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Create Key
            </Button>
          ) : null}
        </div>

        {activeTab === 'api-keys' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>API name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Expiration time</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keysLoading ? (
                  <TableSkeletonRows rows={4} cols={7} />
                ) : apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-[10px] py-[32px]">
                        <img src="/empty-table.svg" alt="No API keys" className="h-[120px] w-[120px]" />
                        <p className="text-[13px] leading-[20px] text-[#8d8d93]">No API keys found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map(item => {
                    const revealed = revealedKeys[item.id]
                    const fullKey = fullKeys[item.id]
                    const displayKey = revealed ? (fullKey || item.key) : item.key
                    const isRevealLoading = Boolean(revealingKeyIds[item.id])
                    const isCopying = Boolean(copyingKeyIds[item.id])
                    const isCopyingTestCommand = Boolean(copyingTestCommandIds[item.id])
                    const isStatusUpdating = Boolean(updatingStatusIds[item.id])
                    const usage = resolveApiKeyUsage(item)
                    const statusLabel = getApiKeyStatusLabel(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-[8px]">
                            <Input
                              value={displayKey}
                              onChange={() => { }}
                              onBeforeInput={event => event.preventDefault()}
                              onPaste={event => event.preventDefault()}
                              onDrop={event => event.preventDefault()}
                              onCut={event => event.preventDefault()}
                              onKeyDown={event => {
                                if (shouldBlockInputKey(event)) event.preventDefault()
                              }}
                              className="h-[32px] w-[200px] cursor-text rounded-[10px] border-0 bg-[#f5f5f5] px-[10px] font-mono text-[12px] text-[#606067] shadow-none focus-visible:ring-0"
                            />
                            <button
                              type="button"
                              className="text-[#8d8d93] transition-colors hover:text-[#5e85ee] disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void handleToggleReveal(item)}
                              disabled={isRevealLoading || isCopying}
                            >
                              {revealed ? <EyeOff className="h-[14px] w-[14px]" /> : <Eye className="h-[14px] w-[14px]" />}
                            </button>
                            <button
                              type="button"
                              className="text-[#8d8d93] transition-colors hover:text-[#5e85ee] disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void handleCopyKey(item)}
                              disabled={isRevealLoading || isCopying}
                              title="Copy API key"
                            >
                              <Copy className="h-[14px] w-[14px]" />
                            </button>
                            <button
                              type="button"
                              className="text-[#8d8d93] transition-colors hover:text-[#5e85ee] disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void handleCopyTestCommand(item)}
                              disabled={isCopyingTestCommand}
                              title="Copy test command"
                            >
                              <Terminal className="h-[14px] w-[14px]" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>{formatApiKeyQuota(item)}</TableCell>
                        <TableCell>{formatApiKeyExpiration(item.expired_time)}</TableCell>
                        <TableCell>
                          {usage.unlimitedQuota ? (
                            <span className="whitespace-nowrap text-[13px] text-[#1c1c26]">{usage.usedDisplay}</span>
                          ) : (
                            <div className="min-w-[160px]">
                              <div className="text-[13px] leading-[18px] text-[#1c1c26]">
                                {usage.usedDisplay} / {usage.totalDisplay}
                              </div>
                              <div className="mt-[6px] h-[4px] w-[140px] overflow-hidden rounded-full bg-[#edf0f6]">
                                <div
                                  className="h-full rounded-full bg-[#5e85ee] transition-[width]"
                                  style={{ width: `${usage.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell><StatusPill status={statusLabel} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-[12px]">
                            <button
                              type="button"
                              className="text-[13px] text-[#606067] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void handleToggleKeyStatus(item)}
                              disabled={isStatusUpdating}
                            >
                              {isStatusUpdating ? 'Saving...' : statusLabel === 'Active' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              className="text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70"
                              onClick={() => openEditDialog(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="text-[13px] text-[#d92b2b] transition-opacity hover:opacity-70"
                              onClick={() => setApiKeyToDelete(item)}
                            >
                              Delete
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Time</TableHead>
                    <TableHead className="whitespace-nowrap">API key</TableHead>
                    <TableHead className="whitespace-nowrap">Model</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Input tokens</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Cache read</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Output tokens</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Cost ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogsLoading ? (
                    <TableSkeletonRows rows={6} cols={7} />
                  ) : usageLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="flex flex-col items-center justify-center gap-[10px] py-[32px]">
                          <img src="/empty-table.svg" alt="No usage logs" className="h-[120px] w-[120px]" />
                          <p className="text-[13px] leading-[20px] text-[#8d8d93]">No usage logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageLogs.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap font-mono text-[13px] text-[#606067]">
                          {formatUsageLogTime(item.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{item.apiKeyName}</TableCell>
                        <TableCell>
                          <ModelPill model={item.modelName} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                          {formatIntegerDisplay(item.inputTokens)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-[#8d8d93]">
                          {formatIntegerDisplay(item.cacheReadTokens)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums">
                          {formatIntegerDisplay(item.outputTokens)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                          {item.costUsd}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-[20px]">
              <Pagination
                currentPage={usageLogsPage}
                totalPages={usageLogsTotalPages}
                onPageChange={setUsageLogsPageParam}
                totalItems={usageLogsTotal}
                pageSize={usageLogsPageSize}
                itemLabel="logs"
                summaryText={`Total ${formatIntegerDisplay(usageLogsTotal)} logs, ${formatIntegerDisplay(usageLogsPageCountDisplay)} page${usageLogsPageCountDisplay === 1 ? '' : 's'}`}
              />
            </div>
          </>
        )}
      </div>

      <Dialog open={editor.open} onOpenChange={open => setEditor(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editor.mode === 'create' ? 'Create API Key' : 'Edit API Key'}</DialogTitle>
          </DialogHeader>

          <div className="mt-[12px] grid gap-[20px]">
            <div className="grid gap-[8px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">API name *</span>
              <Input
                className="h-[44px] rounded-[14px] border-[rgba(0,0,0,0.12)] px-[16px] text-[15px] shadow-none"
                value={editor.name}
                onChange={event => setEditor(prev => ({ ...prev, name: event.target.value }))}
                placeholder="Please enter a name, eg, backend-dev."
              />
            </div>

            <div className="grid gap-[10px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">Expiration time *</span>
              <div className="flex flex-col gap-[10px] md:flex-row md:items-start">
                <DatePickerInput
                  value={editor.expirationDate ?? undefined}
                  onChange={date => setEditor(prev => ({
                    ...prev,
                    expirationMode: date ? 'date' : 'never',
                    expirationDate: date ?? null,
                  }))}
                  placeholder="YYYY-MM-DD HH:mm"
                  showTime
                  className="h-[54px] rounded-[14px] border border-[rgba(0,0,0,0.12)] bg-white text-[14px] shadow-none md:w-[264px]"
                />
                <div className="flex flex-wrap gap-[10px]">
                  {EXPIRATION_OPTIONS.map(option => {
                    const active = editor.expirationMode === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-full border px-[18px] py-[8px] text-[14px] transition-colors ${active
                          ? 'border-[#4f6ef7] bg-[#eef2ff] text-[#4f6ef7]'
                          : 'border-[rgba(0,0,0,0.12)] bg-white text-[#6b7280] hover:border-[#4f6ef7]'
                          }`}
                        onClick={() => setEditor(prev => {
                          if (option.value === 'never') {
                            return { ...prev, expirationMode: 'never', expirationDate: null }
                          }
                          return {
                            ...prev,
                            expirationMode: option.value,
                            expirationDate: addDurationDate(option.value),
                          }
                        })}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-[10px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">Quota</span>
              <div className="grid gap-[12px]">
                <label className="flex items-center gap-[10px] text-[15px] text-[#1c1c26]">
                  <input
                    type="radio"
                    checked={editor.quotaMode === 'unlimited'}
                    onChange={() => setEditor(prev => ({ ...prev, quotaMode: 'unlimited' }))}
                  />
                  <span>Unlimited (capped by plan balance)</span>
                </label>
                <div className="flex flex-col gap-[8px] md:flex-row md:items-center">
                  <label className="flex items-center gap-[10px] text-[15px] text-[#1c1c26]">
                    <input
                      type="radio"
                      checked={editor.quotaMode === 'amount'}
                      onChange={() => setEditor(prev => ({ ...prev, quotaMode: 'amount' }))}
                    />
                    <span>Set amount</span>
                  </label>
                  <div className="relative md:w-[136px]">
                    <span className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[13px] text-[#8d8d93]">
                      $
                    </span>
                    <Input
                      className="h-[38px] rounded-[12px] border-[#4f6ef7] pl-[24px] shadow-none"
                      value={editor.quotaMode === 'amount' ? editor.quotaAmount : ''}
                      onChange={event => setEditor(prev => ({
                        ...prev,
                        quotaMode: 'amount',
                        quotaAmount: event.target.value,
                      }))}
                      placeholder="amount"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-[10px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">Model restrictions</span>
              <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-[46px] w-full items-start justify-between rounded-[14px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] py-[10px] text-left shadow-none transition-colors hover:border-[#4f6ef7]"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-[10px]">
                      <Search className="mt-[2px] h-[16px] w-[16px] shrink-0 text-[#9ca3af]" />
                      {editor.selectedModels.length ? (
                        <div className="flex flex-1 flex-wrap gap-[6px]">
                          {selectedModelTags.map(model => (
                            <span
                              key={model.value}
                              className="max-w-full rounded-full bg-[#eef2ff] px-[8px] py-[3px] text-[11px] leading-[15px] text-[#4f6ef7]"
                            >
                              {model.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="pt-[1px] text-[14px] text-[#9ca3af]">
                          Select models (leave blank to allow all)
                        </span>
                      )}
                    </div>
                    <ChevronDown className="mt-[4px] h-[16px] w-[16px] shrink-0 text-[#9ca3af]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] rounded-[14px] border-[rgba(0,0,0,0.12)] p-[10px]">
                  <div className="flex items-center gap-[8px] rounded-[10px] border border-[rgba(0,0,0,0.08)] px-[10px]">
                    <Search className="h-[15px] w-[15px] text-[#9ca3af]" />
                    <input
                      value={modelSearch}
                      onChange={event => setModelSearch(event.target.value)}
                      placeholder="Search models"
                      className="h-[36px] w-full border-0 bg-transparent text-[14px] outline-none placeholder:text-[#9ca3af]"
                    />
                  </div>
                  <div className="mt-[10px] max-h-[220px] overflow-y-auto">
                    {filteredModels.length === 0 ? (
                      <div className="px-[10px] py-[12px] text-[13px] text-[#8d8d93]">No models found.</div>
                    ) : (
                      filteredModels.map(model => {
                        const value = getModelValue(model)
                        const checked = editor.selectedModels.includes(value)
                        return (
                          <button
                            key={value}
                            type="button"
                            className="flex w-full items-center justify-between rounded-[10px] px-[10px] py-[9px] text-left text-[14px] text-[#1c1c26] hover:bg-[#f5f7fb]"
                            onClick={() => setEditor(prev => ({
                              ...prev,
                              selectedModels: checked
                                ? prev.selectedModels.filter(item => item !== value)
                                : [...prev.selectedModels, value],
                            }))}
                          >
                            <span className="pr-[12px]">{getModelLabel(model)}</span>
                            {checked ? <Check className="h-[15px] w-[15px] text-[#4f6ef7]" /> : null}
                          </button>
                        )
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="border-t border-[rgba(0,0,0,0.08)] pt-[18px]">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => void saveKey()} disabled={savingKey}>
              {editor.mode === 'create' ? 'Create key' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(apiKeyToDelete)}
        onOpenChange={open => {
          if (!deletingKey && !open) setApiKeyToDelete(null)
        }}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              {apiKeyToDelete ? `Delete "${apiKeyToDelete.name}"? This action cannot be undone.` : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyToDelete(null)} disabled={deletingKey}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteKey()} disabled={deletingKey}>
              {deletingKey ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
