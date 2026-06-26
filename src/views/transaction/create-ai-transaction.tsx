import apis from '@/apis'
import { normalizeQuotaToUsdAmount, type TokenUsagePlanListItem, type TokenUsagePlanProfileResponse } from '@/apis/token-usage-plan.api'
import type { TransactionPlan } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ENABLE_AI_API_FEATURES } from '@/constants/feature-flags'
import { PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useHeaderStore from '@/stores/header'
import useOrganizationStore from '@/stores/organization'
import { formatLocalDateTime } from '@/utils/date'
import { t as globalT, useTranslation } from '@/utils/i18n'
import { formatUnits } from 'ethers'
import { Bot, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CreateUsagePlanDialog from '../orgs/components/ai-api/create-usage-plan-dialog'
import { formatDisplayAmount } from '../orgs/components/ai-api/utils'
import { ExecuteConfirmDialogContent, ExecuteSuccessDialogContent } from './components'
import type { Transaction } from './components/types'

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {}
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

function getPlanIdFromTransaction(plan: TransactionPlan): string | null {
  const raw = plan as TransactionPlan & Record<string, any>
  return raw.planId
    || raw.tokenUsagePlanId
    || raw.usagePlanId
    || raw.token_usage_plan_id
    || raw.plan?.id
    || raw.newApiUserId
    || raw.new_api_user_id
    || raw.displayPlanId
    || raw.display_plan_id
    || null
}

function extractCreatedTransactionId(payload: unknown): string | null {
  const record = asRecord(payload)
  const data = asRecord(record.data)
  const order = asRecord(record.order)
  const batch = asRecord(record.batch)
  const transaction = asRecord(record.transaction)
  const plan = asRecord(record.plan)

  return firstString(
    record.payrollBatchId,
    record.payroll_batch_id,
    record.batchId,
    record.batch_id,
    record.transactionPlanId,
    record.transaction_plan_id,
    record.transactionId,
    record.transaction_id,
    data.payrollBatchId,
    data.payroll_batch_id,
    data.batchId,
    data.batch_id,
    data.transactionPlanId,
    data.transaction_plan_id,
    data.transactionId,
    data.transaction_id,
    order.payrollBatchId,
    order.payroll_batch_id,
    order.batchId,
    order.batch_id,
    order.transactionPlanId,
    order.transaction_plan_id,
    order.transactionId,
    order.transaction_id,
    batch.id,
    transaction.id,
    plan.id,
    record.id,
    data.id,
    order.id,
  ) || null
}

function buildAiExecutingTransaction(
  plan: TransactionPlan,
  getChain: (caipChainId: string) => { name: string } | null,
  getTokenDecimals: (caipChainId: string, tokenAddress: string) => number,
  getTokenSymbol: (caipChainId: string, tokenAddress: string) => string | null,
): Transaction {
  const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress || '')
  const symbol = getTokenSymbol(plan.caipChainId, plan.tokenAddress || '') || ''
  const formattedAmount = (() => {
    try {
      return formatUnits(BigInt(plan.totalAmount || '0'), decimals)
    } catch {
      return plan.totalAmount || '0'
    }
  })()

  return {
    id: plan.id,
    name: plan.transactionName || globalT('pages.createAiTransaction.aiTopUpName'),
    transactionId: plan.id,
    type: plan.transactionType,
    status: (plan.transactionStatus as Transaction['status']) || PayrollTransactionStatus.READY,
    executionDate: plan.payPeriod ? formatLocalDateTime(plan.payPeriod) : '-',
    daysRemaining: null,
    isDueToday: false,
    totalAmount: formattedAmount,
    currency: symbol,
    members: 1,
    network: getChain(plan.caipChainId)?.name || plan.caipChainId,
    isComplete: plan.transactionStatus === PayrollTransactionStatus.COMPLETE,
  }
}

export default function CreateAiTransaction() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { setHeader, clearHeader } = useHeaderStore()
  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)
  const {
    fetchChains,
    fetchChainAssets,
    getChain,
    getTokenDecimals,
    getTokenSymbol,
  } = useChainAssetStore()

  // Redirect if AI API features are disabled
  useEffect(() => {
    if (!ENABLE_AI_API_FEATURES) {
      navigate('/orgs/transaction', { replace: true })
    }
  }, [navigate])

  const [plans, setPlans] = useState<TokenUsagePlanListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState(searchParams.get('planId') ?? '')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdTransactionPlan, setCreatedTransactionPlan] = useState<TransactionPlan | null>(null)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [executeSuccessDialogOpen, setExecuteSuccessDialogOpen] = useState(false)
  const [lastDepositTxHash, setLastDepositTxHash] = useState('')
  const [planProfilesById, setPlanProfilesById] = useState<Record<string, TokenUsagePlanProfileResponse>>({})
  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false)

  const selectedPlan = useMemo(
    () => plans.find(plan => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const executingTransaction = useMemo(
    () => createdTransactionPlan
      ? buildAiExecutingTransaction(createdTransactionPlan, getChain, getTokenDecimals, getTokenSymbol)
      : null,
    [createdTransactionPlan, getChain, getTokenDecimals, getTokenSymbol],
  )

  const selectedPlanProfile = selectedPlan ? planProfilesById[selectedPlan.id] ?? null : null
  const selectedPlanRemainingQuota = Math.max(0, selectedPlanProfile?.data.quota ?? 0)
  const selectedPlanBalanceDisplay = selectedPlanProfile
    ? `$${normalizeQuotaToUsdAmount(selectedPlanRemainingQuota)}`
    : '-'

  const navigateBack = () => {
    const historyIndex = typeof window !== 'undefined' ? window.history.state?.idx : undefined
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
      return
    }
    navigate('/orgs/transaction')
  }

  const loadPlans = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchChains(),
        fetchChainAssets(),
      ])
      const response = await apis.tokenUsagePlan.getUsagePlanList(1, 100)
      setPlans(response.data)
      if (response.data.length === 0) {
        setSelectedPlanId('')
      } else if (!response.data.some(plan => plan.id === selectedPlanId)) {
        setSelectedPlanId(response.data[0].id)
      }
    } catch {
      // request interceptor handles API errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setHeader({
      backUrl: '/orgs/transaction',
      steps: [
        { label: t('pages.createTransactionSelector.step1'), active: true },
        { label: t('pages.createTransactionSelector.step2'), active: false },
      ],
    })
    void loadPlans()
    return () => clearHeader()
  }, [clearHeader, setHeader, t])

  useEffect(() => {
    if (!selectedPlan?.id || planProfilesById[selectedPlan.id]) return

    let cancelled = false

    const loadProfile = async () => {
      try {
        const profile = await apis.tokenUsagePlan.getUsagePlanProfile(selectedPlan.id)
        if (cancelled) return
        setPlanProfilesById(prev => ({ ...prev, [selectedPlan.id]: profile }))
      } catch {
        // Ignore profile fetch failures and keep the list value fallback.
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [planProfilesById, selectedPlan?.id])

  const resolveCreatedTransactionPlan = async (
    payload: unknown,
    plan: TokenUsagePlanListItem,
  ): Promise<TransactionPlan> => {
    const directId = extractCreatedTransactionId(payload)
    if (directId) {
      try {
        return await apis.transaction.getTransactionPlanDetail(directId)
      } catch {
        // Fall through to list lookup if the returned id is not the batch id.
      }
    }

    const referenceKeys = new Set([
      plan.id,
      plan.newApiUserId,
    ].filter(Boolean))

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await apis.transaction.getTransactionPlans(1, 20, undefined, undefined, 'token_usage_plan')
      const matched = response.data
        .filter(item => item.transactionType === 'token_usage_plan')
        .filter(item => {
          const planKey = getPlanIdFromTransaction(item)
          return planKey ? referenceKeys.has(planKey) : false
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

      if (matched) return matched

      await new Promise(resolve => setTimeout(resolve, 400))
    }

    throw new Error(t('pages.createAiTransaction.transactionLoadFailed'))
  }

  const handleConfirm = async () => {
    if (!selectedPlan || !amount.trim() || Number(amount) <= 0) return

    if (createdTransactionPlan && createdTransactionPlan.transactionStatus !== PayrollTransactionStatus.COMPLETE) {
      setExecuteDialogOpen(true)
      return
    }

    try {
      setSubmitting(true)
      const response = await apis.tokenUsagePlan.createRechargeOrder(selectedPlan.id, { amount: amount.trim() })
      const plan = await resolveCreatedTransactionPlan(response, selectedPlan)
      setCreatedTransactionPlan(plan)
      setExecuteDialogOpen(true)
      toast({
        title: t('pages.orgMembers.success'),
        description: t('pages.createAiTransaction.topUpCreated'),
      })
    } catch {
      // request interceptor handles API errors
    } finally {
      setSubmitting(false)
    }
  }

  const handleDepositSuccess = (txHash: string) => {
    setExecuteDialogOpen(false)
    setLastDepositTxHash(txHash)
    setExecuteSuccessDialogOpen(true)
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[13px] text-[#8d8d93]">{t('common.loading')}</div>
  }

  const hasPlans = plans.length > 0

  return (
    <div className="flex h-full min-h-0 flex-col gap-[16px] xl:flex-row xl:gap-[26px]">
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:p-[20px]">
        <div className="shrink-0">
          <p className="text-[13px] font-semibold leading-[22px] text-[#1c1c26]">
            {t('pages.createAiTransaction.usagePlan')} <span className="text-[#d92b2b]">*</span>
          </p>
          <p className="mt-[4px] text-[12px] leading-[20px] text-[#8d8d93]">
            {t('pages.createAiTransaction.usagePlanDescription')}
          </p>
        </div>

        {hasPlans ? (
          <div className="grid gap-[12px] overflow-y-auto pr-[2px]">
            {plans.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`rounded-[20px] border px-[16px] py-[14px] text-left transition-colors ${selectedPlanId === plan.id
                  ? 'border-[#5e85ee] bg-[rgba(94,133,238,0.06)]'
                  : 'border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#f8f8fb]'
                  }`}
              >
                <div className="flex items-center justify-between gap-[12px]">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[#1c1c26]">{plan.planName}</p>
                    <p className="mt-[4px] font-mono text-[12px] text-[#8d8d93]">{t('pages.createAiTransaction.createdAt')}: {formatLocalDateTime(plan.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-[13px] text-[#1c1c26]">$ {formatDisplayAmount(plan.budget)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-[16px] rounded-[24px] border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafb] px-[24px] py-[40px] text-center">
            <img src="/empty-table.svg" alt={t('pages.createAiTransaction.noUsagePlansAlt')} className="h-[120px] w-[120px]" />
            <div className="space-y-[6px]">
              <p className="text-[15px] font-medium text-[#1c1c26]">{t('pages.createAiTransaction.noUsagePlansFound')}</p>
              <p className="text-[12px] leading-[20px] text-[#8d8d93]">
                {t('pages.createAiTransaction.createUsagePlanFirst')}
              </p>
            </div>
            <Button onClick={() => setCreatePlanDialogOpen(true)}>
              {t('pages.createAiTransaction.createUsagePlan')}
            </Button>
          </div>
        )}

        <div className="shrink-0">
          <p className="text-[13px] font-semibold leading-[22px] text-[#1c1c26]">
            {t('pages.createAiTransaction.topUpAmount')} <span className="text-[#d92b2b]">*</span>
          </p>
          <div className="mt-[8px] rounded-[12px] bg-[#f5f5f5]">
            <Input
              className="border-0 bg-transparent"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder={t('pages.createAiTransaction.enterAmount')}
            />
          </div>
          {selectedPlan && (
            <p className="mt-[8px] text-[12px] leading-[20px] text-[#8d8d93]">
              {t('pages.createAiTransaction.budget')}: ${formatDisplayAmount(selectedPlan.budget)} / {t('pages.createAiTransaction.balance')}: {selectedPlanBalanceDisplay}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col justify-between rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:p-[20px] xl:w-[320px]">
        <div className="flex flex-col gap-[14px]">
          <p className="text-[16px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {t('pages.createAiTransaction.paymentSummary')}
          </p>

          <div className="rounded-[20px] bg-[#f5f5f5] p-[16px]">
            <div className="flex flex-col gap-[14px]">
              <div className="flex items-center justify-between gap-[12px]">
                <span className="text-[13px] text-[#606067]">{t('pages.createAiTransaction.usagePlan')}</span>
                <span className="max-w-[180px] truncate font-mono text-[13px] text-[#1c1c26]">
                  {selectedPlan?.planName || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-[12px]">
                <span className="text-[13px] text-[#606067]">{t('pages.createAiTransaction.topUpAmount')}</span>
                <span className="text-[13px] text-[#1c1c26]">
                  {amount.trim() ? formatDisplayAmount(amount.trim(), payrollTokenSymbol) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-[12px]">
                <span className="text-[13px] text-[#606067]">{t('pages.createAiTransaction.platformFee')}</span>
                <span className="text-[13px] text-[#1c1c26]">{t('pages.createAiTransaction.none')}</span>
              </div>
              <div className="flex items-center justify-between gap-[12px] border-t border-[rgba(0,0,0,0.08)] pt-[14px]">
                <span className="text-[13px] font-medium text-[#1c1c26]">{t('pages.createAiTransaction.totalFromWallet')}</span>
                <span className="text-[14px] font-semibold text-[#1c1c26]">
                  {amount.trim() ? `${formatDisplayAmount(amount.trim(), payrollTokenSymbol)} + gas` : '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[14px]">
            <div className="rounded-[18px] bg-[#f5f5f5] p-[18px]">
              <div className="flex items-center gap-[10px]">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-white">
                  <Bot className="h-[16px] w-[16px] text-[#5e85ee]" />
                </div>
                <span className="text-[13px] font-semibold text-[#1c1c26]">{t('pages.createAiTransaction.afterConfirm')}</span>
              </div>
              <p className="mt-[10px] text-[12px] leading-[20px] text-[#606067]">
                {t('pages.createAiTransaction.afterConfirmDescription')}
              </p>
            </div>
            <div className="rounded-[18px] bg-[#f5f5f5] p-[18px]">
              <div className="flex items-center gap-[10px]">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-white">
                  <Wallet className="h-[16px] w-[16px] text-[#5e85ee]" />
                </div>
                <span className="text-[13px] font-semibold text-[#1c1c26]">{t('pages.createAiTransaction.executionRequirement')}</span>
              </div>
              <p className="mt-[10px] text-[12px] leading-[20px] text-[#606067]">
                {t('pages.createAiTransaction.executionRequirementDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-[10px] pt-[20px] sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="w-full shrink-0 sm:w-auto"
            onClick={navigateBack}
          >
            {t('common.cancel')}
          </Button>
          <Button
            className="w-full sm:flex-1"
            disabled={!selectedPlan || !amount.trim() || Number(amount) <= 0 || submitting}
            onClick={() => void handleConfirm()}
          >
            {createdTransactionPlan && createdTransactionPlan.transactionStatus !== PayrollTransactionStatus.COMPLETE
              ? t('pages.createAiTransaction.openTransactionSummary')
              : t('pages.createAiTransaction.confirmPay')}
          </Button>
        </div>
      </div>

      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent disableOutsideClose>
          <DialogTitle className="sr-only">{t('pages.createAiTransaction.transactionSummary')}</DialogTitle>
          <ExecuteConfirmDialogContent
            executingTransaction={executingTransaction}
            transactionPlan={createdTransactionPlan}
            onCancel={() => setExecuteDialogOpen(false)}
            onSuccess={handleDepositSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={executeSuccessDialogOpen} onOpenChange={setExecuteSuccessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <ExecuteSuccessDialogContent
            depositTxHash={lastDepositTxHash}
            executingTransaction={executingTransaction}
            caipChainId={createdTransactionPlan?.caipChainId}
            onClose={() => {
              setExecuteSuccessDialogOpen(false)
              setLastDepositTxHash('')
              if (selectedPlan) {
                navigate(
                  `/orgs/members/usage-plans/${selectedPlan.id}`,
                  { replace: true },
                )
                return
              }
              navigate('/orgs/transaction?tab=ai')
            }}
          />
        </DialogContent>
      </Dialog>

      <CreateUsagePlanDialog
        open={createPlanDialogOpen}
        onOpenChange={setCreatePlanDialogOpen}
        onSuccess={async () => {
          await loadPlans()
        }}
      />
    </div>
  )
}
