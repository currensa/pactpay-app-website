import { OrganizationMember } from '@/apis/orgnization.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/datePickerInput'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

interface CreateTransactionDialogContentProps {
  variant?: 'dialog' | 'page'
  isCreatingFromReaction: boolean
  organizationMembers: OrganizationMember[]
  membersLoading: boolean
  transactionDetailMembers: any[]
  initialExecutionDate?: string
  reactionSourceLoading?: boolean
  onCreateTransaction: (params: {
    selectedMembers: Set<string>
    memberAmounts: Record<string, string>
    transactionName: string
    executionDate: string
  }) => void
  onCancel: () => void
}

export function CreateTransactionDialogContent({
  variant = 'dialog',
  isCreatingFromReaction,
  organizationMembers,
  membersLoading,
  transactionDetailMembers,
  initialExecutionDate,
  reactionSourceLoading = false,
  onCancel,
  onCreateTransaction,
}: CreateTransactionDialogContentProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [memberAmounts, setMemberAmounts] = useState<Record<string, string>>({})
  const [transactionName, setTransactionName] = useState('')
  const [executionDate, setExecutionDate] = useState('')
  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const getTokenSymbol = useChainAssetStore(s => s.getTokenSymbol)

  useEffect(() => {
    fetchPayrollTokenSymbol()
  }, [])

  // 初始化金额
  useEffect(() => {
    const initialAmounts: Record<string, string> = {}
    organizationMembers.forEach(member => {
      initialAmounts[member.id] = member.payoutIntent?.amount || '0'
    })
    setMemberAmounts(initialAmounts)
    setSelectedMembers(new Set())
    setCurrentStep(isCreatingFromReaction ? 2 : 1)
    setTransactionName(isCreatingFromReaction ? 'New Transaction (Re-action)' : '')
    setExecutionDate('')
  }, [organizationMembers, isCreatingFromReaction])

  // Re-action 回填
  useEffect(() => {
    if (!isCreatingFromReaction || transactionDetailMembers.length === 0 || organizationMembers.length === 0) return
    const initialAmounts: Record<string, string> = {}
    organizationMembers.forEach(m => {
      initialAmounts[m.id] = m.payoutIntent?.amount || '0'
    })
    const orgMemberIds: string[] = []
    transactionDetailMembers.forEach(item => {
      const orgMember = organizationMembers.find(m => m.memberId === item.memberId)
      if (orgMember) {
        orgMemberIds.push(orgMember.id)
        initialAmounts[orgMember.id] = item.amount ?? '0'
      }
    })
    setSelectedMembers(new Set(orgMemberIds))
    setMemberAmounts(initialAmounts)
    if (initialExecutionDate) setExecutionDate(initialExecutionDate)
  }, [transactionDetailMembers, organizationMembers, isCreatingFromReaction, initialExecutionDate])

  // 从已选成员的 payoutIntents[0] 推导出唯一 caipChainId+token，以及用于显示的 symbol
  const { derivedCurrency, derivedTokenAddress, derivedCaipChainId, currencyMismatch } = useMemo(() => {
    const intents = Array.from(selectedMembers)
      .map(id => organizationMembers.find(m => m.id === id)?.payoutIntent)
      .filter(Boolean) as { caipChainId: string; token: string }[]

    if (intents.length === 0) {
      return { derivedCurrency: '', derivedTokenAddress: '', derivedCaipChainId: '', currencyMismatch: false }
    }

    // 检查所有已选成员的 caipChainId+token 是否一致
    const keys = Array.from(new Set(intents.map(i => `${i.caipChainId}:${i.token}`)))
    if (keys.length > 1) {
      return { derivedCurrency: '', derivedTokenAddress: '', derivedCaipChainId: '', currencyMismatch: true }
    }

    const { caipChainId, token } = intents[0]
    return {
      derivedCurrency: getTokenSymbol(caipChainId, token) ?? token.slice(0, 6),
      derivedTokenAddress: token,
      derivedCaipChainId: caipChainId,
      currencyMismatch: false,
    }
  }, [selectedMembers, organizationMembers, getTokenSymbol])

  const totalAmount = useMemo(() => {
    let sum = 0
    selectedMembers.forEach(id => { sum += parseFloat(memberAmounts[id] || '0') || 0 })
    return sum
  }, [selectedMembers, memberAmounts])

  function formatDateForDisplay(dateString: string): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(2, '0')}`
  }

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) newSelected.delete(memberId)
    else newSelected.add(memberId)
    setSelectedMembers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === organizationMembers.length) setSelectedMembers(new Set())
    else setSelectedMembers(new Set(organizationMembers.map(m => m.id)))
  }

  const handleInvertSelection = () => {
    const newSelected = new Set<string>()
    organizationMembers.forEach(member => {
      if (!selectedMembers.has(member.id)) newSelected.add(member.id)
    })
    setSelectedMembers(newSelected)
  }

  const handleAmountChange = (memberId: string, value: string) => {
    if (value !== '' && parseFloat(value) < 0) return
    setMemberAmounts(prev => ({ ...prev, [memberId]: value }))
  }

  const handleNext = () => setCurrentStep(2)
  const handlePrevious = () => setCurrentStep(1)

  const handleCreateTransaction = () => {
    onCreateTransaction({
      selectedMembers,
      memberAmounts,
      transactionName,
      executionDate,
    })
  }

  const memberDetailsForPreview = useMemo(() => {
    if (transactionDetailMembers.length > 0) return transactionDetailMembers
    return Array.from(selectedMembers).map(memberId => {
      const member = organizationMembers.find(m => m.id === memberId)
      return {
        id: memberId,
        member: { showName: member?.showName ?? '' },
        amount: memberAmounts[memberId] || '0',
      }
    })
  }, [transactionDetailMembers, selectedMembers, organizationMembers, memberAmounts])

  const canProceedToStep2 = selectedMembers.size > 0 && !currencyMismatch && !!derivedCurrency

  return (
    <div className="flex flex-col h-full">
      {variant === 'dialog' && (
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle>Create New Transaction</DialogTitle>
        </DialogHeader>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-4 pb-6">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              currentStep === 1
                ? 'bg-primary text-primary-foreground'
                : isCreatingFromReaction
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {isCreatingFromReaction && currentStep === 2 ? '✓' : '1'}
          </div>
          <span className={cn('text-sm font-medium', currentStep === 1 || isCreatingFromReaction ? 'text-foreground' : 'text-muted-foreground')}>
            Select Members & Set Amounts
          </span>
        </div>
        <div className="bg-border h-px flex-1" />
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            2
          </div>
          <span className={cn('text-sm font-medium', currentStep === 2 ? 'text-foreground' : 'text-muted-foreground')}>
            Choose Date & Preview
          </span>
        </div>
      </div>

      {/* Step 1: Select members and amounts */}
      {currentStep === 1 && (
        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
                <Button variant="outline" size="sm" onClick={handleInvertSelection}>Invert Selection</Button>
              </div>

              {/* 已选成员数 + 推导出的 token + 总金额 */}
              <div className="bg-muted flex shrink-0 flex-row items-center gap-3 rounded-lg p-2">
                <span className="text-muted-foreground text-sm">Members: {selectedMembers.size}</span>
                {selectedMembers.size > 0 && (
                  currencyMismatch ? (
                    <span className="text-xs text-destructive font-medium">Currency mismatch</span>
                  ) : derivedCurrency ? (
                    <span className="text-sm font-medium">
                      Total: {totalAmount} {derivedCurrency}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No payout intent set</span>
                  )
                )}
              </div>
            </div>

            {currencyMismatch && (
              <p className="text-destructive text-sm">
                Selected members have different currencies. All members in a transaction must share the same currency.
              </p>
            )}

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Service Fee ({payrollTokenSymbol})</TableHead>
                    <TableHead>META PUB STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersLoading || (isCreatingFromReaction && reactionSourceLoading) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <IconLoader2 className="h-4 w-4 animate-spin" />
                          {isCreatingFromReaction && reactionSourceLoading ? 'Loading re-action data...' : 'Loading members...'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : organizationMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">No members found.</TableCell>
                    </TableRow>
                  ) : (
                    organizationMembers.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.id)}
                            onChange={() => handleMemberToggle(member.id)}
                            className="border-input accent-primary h-4 w-4 cursor-pointer rounded"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{member.showName || "-"}</TableCell>
                        <TableCell>{member.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.roles[0]?.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={memberAmounts[member.id] || ''}
                            onChange={e => handleAmountChange(member.id, e.target.value)}
                            className="w-24"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          {member.metaPub ? (
                            <Badge variant="success" className="text-xs">Ready</Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">No metaPub</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Date and preview */}
      {currentStep === 2 && (
        <div className="flex-1 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transaction-name">Transaction Name</Label>
              <Input
                id="transaction-name"
                placeholder="Enter transaction name."
                value={transactionName}
                onChange={e => setTransactionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="execution-date">Execution Date</Label>
              <DatePickerInput
                id="execution-date"
                value={executionDate ? new Date(executionDate) : undefined}
                onChange={date =>
                  setExecutionDate(
                    date
                      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                      : ''
                  )
                }
                fromDate={(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Transaction Name:</span>
              <span className="text-sm font-medium">{transactionName || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Token:</span>
              <span className="text-sm font-medium">{derivedCurrency || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Selected Members:</span>
              <span className="text-sm font-medium">{selectedMembers.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Execution Date:</span>
              <span className="text-sm font-medium">{executionDate ? formatDateForDisplay(executionDate) : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total Amount:</span>
              <span className="text-sm font-medium">
                {totalAmount} {derivedCurrency}
              </span>
            </div>
          </div>

          {/* Member details */}
          <div className="space-y-3">
            <h3 className="text-muted-foreground text-sm font-medium uppercase">Member Details</h3>
            <div className="space-y-2">
              {memberDetailsForPreview.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{item.member?.showName ?? ''}</span>
                  <span className="text-muted-foreground text-sm">
                    {parseFloat(String(item.amount))} {derivedCurrency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-3 border-t pt-4 mt-6">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        {currentStep === 1 && (
          <Button onClick={handleNext} disabled={!canProceedToStep2}>
            Next
          </Button>
        )}
        {currentStep === 2 && (
          <>
            <Button variant="outline" onClick={handlePrevious}>Previous</Button>
            <Button onClick={handleCreateTransaction} disabled={!transactionName || !executionDate}>
              Create Transaction
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
