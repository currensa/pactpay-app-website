import { AxiosInstance } from 'axios'

export interface TokenUsagePlanListItem {
  id: string
  planName: string
  budget: string
  newApiUserId: string
  displayPlanId: string
  remaining: string
  totalPurchased: string
  consumedRate: number
  apiKeysCount: number
  status: 'Funded' | 'Unfunded'
  raw: Record<string, any>
}

export interface NewApiUserSelfPermissionsSidebarModules {
  admin: boolean
}

export interface NewApiUserSelfPermissions {
  sidebar_modules: NewApiUserSelfPermissionsSidebarModules
  sidebar_settings: boolean
}

export interface NewApiUserSelfData {
  aff_code: string
  aff_count: number
  aff_history_quota: number
  aff_quota: number
  discord_id: string
  display_name: string
  email: string
  github_id: string
  group: string
  id: number
  inviter_id: number
  linux_do_id: string
  oidc_id: string
  permissions: NewApiUserSelfPermissions
  quota: number
  request_count: number
  role: number
  status: number
  used_quota: number
}

export interface TokenUsagePlanUserSelfResponseDto {
  success: boolean
  message: string
  data: NewApiUserSelfData
}

export interface TokenUsagePlanQuotaProfile {
  quota: number
  usedQuota: number
  remainingQuota: number
  raw: TokenUsagePlanUserSelfResponseDto | Record<string, any>
}

export interface TokenUsagePlanListResponse {
  list: TokenUsagePlanListItem[]
  page: number
  pageSize: number
  total: number
  raw: unknown
}

export interface TokenUsagePlanDetail {
  id: string
  planName: string
  budget: string
  newApiUserId: string
  displayPlanId: string
  remaining: string
  totalPurchased: string
  usedAmount: string
  consumedRate: number
  apiKeysCount: number
  status: 'Funded' | 'Unfunded'
  profile: Record<string, any> | null
  raw: Record<string, any>
}

export interface TokenUsagePlanApiKeyItem {
  id: string
  name: string
  key: string
  maskedKey: string
  quotaDisplay: string
  expirationDisplay: string
  usageDisplay: string
  status: TokenUsagePlanApiKeyStatus
  raw: Record<string, any>
}

export type TokenUsagePlanApiKeyStatus = 'Active' | 'Disabled' | 'Revoked'

export interface TokenUsagePlanApiKeyListResponse {
  list: TokenUsagePlanApiKeyItem[]
  raw: unknown
}

export interface TokenUsagePlanApiKeyTestCommand {
  endpoint: string
  authorization: string
  command: string
  raw: unknown
}

export interface TokenUsageRechargeItem {
  id: string
  transactionName: string
  network: string
  payees: string
  amount: string
  status: string
  payDay: string
  type: 'AI'
  raw: Record<string, any>
}

export interface TokenUsageRechargeListResponse {
  list: TokenUsageRechargeItem[]
  page: number
  pageSize: number
  total: number
  raw: unknown
}

export interface TokenUsagePlanUsageLogItem {
  id: string
  createdAt: number
  apiKeyName: string
  modelName: string
  inputTokens: number
  cacheReadTokens: number
  outputTokens: number
  costUsd: string
  raw: Record<string, any>
}

interface TokenUsagePlanUsageLogRawItem {
  id: number | string
  user_id: number
  created_at: number
  type: number
  content: string
  username: string
  token_name: string
  model_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  is_stream: boolean
  channel: number
  channel_name: string
  token_id: number
  group: string
  ip: string
  other: string
}

export interface TokenUsagePlanUsageLogListParams {
  page?: number
  pageSize?: number
  type?: number
  tokenName?: string
  modelName?: string
  startTime?: string
  endTime?: string
  channel?: string
  group?: string
  requestId?: string
}

export interface TokenUsagePlanUsageLogListResponse {
  list: TokenUsagePlanUsageLogItem[]
  page: number
  pageSize: number
  total: number
  raw: unknown
}

interface TokenUsagePlanUsageLogApiResponse {
  success: boolean
  message: string
  data: {
    page: number
    pageSize: number
    total: number
    list: TokenUsagePlanUsageLogRawItem[]
  }
}

export interface UpdateUsagePlanPayload {
  planName?: string
  budget?: string
}

export interface CreateApiKeyPayload {
  name: string
  group?: string
  expiredTime: number
  unlimitedQuota: boolean
  remainAmount?: string
  modelLimitsEnabled: boolean
  modelLimits?: string
  crossGroupRetry?: boolean
}

export interface UpdateApiKeyPayload {
  name?: string
  group?: string
  expiredTime?: number
  unlimitedQuota?: boolean
  remainAmount?: string
  modelLimitsEnabled?: boolean
  modelLimits?: string
  crossGroupRetry?: boolean
  status?: string
}

const NEWAPI_QUOTA_RATIO = 500000
const API_UTC8_OFFSET_MS = 8 * 60 * 60 * 1000

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function firstNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function trimTrailingZeros(value: string) {
  if (!value.includes('.')) return value
  return value.replace(/\.?0+$/, '')
}

function formatQuotaAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return trimTrailingZeros(value.toFixed(6))
}

function buildLocalDateFromUtcParts(date: Date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  )
}

export function normalizeQuotaToUsdAmount(value: unknown) {
  const numeric = firstNumber(value)
  if (numeric <= 0) return '0'
  return formatQuotaAmount(numeric / NEWAPI_QUOTA_RATIO)
}

export function utc8TimestampToLocalDate(value: unknown): Date | null {
  const numeric = firstNumber(value)
  if (numeric <= 0) return null
  const shifted = new Date(numeric * 1000 + API_UTC8_OFFSET_MS)
  if (Number.isNaN(shifted.getTime())) return null
  return buildLocalDateFromUtcParts(shifted)
}

export function localDateToUtc8Timestamp(value: Date): number {
  return Math.floor((
    Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    ) - API_UTC8_OFFSET_MS
  ) / 1000)
}

function formatUsdAmount(value: string, withSymbol = false) {
  const normalized = formatQuotaAmount(firstNumber(value))
  return withSymbol ? `$${normalized}` : normalized
}

function compactRecord<T extends Record<string, any>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>
}

function parseJsonRecord(value: unknown): Record<string, any> {
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    return asRecord(JSON.parse(value))
  } catch {
    return {}
  }
}

function findFirstNumberDeep(value: unknown, keys: string[], depth = 0): number | null {
  if (depth > 4 || value == null) return null

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findFirstNumberDeep(entry, keys, depth + 1)
      if (nested != null) return nested
    }
    return null
  }

  const record = asRecord(value)
  for (const key of keys) {
    const direct = nullableNumber(record[key])
    if (direct != null) return direct
  }

  for (const entryValue of Object.values(record)) {
    const nested = findFirstNumberDeep(entryValue, keys, depth + 1)
    if (nested != null) return nested
  }

  return null
}

function buildApiKeyPayload(payload: Partial<CreateApiKeyPayload & UpdateApiKeyPayload> & Record<string, any>) {
  return compactRecord({
    name: firstString(payload.name, payload.apiName) || undefined,
    group: firstString(payload.group, payload.groupName) || undefined,
    expiredTime: payload.expiredTime ?? payload.expired_time,
    unlimitedQuota: payload.unlimitedQuota ?? payload.unlimited_quota,
    remainAmount: payload.remainAmount ?? payload.remain_amount,
    modelLimitsEnabled: payload.modelLimitsEnabled ?? payload.model_limits_enabled,
    modelLimits: payload.modelLimits ?? payload.model_limits,
    crossGroupRetry: payload.crossGroupRetry ?? payload.cross_group_retry,
    status: firstString(payload.status, payload.keyStatus, payload.state) || undefined,
  })
}

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0
  if (value <= 1) return Math.round(value * 100)
  return Math.round(value)
}

function maskKey(key: string) {
  if (!key) return '-'
  if (key.length <= 8) return key
  return `${key.slice(0, 4)}***${key.slice(-4)}`
}

function formatExpiration(value: unknown) {
  if (value === -1 || value === '-1') return 'Never expires'
  const raw = firstString(value)
  if (!raw) return 'Never expires'
  const timestamp = Number(raw)
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return utc8TimestampToLocalDate(timestamp)?.toLocaleString() || raw
  }
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString()
  }
  return raw
}

export function extractListFromUnknownPayload<T = Record<string, any>>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  const record = asRecord(payload)
  if (Array.isArray(record.list)) return record.list as T[]
  if (Array.isArray(record.items)) return record.items as T[]
  if (Array.isArray(record.data)) return record.data as T[]
  if (Array.isArray(asRecord(record.data).list)) return asRecord(record.data).list as T[]
  if (Array.isArray(asRecord(record.data).items)) return asRecord(record.data).items as T[]
  if (Array.isArray(asRecord(record.data).data)) return asRecord(record.data).data as T[]
  if (Array.isArray(record.rows)) return record.rows as T[]
  return []
}

export function normalizeUsagePlanListItem(rawValue: unknown): TokenUsagePlanListItem {
  const raw = asRecord(rawValue)
  const plan = asRecord(raw.plan)
  const profile = asRecord(raw.profile)
  const merged = { ...plan, ...raw }
  const remaining = firstString(
    merged.remaining,
    merged.remainingAmount,
    merged.balance,
    merged.availableBalance,
    profile.balance,
    '0',
  )
  const totalPurchased = firstString(
    merged.totalPurchased,
    merged.totalRechargeAmount,
    merged.rechargedAmount,
    merged.totalAmount,
    '0',
  )
  const consumedRate = formatRatio(firstNumber(
    merged.consumedRate,
    merged.consumeRate,
    merged.usedRate,
  ))
  const apiKeysCount = firstNumber(merged.apiKeysCount, merged.keyCount, merged.apiKeyCount)
  const displayPlanId = firstString(merged.newApiUserId, merged.new_api_user_id, merged.id)

  return {
    id: firstString(merged.id),
    planName: firstString(merged.planName, merged.plan_name, merged.name, 'Untitled plan'),
    budget: firstString(merged.budget, merged.budgetAmount, '0'),
    newApiUserId: firstString(merged.newApiUserId, merged.new_api_user_id),
    displayPlanId,
    remaining,
    totalPurchased,
    consumedRate,
    apiKeysCount,
    status: Number(remaining || '0') > 0 ? 'Funded' : 'Unfunded',
    raw,
  }
}

export function normalizeUsagePlanDetail(rawValue: unknown): TokenUsagePlanDetail {
  const raw = asRecord(rawValue)
  const detailSource = raw.plan ? { ...asRecord(raw.plan), ...raw } : raw
  const normalized = normalizeUsagePlanListItem({ ...detailSource, profile: raw.profile })
  const profile = raw.profile ? normalizeUsagePlanProfile(raw.profile) : null
  const derivedTotalPurchased = profile ? normalizeQuotaToUsdAmount(profile.quota) : normalized.totalPurchased
  const derivedRemaining = profile ? normalizeQuotaToUsdAmount(profile.remainingQuota) : normalized.remaining
  const derivedUsedAmount = profile ? normalizeQuotaToUsdAmount(profile.usedQuota) : '0'
  const derivedConsumedRate = profile && profile.quota > 0
    ? formatRatio(profile.usedQuota / profile.quota)
    : normalized.consumedRate

  return {
    ...normalized,
    totalPurchased: derivedTotalPurchased,
    remaining: derivedRemaining,
    usedAmount: derivedUsedAmount,
    consumedRate: derivedConsumedRate,
    status: profile ? (profile.remainingQuota > 0 ? 'Funded' : 'Unfunded') : normalized.status,
    profile: raw.profile ? asRecord(raw.profile) : null,
    raw,
  }
}

export function normalizeApiKeyItem(rawValue: unknown): TokenUsagePlanApiKeyItem {
  const raw = asRecord(rawValue)
  const key = firstString(raw.key, raw.value, raw.token)
  const unlimitedQuota = Boolean(raw.unlimitedQuota ?? raw.unlimited_quota)
  const remainAmount = firstString(raw.remainAmount, raw.remain_amount, raw.quota, raw.remainQuota)
  const usedAmount = firstString(raw.usedAmount, raw.used_amount, raw.usedQuota)
  const remainAmountDisplay = remainAmount || normalizeQuotaToUsdAmount(raw.remain_quota)
  const usedAmountDisplay = usedAmount || normalizeQuotaToUsdAmount(raw.used_quota)
  const statusSource = firstString(raw.status, raw.keyStatus, raw.state)
  const statusValue = firstNumber(raw.status, raw.keyStatus, raw.state)
  const isRevoked = Boolean(
    raw.revoked ??
    raw.isRevoked ??
    raw.is_revoked ??
    statusSource.toLowerCase() === 'revoked'
  )
  const isDisabled = !isRevoked && Boolean(
    (raw.disabled ??
    raw.isDisabled ??
    raw.is_disabled ??
    statusValue === 2) ||
    ['disabled', 'inactive'].includes(statusSource.toLowerCase())
  )

  let usageDisplay = '-'
  if (!unlimitedQuota && remainAmountDisplay) {
    const total = Number(remainAmountDisplay)
    const used = Number(usedAmountDisplay)
    if (Number.isFinite(total) && total > 0 && Number.isFinite(used) && used >= 0) {
      usageDisplay = `${Math.min(100, Math.round((used / total) * 100))}%`
    } else {
      usageDisplay = `${formatUsdAmount(usedAmountDisplay, true)} / ${formatUsdAmount(remainAmountDisplay, true)}`
    }
  } else if (usedAmountDisplay && usedAmountDisplay !== '0') {
    usageDisplay = formatUsdAmount(usedAmountDisplay, true)
  }

  return {
    id: firstString(raw.id, raw.keyId),
    name: firstString(raw.name, raw.apiName, raw.api_name, 'Untitled key'),
    key,
    maskedKey: maskKey(key),
    quotaDisplay: unlimitedQuota ? 'Unlimited' : formatUsdAmount(remainAmountDisplay, true),
    expirationDisplay: formatExpiration(raw.expiredTime ?? raw.expired_time ?? raw.expireAt ?? raw.expiresAt),
    usageDisplay,
    status: isRevoked ? 'Revoked' : isDisabled ? 'Disabled' : 'Active',
    raw,
  }
}

export function normalizeTransactionItem(rawValue: unknown): TokenUsageRechargeItem {
  const raw = asRecord(rawValue)
  return {
    id: firstString(raw.id, raw.orderId, raw.transactionId),
    transactionName: firstString(raw.transactionName, raw.name, raw.orderName, 'AI API Top up'),
    network: firstString(raw.network, raw.chainName, raw.caipChainId, '-'),
    payees: 'API Service',
    amount: firstString(raw.amount, raw.topUpAmount, raw.rechargeAmount, '0'),
    status: firstString(raw.status, raw.orderStatus, 'pending'),
    payDay: firstString(raw.payDay, raw.completedAt, raw.updatedAt, raw.createdAt),
    type: 'AI',
    raw,
  }
}

function extractCacheReadTokens(raw: Record<string, any>) {
  const candidates = [
    'cache_read_input_tokens',
    'cache_read_tokens',
    'cacheReadInputTokens',
    'cacheReadTokens',
    'cache_read',
    'cacheRead',
    'prompt_cache_hit_tokens',
    'cache_creation_input_tokens',
  ]
  const parsedOther = parseJsonRecord(raw.other)
  return (
    findFirstNumberDeep(raw, candidates) ??
    findFirstNumberDeep(parsedOther, candidates) ??
    0
  )
}

function formatUsdAmountFixed(value: unknown, digits = 6) {
  const amount = Math.max(0, firstNumber(value) / NEWAPI_QUOTA_RATIO)
  return amount.toFixed(digits)
}

export function normalizeUsageLogItem(raw: TokenUsagePlanUsageLogRawItem): TokenUsagePlanUsageLogItem {
  return {
    id: String(raw.id),
    createdAt: raw.created_at ?? 0,
    apiKeyName: raw.token_name?.trim() || '-',
    modelName: raw.model_name?.trim() || '-',
    inputTokens: raw.prompt_tokens ?? 0,
    cacheReadTokens: extractCacheReadTokens(raw),
    outputTokens: raw.completion_tokens ?? 0,
    costUsd: formatUsdAmountFixed(raw.quota ?? 0),
    raw,
  }
}

export function normalizeUsagePlanProfile(rawValue: unknown): TokenUsagePlanQuotaProfile {
  const raw = asRecord(rawValue)
  const data = asRecord(raw.data)
  const quota = Math.max(0, firstNumber(data.quota, raw.quota))
  const usedQuota = Math.max(0, firstNumber(data.used_quota, data.usedQuota, raw.used_quota, raw.usedQuota))

  return {
    quota,
    usedQuota,
    remainingQuota: Math.max(0, quota - usedQuota),
    raw: raw as TokenUsagePlanUserSelfResponseDto,
  }
}

export class TokenUsagePlanApi {
  constructor(private readonly request: AxiosInstance) {}

  private get orgId(): string {
    return localStorage.getItem('organizationId') || ''
  }

  async getUsagePlanList(page = 1, pageSize = 20): Promise<TokenUsagePlanListResponse> {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans`, {
      params: { page, pageSize },
    })
    const data = res.data
    const list = extractListFromUnknownPayload(data).map(normalizeUsagePlanListItem)
    return {
      list,
      page: firstNumber(asRecord(data).page, page),
      pageSize: firstNumber(asRecord(data).pageSize, pageSize),
      total: firstNumber(asRecord(data).total, list.length),
      raw: data,
    }
  }

  async createUsagePlan(payload: { planName: string; budget: string }) {
    const res = await this.request.post(`/orgs/${this.orgId}/token-usage-plans`, payload)
    return res.data
  }

  async updateUsagePlan(id: string, payload: UpdateUsagePlanPayload) {
    const res = await this.request.put(`/orgs/${this.orgId}/token-usage-plans/${id}`, payload)
    return res.data
  }

  async getUsagePlanDetail(id: string): Promise<TokenUsagePlanDetail> {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}`)
    return normalizeUsagePlanDetail(res.data)
  }

  async getUsagePlanProfile(id: string): Promise<TokenUsagePlanQuotaProfile> {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/profile`)
    return normalizeUsagePlanProfile(res.data)
  }

  async getPlanGroups(id: string) {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/groups`)
    return extractListFromUnknownPayload<string | Record<string, any>>(res.data)
  }

  async getPlanModels(id: string) {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/models`)
    return extractListFromUnknownPayload<string | Record<string, any>>(res.data)
  }

  async getApiKeys(id: string): Promise<TokenUsagePlanApiKeyListResponse> {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/api-keys`)
    const list = extractListFromUnknownPayload(res.data).map(normalizeApiKeyItem)
    return { list, raw: res.data }
  }

  async getUsageLogs(id: string, params: TokenUsagePlanUsageLogListParams = {}): Promise<TokenUsagePlanUsageLogListResponse> {
    const { page = 1, pageSize = 20, type = 2, ...rest } = params
    const res = await this.request.get<TokenUsagePlanUsageLogApiResponse>(`/orgs/${this.orgId}/token-usage-plans/${id}/logs`, {
      params: compactRecord({ page, pageSize, type, ...rest }),
    })
    const raw = res.data
    const payload = raw.data
    const list = (payload.list ?? []).map(normalizeUsageLogItem)

    return {
      list,
      page: payload.page ?? page,
      pageSize: payload.pageSize ?? pageSize,
      total: payload.total ?? list.length,
      raw,
    }
  }

  async createApiKey(id: string, payload: CreateApiKeyPayload) {
    const requestPayload = buildApiKeyPayload({
      ...payload,
      group: payload.group ?? 'default',
      modelLimits: payload.modelLimits ?? '',
      crossGroupRetry: payload.crossGroupRetry ?? false,
    })
    const res = await this.request.post(`/orgs/${this.orgId}/token-usage-plans/${id}/api-keys`, requestPayload)
    return res.data
  }

  async updateApiKey(id: string, apiKeyId: string, payload: UpdateApiKeyPayload | Record<string, any>) {
    const res = await this.request.put(
      `/orgs/${this.orgId}/token-usage-plans/${id}/api-keys/${apiKeyId}`,
      buildApiKeyPayload(payload),
    )
    return res.data
  }

  async updateApiKeyStatus(id: string, apiKeyId: string, status: number | string) {
    const res = await this.request.put(
      `/orgs/${this.orgId}/token-usage-plans/${id}/api-keys/${apiKeyId}/status`,
      { status },
    )
    return res.data
  }

  async getApiKeyKey(id: string, apiKeyId: string): Promise<string> {
    const res = await this.request.post(`/orgs/${this.orgId}/token-usage-plans/${id}/api-keys/${apiKeyId}/key`)
    return firstString(asRecord(asRecord(res.data).data).key, asRecord(res.data).key)
  }

  async getApiKeyTestCommand(id: string, apiKeyId: string): Promise<TokenUsagePlanApiKeyTestCommand> {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/api-keys/${apiKeyId}/test-command`)
    const payload = asRecord(asRecord(res.data).data)
    return {
      endpoint: firstString(payload.endpoint),
      authorization: firstString(payload.authorization),
      command: firstString(payload.command),
      raw: res.data,
    }
  }

  async deleteApiKey(id: string, apiKeyId: string) {
    const res = await this.request.delete(`/orgs/${this.orgId}/token-usage-plans/${id}/api-keys/${apiKeyId}`)
    return res.data
  }

  async createRechargeOrder(id: string, payload: { amount: string }) {
    const res = await this.request.post(`/orgs/${this.orgId}/token-usage-plans/${id}/recharges`, payload)
    return res.data
  }

  async getRechargeOrders(page = 1, pageSize = 20): Promise<TokenUsageRechargeListResponse> {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/recharges`, {
      params: { page, pageSize },
    })
    const data = res.data
    const list = extractListFromUnknownPayload(data).map(normalizeTransactionItem)
    return {
      list,
      page: firstNumber(asRecord(data).page, page),
      pageSize: firstNumber(asRecord(data).pageSize, pageSize),
      total: firstNumber(asRecord(data).total, list.length),
      raw: data,
    }
  }
}
