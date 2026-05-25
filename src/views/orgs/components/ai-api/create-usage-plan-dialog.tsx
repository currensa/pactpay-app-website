import apis from '@/apis'
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
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from '@/utils/i18n'
import { useState } from 'react'

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

type CreateUsagePlanDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
}

export default function CreateUsagePlanDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUsagePlanDialogProps) {
  const { toast } = useToast()
  const { t } = useTranslation()

  const [creating, setCreating] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newBudget, setNewBudget] = useState('')

  const resetForm = () => {
    setNewPlanName('')
    setNewBudget('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      toast({ title: t('pages.orgAiApiPayees.error'), description: t('pages.orgAiApiPayees.planNameRequired'), variant: 'destructive' })
      return
    }

    const budgetValidation = validateBudgetInput(newBudget, t)
    if (budgetValidation.error) {
      toast({ title: t('pages.orgAiApiPayees.error'), description: budgetValidation.error, variant: 'destructive' })
      return
    }

    try {
      setCreating(true)
      await apis.tokenUsagePlan.createUsagePlan({
        planName: newPlanName.trim(),
        budget: budgetValidation.value,
      })
      toast({ title: t('pages.orgAiApiPayees.success'), description: t('pages.orgAiApiPayees.usagePlanCreated') })
      handleOpenChange(false)
      await onSuccess?.()
    } catch {
      // request interceptor handles API errors
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pages.orgAiApiPayees.createUsagePlan')}</DialogTitle>
          <DialogDescription>
            {t('pages.orgAiApiPayees.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-[20px] flex flex-col gap-[14px]">
          <div className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-medium text-[#1c1c26]">{t('pages.orgAiApiPayees.planName')}</span>
            <Input
              value={newPlanName}
              onChange={event => setNewPlanName(event.target.value)}
              placeholder={t('pages.orgAiApiPayees.planNamePlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-medium text-[#1c1c26]">{t('pages.orgAiApiPayees.budget')}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#606067]">$</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="pl-[28px]"
                value={newBudget}
                onChange={event => setNewBudget(sanitizeBudgetInput(event.target.value))}
                placeholder={t('pages.orgAiApiPayees.budgetPlaceholder')}
              />
            </div>
          </div>
          <p className="text-[12px] leading-[18px] text-[#8d8d93]">
            {t('pages.orgAiApiPayees.budgetHint')}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t('pages.orgAiApiPayees.cancel')}
          </Button>
          <Button onClick={() => void handleCreatePlan()} disabled={creating}>
            {t('pages.orgAiApiPayees.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
