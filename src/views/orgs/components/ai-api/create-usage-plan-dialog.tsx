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

function validateBudgetInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return { error: 'Budget is required.', value: '' }
  }

  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return { error: 'Budget must be a number with at most 2 decimal places.', value: '' }
  }

  const normalized = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Budget must be greater than 0.', value: '' }
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
      toast({ title: 'Error', description: 'Plan name is required.', variant: 'destructive' })
      return
    }

    const budgetValidation = validateBudgetInput(newBudget)
    if (budgetValidation.error) {
      toast({ title: 'Error', description: budgetValidation.error, variant: 'destructive' })
      return
    }

    try {
      setCreating(true)
      await apis.tokenUsagePlan.createUsagePlan({
        planName: newPlanName.trim(),
        budget: budgetValidation.value,
      })
      toast({ title: 'Success', description: 'Usage plan created successfully.' })
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
                placeholder="eg, 500."
              />
            </div>
          </div>
          <p className="text-[12px] leading-[18px] text-[#8d8d93]">
            Budget is a reference target only and uses your organisation payment currency.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleCreatePlan()} disabled={creating}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
