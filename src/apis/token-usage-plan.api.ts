import { AxiosInstance } from 'axios'

export interface TokenUsagePlanListItem {
  id: string
  orgId: string
  planName: string
  budget: string
  newApiUserId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
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
  stripe_customer: string
  telegram_id: string
  used_quota: number
  username: string
  wechat_id: string
}

export interface TokenUsagePlanProfileResponse {
  success: boolean
  message: string
  data: NewApiUserSelfData
}

export interface TokenUsagePlanDetail {
  plan: TokenUsagePlanListItem
  profile: NewApiUserSelfData
}

export interface TokenUsagePlanListResponse {
  data: TokenUsagePlanListItem[]
  page: number
  pageSize: number
  total: number
}

export interface TokenUsagePlanApiKeyItem {
  DeletedAt: string | null
  accessed_time: number
  allow_ips: string[] | string | null
  created_time: number
  cross_group_retry: boolean
  expired_time: number
  group: string
  id: number
  key: string
  model_limits: string | null
  model_limits_enabled: boolean
  name: string
  remain_quota: number
  status: number
  unlimited_quota: boolean
  used_quota: number
  user_id: number
}

export type TokenUsagePlanApiKeyStatus = 'Active' | 'Disabled' | 'Expired' | 'Exhausted'

export interface TokenUsagePlanApiKeyListResponse {
  data: TokenUsagePlanApiKeyItem[]
  page: number
  pageSize: number
  total: number
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
    'cache_tokens',
    'cacheTokens',
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

export class TokenUsagePlanApi {
  constructor(private readonly request: AxiosInstance) {}

  private get orgId(): string {
    return localStorage.getItem('organizationId') || ''
  }

  async getUsagePlanList(page = 1, pageSize = 20): Promise<TokenUsagePlanListResponse> {
    const res = await this.request.get<TokenUsagePlanListResponse>(`/orgs/${this.orgId}/token-usage-plans`, {
      params: { page, pageSize },
    })
    return res.data
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
    const res = await this.request.get<TokenUsagePlanDetail>(`/orgs/${this.orgId}/token-usage-plans/${id}`)
    return res.data
  }

  async getUsagePlanProfile(id: string): Promise<TokenUsagePlanProfileResponse> {
    const res = await this.request.get<TokenUsagePlanProfileResponse>(`/orgs/${this.orgId}/token-usage-plans/${id}/profile`)
    return res.data
  }

  async getPlanGroups(id: string) {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/groups`)
    return extractListFromUnknownPayload<string | Record<string, any>>(res.data)
  }

  async getPlanModels(id: string) {
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/models`)
    return extractListFromUnknownPayload<string | Record<string, any>>(res.data)
  }

  async getApiKeys(
    id: string,
    params: { page?: number; pageSize?: number } = {},
  ): Promise<TokenUsagePlanApiKeyListResponse> {
    const { page = 1, pageSize = 20 } = params
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/api-keys`, {
      params: { page, pageSize },
    })
    const raw = res.data
    const payload = asRecord(raw)
    const dataRecord = asRecord(payload.data)

    return {
      data: extractListFromUnknownPayload<TokenUsagePlanApiKeyItem>(raw),
      page: firstNumber(payload.page, dataRecord.page, page),
      pageSize: firstNumber(payload.pageSize, payload.page_size, dataRecord.pageSize, dataRecord.page_size, pageSize),
      total: firstNumber(payload.total, dataRecord.total, 0),
      raw,
    }
  }

  async getUsageLogs(id: string, params: TokenUsagePlanUsageLogListParams = {}): Promise<TokenUsagePlanUsageLogListResponse> {
    const { page = 1, pageSize = 20, type = 2, ...rest } = params
    const res = await this.request.get(`/orgs/${this.orgId}/token-usage-plans/${id}/logs`, {
      params: compactRecord({ page, pageSize, type, ...rest }),
    })
    const raw = res.data
    const payload = asRecord(raw)
    const dataRecord = asRecord(payload.data)
    const list = extractListFromUnknownPayload<TokenUsagePlanUsageLogRawItem>(raw).map(normalizeUsageLogItem)

    return {
      list,
      page: firstNumber(payload.page, dataRecord.page, page),
      pageSize: firstNumber(payload.pageSize, payload.page_size, dataRecord.pageSize, dataRecord.page_size, pageSize),
      total: firstNumber(payload.total, dataRecord.total, list.length),
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
