import apis from '@/apis'
import type { TokenUsagePlanListItem, TokenUsagePlanProfileResponse } from '@/apis/token-usage-plan.api'
import { normalizeQuotaToUsdAmount } from '@/apis/token-usage-plan.api'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import useOrganizationStore from '@/stores/organization'
import { Edit2, Plus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDisplayAmount, getErrorMessage } from './utils'

const PAGE_SIZE = 10

function formatQuotaValue(value: number) {
  return `$${normalizeQuotaToUsdAmount(value)}`
}

function StatusPill({ status }: { status: 'Active' | 'Disabled' }) {
  return (
    <span
      className={`inline-flex rounded-full px-[10px] py-[4px] text-[12px] font-medium ${status === 'Active'
        ? 'bg-[rgba(93,221,34,0.12)] text-[#2f9d1d]'
        : 'bg-[rgba(28,28,38,0.08)] text-[#606067]'
        }`}
    >
      {status}
    </span>
  )
}

type AiApiPayeesTabProps = {
  tabsNav?: ReactNode
}

export default function AiApiPayeesTab({ tabsNav }: AiApiPayeesTabProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)

  const [plans, setPlans] = useState<TokenUsagePlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [planProfiles, setPlanProfiles] = useState<Record<string, TokenUsagePlanProfileResponse>>({})
  const [profileLoadingState, setProfileLoadingState] = useState<Record<string, boolean>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newBudget, setNewBudget] = useState('')

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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to load usage plans.'),
        variant: 'destructive',
      })
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

  const resetCreateForm = () => {
    setNewPlanName('')
    setNewBudget('')
  }

  const handleCreatePlan = async () => {
    if (!newPlanName.trim() || !newBudget.trim()) {
      toast({ title: 'Error', description: 'Plan name and budget are required.', variant: 'destructive' })
      return
    }

    try {
      setCreating(true)
      await apis.tokenUsagePlan.createUsagePlan({
        planName: newPlanName.trim(),
        budget: newBudget.trim(),
      })
      toast({ title: 'Success', description: 'Usage plan created successfully.' })
      setCreateOpen(false)
      resetCreateForm()
      setCurrentPage(1)
      await fetchPlans(1)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to create usage plan.'),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

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
    try {
      setSavingInline(true)
      const payload = editingField === 'planName'
        ? { planName: editingValue.trim() }
        : { budget: editingValue.trim() }
      await apis.tokenUsagePlan.updateUsagePlan(editingPlanId, payload)
      setPlans(prev => prev.map(plan => (
        plan.id === editingPlanId
          ? {
            ...plan,
            planName: editingField === 'planName' ? editingValue.trim() : plan.planName,
            budget: editingField === 'budget' ? editingValue.trim() : plan.budget,
          }
          : plan
      )))
      toast({ title: 'Success', description: 'Usage plan updated.' })
      clearInlineEdit()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to update usage plan.'),
        variant: 'destructive',
      })
    } finally {
      setSavingInline(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-[16px] rounded-[32px] bg-white p-[20px]">
      {tabsNav}
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <p className="text-[20px] font-semibold leading-[30px] text-[#1c1c26]">Usage plans</p>
          <p className="text-[13px] leading-[20px] text-[#8d8d93]">
            Manage budget accounts for AI API access across your organisation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Quota</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={5} cols={6} />
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center gap-[10px] py-[32px]">
                    <img src="/empty-table.svg" alt="No usage plans" className="h-[120px] w-[120px]" />
                    <p className="text-[13px] leading-[20px] text-[#8d8d93]">No usage plans found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              plans.map(plan => (
                <TableRow key={plan.id}>
                  {(() => {
                    const profile = planProfiles[plan.id]
                    const remainingQuota = Math.max(0, profile?.data.quota ?? 0)
                    const usedQuota = Math.max(0, profile?.data.used_quota ?? 0)
                    const totalQuota = remainingQuota + usedQuota
                    const remainingRatio = totalQuota > 0
                      ? Math.max(0, Math.min(1, remainingQuota / totalQuota))
                      : 0
                    const isProfileLoading = profileLoadingState[plan.id]
                    const planStatus = profile?.data.status === 2 || plan.deletedAt ? 'Disabled' : 'Active'

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
                              <span>${formatDisplayAmount(plan.budget)}</span>
                              <button
                                type="button"
                                className="text-[#8d8d93] transition-colors hover:text-[#5e85ee]"
                                onClick={() => startInlineEdit(plan, 'budget')}
                                title="Edit budget"
                              >
                                <Edit2 className="h-[14px] w-[14px]" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPlanId === plan.id && editingField === 'budget' ? (
                            <span className="text-[13px] leading-[20px] text-[#8d8d93]">Editing budget...</span>
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
                                    {profile ? `${formatQuotaValue(remainingQuota)} / ${formatQuotaValue(totalQuota)}` : '-'}
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
                          <StatusPill status={planStatus} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-[12px]">
                            <button
                              type="button"
                              className="text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70"
                              onClick={() => navigate(
                                `/orgs/transaction/create-ai?planId=${encodeURIComponent(plan.id)}`,
                                { state: { backUrl: '/orgs/members?tab=ai-api' } },
                              )}
                            >
                              Top up
                            </button>
                            <button
                              type="button"
                              className="text-[13px] text-[#5e85ee] transition-opacity hover:opacity-70"
                              onClick={() => navigate(`/orgs/members/usage-plans/${plan.id}`)}
                            >
                              View details
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
        summaryText={plans.length === 0 ? `Showing 0 of ${totalCount} usage plans` : undefined}
        totalItems={totalCount}
        pageSize={PAGE_SIZE}
        itemLabel="usage plans"
        className="shrink-0"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Usage Plan</DialogTitle>
            <DialogDescription>
              Set a plan name and reference budget for an AI API account.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-[20px] flex flex-col gap-[14px]">
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">Plan Name</span>
              <Input
                value={newPlanName}
                onChange={event => setNewPlanName(event.target.value)}
                placeholder="Please enter a plan name, eg, dev team."
              />
            </div>
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-medium text-[#1c1c26]">Budget</span>
              <Input
                value={newBudget}
                onChange={event => setNewBudget(event.target.value)}
                placeholder="eg, 500."
              />
            </div>
            <p className="text-[12px] leading-[18px] text-[#8d8d93]">
              Budget is a reference target only and uses your organisation payment currency.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                resetCreateForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreatePlan()} disabled={creating}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
