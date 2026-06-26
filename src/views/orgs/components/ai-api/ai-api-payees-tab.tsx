import apis from '@/apis'
import type { TokenUsagePlanListItem, TokenUsagePlanProfileResponse } from '@/apis/token-usage-plan.api'
import { normalizeQuotaToUsdAmount } from '@/apis/token-usage-plan.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { ENABLE_AI_API_FEATURES } from '@/constants/feature-flags'
import { useTranslation } from '@/utils/i18n'
import { Edit2, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateUsagePlanDialog from './create-usage-plan-dialog'
import { formatDisplayAmount } from './utils'

const PAGE_SIZE = 10

function sanitizeBudgetInput(value: string) {
  const digitsOnly = value.replace(/[^\d.]/g, '')
  const firstDotIndex = digitsOnly.indexOf('.')

  if (firstDotIndex === -1) return digitsOnly

  const integerPart = digitsOnly.slice(0, firstDotIndex)
  const decimalPart = digitsOnly
    .slice(firstDotIndex + 1)
    .replace(/\./g, '')
    .slice(0, 2)

  return `${integerPart}.${decimalPart}`
}

function validateBudgetInput(value: string, t: ReturnType<typeof useTranslation>['t']) {
  const trimmed = value.trim()
  if (!trimmed) {
    return { error: t('pages.orgAiApiPayees.budgetRequired'), value: '' }
  }

  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return { error: t('pages.orgAiApiPayees.budgetDecimalLimit'), value: '' }
  }

  const normalized = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: t('pages.orgAiApiPayees.budgetGreaterThanZero'), value: '' }
  }

  return { error: null, value: normalized }
}

function formatQuotaValue(value: number) {
  return `$${normalizeQuotaToUsdAmount(value)}`
}

function StatusPill({ status, label }: { status: 'Active' | 'Disabled'; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-[10px] py-[4px] text-[12px] font-medium ${status === 'Active'
        ? 'bg-[rgba(93,221,34,0.12)] text-[#2f9d1d]'
        : 'bg-[rgba(28,28,38,0.08)] text-[#606067]'
        }`}
    >
      {label}
    </span>
  )
}

type AiApiPayeesTabProps = {
  tabsNav?: ReactNode
}

export default function AiApiPayeesTab({ tabsNav }: AiApiPayeesTabProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Redirect if AI API features are disabled
  useEffect(() => {
    if (!ENABLE_AI_API_FEATURES) {
      navigate('/orgs/members', { replace: true })
    }
  }, [navigate])

  const [plans, setPlans] = useState<TokenUsagePlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [planProfiles, setPlanProfiles] = useState<Record<string, TokenUsagePlanProfileResponse>>({})
  const [profileLoadingState, setProfileLoadingState] = useState<Record<string, boolean>>({})

  const [createOpen, setCreateOpen] = useState(false)

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'planName' | 'budget' | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [savingInline, setSavingInline] = useState(false)

  const fetchPlans = async (page = currentPage) => {
    try {
      setLoading(true)
      const response = await apis.tokenUsagePlan.getUsagePlanList(page, PAGE_SIZE)
      setPlans(response.data)
      setTotalPages(Math.max(1, Math.ceil(response.total / PAGE_SIZE)))
      setTotalCount(response.total)
    } catch {
      // request interceptor handles API errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPlans(currentPage)
  }, [currentPage])

  useEffect(() => {
    let active = true

    if (plans.length === 0) {
      setProfileLoadingState({})
      return () => {
        active = false
      }
    }

    setProfileLoadingState(Object.fromEntries(plans.map(plan => [plan.id, true])))

    void (async () => {
      const results = await Promise.allSettled(
        plans.map(async plan => ({
          planId: plan.id,
          profile: await apis.tokenUsagePlan.getUsagePlanProfile(plan.id),
        })),
      )

      if (!active) return

      const nextProfiles: Record<string, TokenUsagePlanProfileResponse> = {}
      const nextLoadingState: Record<string, boolean> = {}

      for (const plan of plans) {
        nextLoadingState[plan.id] = false
      }

      for (const result of results) {
        if (result.status === 'fulfilled') {
          nextProfiles[result.value.planId] = result.value.profile
        }
      }

      setPlanProfiles(prev => ({ ...prev, ...nextProfiles }))
      setProfileLoadingState(nextLoadingState)
    })()

    return () => {
      active = false
    }
  }, [plans])

  const startInlineEdit = (plan: TokenUsagePlanListItem, field: 'planName' | 'budget') => {
    setEditingPlanId(plan.id)
    setEditingField(field)
    setEditingValue(field === 'planName' ? plan.planName : plan.budget)
  }

  const clearInlineEdit = () => {
    setEditingPlanId(null)
    setEditingField(null)
    setEditingValue('')
  }

  const saveInlineEdit = async () => {
    if (!editingPlanId || !editingField) return

    if (editingField === 'planName' && !editingValue.trim()) {
      toast({ title: t('pages.orgAiApiPayees.error'), description: t('pages.orgAiApiPayees.planNameRequired'), variant: 'destructive' })
      return
    }

    const budgetValidation = editingField === 'budget' ? validateBudgetInput(editingValue, t) : null
    if (editingField === 'budget' && budgetValidation?.error) {
      toast({ title: t('pages.orgAiApiPayees.error'), description: budgetValidation.error, variant: 'destructive' })
      return
    }

    const nextValue = editingField === 'budget' && budgetValidation ? budgetValidation.value : editingValue.trim()

    try {
      setSavingInline(true)
      const payload = editingField === 'planName'
        ? { planName: nextValue }
        : { budget: nextValue }
      await apis.tokenUsagePlan.updateUsagePlan(editingPlanId, payload)
      setPlans(prev => prev.map(plan => (
        plan.id === editingPlanId
          ? {
            ...plan,
            planName: editingField === 'planName' ? nextValue : plan.planName,
            budget: editingField === 'budget' ? nextValue : plan.budget,
          }
          : plan
      )))
      toast({ title: t('pages.orgAiApiPayees.success'), description: t('pages.orgAiApiPayees.usagePlanUpdated') })
      clearInlineEdit()
    } catch {
      // request interceptor handles API errors
    } finally {
      setSavingInline(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[16px] rounded-[32px] bg-white p-[20px]">
      {tabsNav}
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <p className="text-[20px] font-semibold leading-[30px] text-[#1c1c26]">{t('pages.orgAiApiPayees.usagePlans')}</p>
          <p className="text-[13px] leading-[20px] text-[#8d8d93]">
            {t('pages.orgAiApiPayees.description')}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('pages.orgAiApiPayees.newPlan')}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('pages.orgAiApiPayees.planName')}</TableHead>
              <TableHead>{t('pages.orgAiApiPayees.budget')}</TableHead>
              <TableHead>{t('pages.orgAiApiPayees.quota')}</TableHead>
              <TableHead>{t('pages.orgAiApiPayees.status')}</TableHead>
              <TableHead>{t('pages.orgAiApiPayees.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={5} cols={6} />
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center gap-[10px] py-[32px]">
                    <img src="/empty-table.svg" alt={t('pages.orgAiApiPayees.noUsagePlansAlt')} className="h-[120px] w-[120px]" />
                    <p className="text-[13px] leading-[20px] text-[#8d8d93]">{t('pages.orgAiApiPayees.noUsagePlansFound')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              plans.map(plan => (
                <TableRow key={plan.id}>
                  {(() => {
                    const profileData = planProfiles[plan.id]?.data
                    const remainingQuota = Math.max(0, profileData?.quota ?? 0)
                    const usedQuota = Math.max(0, profileData?.used_quota ?? 0)
                    const totalQuota = remainingQuota + usedQuota
                    const remainingRatio = totalQuota > 0
                      ? Math.max(0, Math.min(1, remainingQuota / totalQuota))
                      : 0
                    const isProfileLoading = profileLoadingState[plan.id]
                    const planStatus = profileData?.status === 2 || plan.deletedAt ? 'Disabled' : 'Active'

                    return (
                      <>
                        <TableCell>
                          {editingPlanId === plan.id && editingField === 'planName' ? (
                            <Input
                              value={editingValue}
                              onChange={event => setEditingValue(event.target.value)}
                              onBlur={() => void saveInlineEdit()}
                              onKeyDown={event => {
                                if (event.key === 'Enter') void saveInlineEdit()
                                if (event.key === 'Escape') clearInlineEdit()
                              }}
                              disabled={savingInline}
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-[8px]">
                              <span>{plan.planName}</span>
                              <button
                                type="button"
                                className="text-[#8d8d93] transition-colors hover:text-[#5e85ee]"
                                onClick={() => startInlineEdit(plan, 'planName')}
                              >
                                <Edit2 className="h-[14px] w-[14px]" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPlanId === plan.id && editingField === 'budget' ? (
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              inputMode="decimal"
                              value={editingValue}
                              onChange={event => setEditingValue(sanitizeBudgetInput(event.target.value))}
                              onBlur={() => void saveInlineEdit()}
                              onKeyDown={event => {
                                if (event.key === 'Enter') void saveInlineEdit()
                                if (event.key === 'Escape') clearInlineEdit()
                              }}
                              disabled={savingInline}
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-[8px]">
                              <span>${formatDisplayAmount(plan.budget)}</span>
                              <button
                                type="button"
                                className="text-[#8d8d93] transition-colors hover:text-[#5e85ee]"
                                onClick={() => startInlineEdit(plan, 'budget')}
                                title={t('pages.orgAiApiPayees.editBudget')}
                              >
                                <Edit2 className="h-[14px] w-[14px]" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPlanId === plan.id && editingField === 'budget' ? (
                            <span className="text-[13px] leading-[20px] text-[#8d8d93]">{t('pages.orgAiApiPayees.editingBudget')}</span>
                          ) : (
                            <div className="min-w-[140px]">
                              {isProfileLoading ? (
                                <div className="flex flex-col gap-[5px] py-[2px]">
                                  <div className="h-[16px] w-[120px] animate-pulse rounded bg-gray-200" />
                                  <div className="h-[3px] w-[120px] animate-pulse rounded-full bg-gray-200" />
                                </div>
                              ) : (
                                <div className="flex flex-col gap-[4px]">
                                  <span className="text-[13px] leading-[18px] text-[#1c1c26]">
                                    {profileData ? `${formatQuotaValue(remainingQuota)} / ${formatQuotaValue(totalQuota)}` : '-'}
                                  </span>
                                  <div className="h-[3px] w-[120px] overflow-hidden rounded-full bg-[#d9f0d2]">
                                    <div
                                      className={`h-full rounded-full transition-[width] ${remainingRatio < 0.9 ? 'bg-[#d92b2b]' : 'bg-[#5ab948]'
                                        }`}
                                      style={{ width: `${remainingRatio * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            status={planStatus}
                            label={planStatus === 'Active' ? t('pages.orgAiApiPayees.active') : t('pages.orgAiApiPayees.disabled')}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-[12px]">
                            <button
                              type="button"
                              className="text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70"
                              onClick={() => navigate(`/orgs/transaction/create-ai?planId=${encodeURIComponent(plan.id)}`)}
                            >
                              {t('pages.orgAiApiPayees.topUp')}
                            </button>
                            <button
                              type="button"
                              className="text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70"
                              onClick={() => navigate(`/orgs/members/usage-plans/${plan.id}`)}
                            >
                              {t('pages.orgAiApiPayees.viewDetails')}
                            </button>
                          </div>
                        </TableCell>
                      </>
                    )
                  })()}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        summaryText={plans.length === 0
          ? t('pages.orgAiApiPayees.showingZero', { total: totalCount })
          : t('pages.orgAiApiPayees.showingRange', {
            from: (currentPage - 1) * PAGE_SIZE + 1,
            to: Math.min(currentPage * PAGE_SIZE, totalCount),
            total: totalCount,
          })}
        totalItems={totalCount}
        pageSize={PAGE_SIZE}
        itemLabel={t('pages.orgAiApiPayees.usagePlansItemLabel')}
        className="shrink-0"
      />

      <CreateUsagePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={async () => {
          setCurrentPage(1)
          await fetchPlans(1)
        }}
      />
    </div>
  )
}
