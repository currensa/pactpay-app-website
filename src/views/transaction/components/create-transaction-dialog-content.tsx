import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { DatePickerInput } from '@/components/ui/datePickerInput'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import useChainAssetStore from '@/stores/chain-asset'
import useHeaderStore from '@/stores/header'
import useOrganizationStore from '@/stores/organization'
import { IconLoader2 } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

interface FeePreview {
  billableMemberCount: number
  totalMemberCount: number
  plan: {
    id: string
    name: string
    pricePerMember: number
    originalPricePerMember: number
    description: string
  }
  originalFee: number
  discountedFee: number
}

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
  const { setHeader, clearHeader } = useHeaderStore()
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [memberAmounts, setMemberAmounts] = useState<Record<string, string>>({})
  const [transactionName, setTransactionName] = useState('')
  const [executionDate, setExecutionDate] = useState('')
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const getTokenSymbol = useChainAssetStore(s => s.getTokenSymbol)

  useEffect(() => {
    fetchPayrollTokenSymbol()
  }, [])

  // Sync step indicator into AppHeader when rendered as a page
  useEffect(() => {
    if (variant !== 'page') return
    setHeader({
      backUrl: '/orgs/transaction',
      steps: [
        { label: '1.Select Members & Amount', active: currentStep === 1 },
        { label: '2.Set Execution Date', active: currentStep === 2 },
      ],
    })
    return () => clearHeader()
  }, [variant, currentStep])

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
      const orgMember = organizationMembers.find(m => m.memberId === item.member?.memberId)
      if (orgMember) {
        orgMemberIds.push(orgMember.id)
        initialAmounts[orgMember.id] = item.amount ?? '0'
      }
    })
    setSelectedMembers(new Set(orgMemberIds))
    setMemberAmounts(initialAmounts)
    if (initialExecutionDate) setExecutionDate(initialExecutionDate)
  }, [transactionDetailMembers, organizationMembers, isCreatingFromReaction, initialExecutionDate])

  // 实时计算服务费（防抖 500ms）
  useEffect(() => {
    if (organizationMembers.length === 0) return
    const timer = setTimeout(async () => {
      setFeeLoading(true)
      try {
        const payload = organizationMembers.map(m => ({
          memberId: m.memberId,
          amount: selectedMembers.has(m.id) ? (memberAmounts[m.id] || '0') : '0',
        }))
        const result = await apis.transaction.getFeePreview(payload)
        setFeePreview(result)
      } catch {
        // silently ignore fee preview errors
      } finally {
        setFeeLoading(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [selectedMembers, memberAmounts, organizationMembers])

  // 从已选成员的 payoutIntents[0] 推导出唯一 caipChainId+token，以及用于显示的 symbol
  const { derivedCurrency, derivedTokenAddress, derivedCaipChainId, currencyMismatch } = useMemo(() => {
    const intents = Array.from(selectedMembers)
      .map(id => organizationMembers.find(m => m.id === id)?.payoutIntent)
      .filter(Boolean) as { caipChainId: string; token: string }[]

    if (intents.length === 0) {
      return { derivedCurrency: '', derivedTokenAddress: '', derivedCaipChainId: '', currencyMismatch: false }
    }

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

  const eligibleMembers = useMemo(
    () => organizationMembers.filter(m => !!m.metaPub),
    [organizationMembers]
  )

  const handleMemberToggle = (memberId: string) => {
    const member = organizationMembers.find(m => m.id === memberId)
    if (!member?.metaPub) return
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) newSelected.delete(memberId)
    else newSelected.add(memberId)
    setSelectedMembers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === eligibleMembers.length) setSelectedMembers(new Set())
    else setSelectedMembers(new Set(eligibleMembers.map(m => m.id)))
  }

  const handleInvertSelection = () => {
    const newSelected = new Set<string>()
    eligibleMembers.forEach(member => {
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
    return Array.from(selectedMembers).map(memberId => {
      const member = organizationMembers.find(m => m.id === memberId)
      return {
        id: memberId,
        member: { showName: member?.showName ?? '', memberId: member?.memberId ?? '', avatarUrl: member?.avatarUrl ?? null },
        amount: memberAmounts[memberId] || '0',
      }
    })
  }, [selectedMembers, organizationMembers, memberAmounts])

  const canProceedToStep2 =
    selectedMembers.size > 0 &&
    !currencyMismatch &&
    Array.from(selectedMembers).every(id => parseFloat(memberAmounts[id] || '0') > 0)

  const nextTooltipMsg = (() => {
    if (selectedMembers.size === 0) return 'Please select at least one member'
    if (currencyMismatch) return 'Selected members have different currencies'
    if (!Array.from(selectedMembers).every(id => parseFloat(memberAmounts[id] || '0') > 0))
      return 'All selected members must have an amount greater than 0'
    return ''
  })()

  const isSelected = (id: string) => selectedMembers.has(id)
  const allSelected = eligibleMembers.length > 0 && selectedMembers.size === eligibleMembers.length
  const someSelected = selectedMembers.size > 0 && !allSelected

  // ── Shared table ─────────────────────────────────────────────────────────
  const memberTable = (
    <div className="flex-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
            <TableHead className="w-10 pb-3">
              <div
                className={cn(
                  'w-[14px] h-[14px] rounded-[3px] border cursor-pointer flex items-center justify-center shrink-0',
                  allSelected || someSelected ? 'bg-[#5e85ee] border-[#5e85ee]' : 'bg-white border-[rgba(0,0,0,0.2)]'
                )}
                onClick={handleSelectAll}
              >
                {(allSelected || someSelected) && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </div>
            </TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[220px]">Member</TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[220px]">Email</TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[180px]">Role</TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3">
              Amount{payrollTokenSymbol ? ` (${payrollTokenSymbol})` : ''}
            </TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[150px] inline-block">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {membersLoading || (isCreatingFromReaction && reactionSourceLoading) ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-[#8d8d93] text-[13px]">
                <div className="flex items-center justify-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  {isCreatingFromReaction && reactionSourceLoading ? 'Loading re-action data...' : 'Loading members...'}
                </div>
              </TableCell>
            </TableRow>
          ) : organizationMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-[24px]">
                <div className="flex flex-col items-center justify-center gap-[10px]">
                  <img src="/empty-table.svg" alt="No members" className="h-[120px] w-[120px]" />
                  <p className="text-[13px] leading-[20px] text-[#8d8d93]">No members found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            organizationMembers.map(member => {
              const checked = isSelected(member.id)
              const hasMetaPub = !!member.metaPub
              return (
                <TableRow
                  key={member.id}
                  className={cn(
                    'border-b border-[rgba(0,0,0,0.06)]',
                    hasMetaPub ? 'hover:bg-[#f5f5f5]/60 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  )}
                  onClick={() => handleMemberToggle(member.id)}
                >
                  <TableCell className="py-[14px]">
                    <div className={cn(
                      'w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center shrink-0',
                      !hasMetaPub ? 'bg-[#f5f5f5] border-[rgba(0,0,0,0.1)]' : checked ? 'bg-[#5e85ee] border-[#5e85ee]' : 'bg-white border-[rgba(0,0,0,0.2)]'
                    )}>
                      {checked && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-[14px]">
                    <div className="flex items-center gap-[6px]">
                      <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee] overflow-hidden">
                        {member.avatarUrl
                          ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : (member.showName || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-[13px] text-[#1c1c26] leading-[22px]">{member.showName || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">{member.email || '-'}</TableCell>
                  <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">{member.roles[0]?.role || '-'}</TableCell>
                  <TableCell className="py-[14px]" onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      disabled={!hasMetaPub}
                      value={memberAmounts[member.id] ?? ''}
                      onChange={e => handleAmountChange(member.id, e.target.value)}
                      placeholder="0"
                      className={cn(
                        'w-[140px] h-[34px] rounded-[10px] px-3 text-[13px] text-[#1c1c26] leading-[22px] outline-none border-0 disabled:cursor-not-allowed',
                        checked ? 'bg-[#f5f5f5]' : 'bg-transparent'
                      )}
                    />
                  </TableCell>
                  <TableCell className="py-[14px]">
                    {hasMetaPub ? (
                      <span className="inline-flex rounded-[8px] bg-[rgba(93,221,34,0.12)] px-[8px] py-[3px] text-[12px] font-medium text-[#3da813]">
                        ready
                      </span>
                    ) : (
                      <span className="inline-flex rounded-[8px] bg-[rgba(255,168,0,0.12)] px-[8px] py-[3px] text-[12px] font-medium text-[#ffa800]">
                        No wallet bound
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {variant === 'dialog' && (
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle>Create New Transaction</DialogTitle>
        </DialogHeader>
      )}

      {/* Step indicator — dialog variant only */}
      {variant !== 'page' && (
        <div className="flex items-center gap-4 pb-6">
          <div className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium', currentStep === 1 ? 'bg-primary text-primary-foreground' : isCreatingFromReaction ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>
              {isCreatingFromReaction && currentStep === 2 ? '✓' : '1'}
            </div>
            <span className={cn('text-sm font-medium', currentStep === 1 || isCreatingFromReaction ? 'text-foreground' : 'text-muted-foreground')}>Select Members & Set Amounts</span>
          </div>
          <div className="bg-border h-px flex-1" />
          <div className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium', currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>2</div>
            <span className={cn('text-sm font-medium', currentStep === 2 ? 'text-foreground' : 'text-muted-foreground')}>Choose Date & Preview</span>
          </div>
        </div>
      )}

      {/* ── Step 1: Select members & amounts ─────────────────────────────── */}
      {currentStep === 1 && (
        <>
          {/* Page variant: two-panel layout */}
          {variant === 'page' ? (
            <div className="flex gap-[28px] flex-1 min-h-0">
              {/* Left: table card */}
              <div className="bg-white rounded-[32px] p-[22px] flex-1 flex flex-col overflow-hidden min-w-0">
                {currencyMismatch && (
                  <p className="text-[#d92b2b] text-[13px] mb-3">
                    Selected members have different currencies. All members in a transaction must share the same currency.
                  </p>
                )}
                {memberTable}
                {/* Footer: select controls only */}
                <div className="flex items-center gap-[10px] pt-5 shrink-0">
                  <button
                    onClick={handleSelectAll}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleInvertSelection}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                  >
                    Invert Selection
                  </button>
                  {currencyMismatch ? (
                    <span className="text-[13px] text-[#d92b2b]">Currency mismatch</span>
                  ) : selectedMembers.size > 0 && derivedCurrency ? (
                    <span className="text-[13px] text-[#606067]">{selectedMembers.size} members · {totalAmount} {derivedCurrency}</span>
                  ) : null}
                </div>
              </div>

              {/* Right: fee panel */}
              <div className="bg-white rounded-[32px] p-[22px] w-[300px] shrink-0 flex flex-col gap-[20px]">
                <p
                  className="text-[16px] text-[#1c1c26] font-medium leading-[26px]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Your Service Fee
                </p>

                <div className="flex flex-col flex-1">
                  {feeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <IconLoader2 className="size-5 animate-spin text-[#8d8d93]" />
                    </div>
                  ) : feePreview ? (
                    <div className="flex flex-col gap-[8px]">
                      {/* Price row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-[3px]">
                          <span className="text-[14px] text-[#8d8d93] line-through leading-[24px]">
                            {feePreview.plan.originalPricePerMember} {payrollTokenSymbol || ''}
                          </span>
                          <span className="text-[22px] font-bold text-[#1c1c26] leading-[34px]">
                            {feePreview.plan.pricePerMember} {payrollTokenSymbol || ''}
                          </span>
                        </div>
                        <span className="text-[14px] text-[#1c1c26] leading-[24px]">
                          x {feePreview.billableMemberCount}
                        </span>
                      </div>
                      {/* Subtotal row */}
                      <div className="border-t border-[rgba(0,0,0,0.12)] flex items-center justify-between py-[14px]">
                        <span className="text-[14px] text-[#1c1c26] leading-[24px]">Subtotal</span>
                        <span className="text-[14px] text-[#1c1c26] leading-[24px]">
                          {feePreview.discountedFee} {payrollTokenSymbol || 'USDC'}
                        </span>
                      </div>
                      {/* Plan description */}
                      <p className="text-[12px] text-[#8d8d93] leading-[18px]">
                        {feePreview.plan.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#8d8d93] py-6 text-center">
                      Select members to preview fee
                    </p>
                  )}
                </div>

                {/* Next button at bottom of panel */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="mt-auto w-full">
                      <button
                        onClick={handleNext}
                        disabled={!canProceedToStep2}
                        className="h-[38px] w-full rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </span>
                  </TooltipTrigger>
                  {nextTooltipMsg && (
                    <TooltipContent side="top">{nextTooltipMsg}</TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>
          ) : (
            /* Dialog variant: original single-column layout */
            <div className="flex flex-col flex-1 overflow-hidden">
              {currencyMismatch && (
                <p className="text-[#d92b2b] text-[13px] mb-3">
                  Selected members have different currencies. All members in a transaction must share the same currency.
                </p>
              )}
              {memberTable}
              {/* Footer */}
              <div className="flex items-center justify-between pt-5 shrink-0">
                <div className="flex items-center gap-[10px]">
                  <button
                    onClick={handleSelectAll}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleInvertSelection}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                  >
                    Invert Selection
                  </button>
                  {currencyMismatch ? (
                    <span className="text-[13px] text-[#d92b2b]">Currency mismatch</span>
                  ) : selectedMembers.size > 0 && derivedCurrency ? (
                    <span className="text-[13px] text-[#606067]">{selectedMembers.size} members · {totalAmount} {derivedCurrency}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-[10px]">
                  <button
                    onClick={onCancel}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                  >
                    Cancel
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          onClick={handleNext}
                          disabled={!canProceedToStep2}
                          className="h-[38px] px-4 rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </span>
                    </TooltipTrigger>
                    {nextTooltipMsg && (
                      <TooltipContent side="top">{nextTooltipMsg}</TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Step 2: Date, preview & member details ───────────────────────── */}
      {currentStep === 2 && (
        <div className={cn(
          'flex flex-col flex-1 overflow-hidden',
          variant === 'page' && 'bg-white rounded-[32px] p-[22px]'
        )}>
          <div className="flex flex-1 gap-[20px] overflow-hidden min-h-0">
            {/* Left column */}
            <div className="flex flex-col flex-1 gap-[28px] overflow-y-auto min-w-0">
              {/* Transaction Name */}
              <div className="flex flex-col gap-[7px]">
                <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Transaction Name</span>
                <input
                  type="text"
                  placeholder="Enter transaction name"
                  value={transactionName}
                  onChange={e => setTransactionName(e.target.value)}
                  className="w-full bg-[#f5f5f5] rounded-[12px] px-4 py-[11px] text-[13px] text-[#1c1c26] leading-[22px] placeholder:text-[#8d8d93] outline-none border-0"
                />
              </div>

              {/* Execution Date */}
              <div className="flex flex-col gap-[7px]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Execution Date</span>
                  <span className="text-[12px] text-[#8d8d93] leading-[22px]">{(() => { const o = -new Date().getTimezoneOffset(); return `UTC${o >= 0 ? '+' : ''}${String(Math.floor(Math.abs(o) / 60)).padStart(2, '0')}:${String(Math.abs(o) % 60).padStart(2, '0')}` })()}</span>
                </div>
                <div className="[&_input]:bg-[#f5f5f5] [&_input]:rounded-[12px] [&_input]:border-0 [&_input]:text-[13px] [&_input]:text-[#1c1c26] [&_input]:h-[44px] [&_input]:px-4">
                  <DatePickerInput
                    showTime
                    value={executionDate ? new Date(executionDate) : undefined}
                    onChange={date =>
                      setExecutionDate(
                        date
                          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                          : ''
                      )
                    }
                    fromDate={(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()}
                  />
                </div>
              </div>

              {/* Transaction Preview */}
              <div className="flex flex-col flex-1 border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden">
                <div className="bg-[#f5f5f5] px-4 py-[7px] shrink-0">
                  <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Transaction Preview</span>
                </div>
                <div className="flex flex-col gap-[14px] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8d8d93] leading-[22px]">Transaction Name</span>
                    <span className="text-[13px] text-[#1c1c26] leading-[22px]">{transactionName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8d8d93] leading-[22px]">Selected Members</span>
                    <span className="text-[13px] text-[#1c1c26] leading-[22px]">{selectedMembers.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8d8d93] leading-[22px]">Execution Date</span>
                    <span className="text-[13px] text-[#1c1c26] leading-[22px]">{executionDate ? `${executionDate} ${(() => { const o = -new Date().getTimezoneOffset(); return `UTC${o >= 0 ? '+' : ''}${String(Math.floor(Math.abs(o) / 60)).padStart(2, '0')}:${String(Math.abs(o) % 60).padStart(2, '0')}` })()}` : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8d8d93] leading-[22px]">Total Amount</span>
                    <span className="text-[13px] text-[#1c1c26] leading-[22px]">{totalAmount} {derivedCurrency || '-'}</span>
                  </div>
                  {feePreview && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#8d8d93] leading-[22px]">Service Fee</span>
                      <span className="text-[13px] text-[#1c1c26] leading-[22px]">{feePreview.discountedFee} {payrollTokenSymbol || 'USDC'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Member Details */}
            <div className="flex flex-col flex-1 border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden min-w-0">
              <div className="bg-[#f5f5f5] px-4 py-[7px] shrink-0">
                <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Member Details</span>
              </div>
              <div className="flex flex-col gap-[18px] p-4 overflow-y-auto flex-1">
                {memberDetailsForPreview.map(item => {
                  const originalAmount = organizationMembers.find(m => m.memberId === (item as any).member?.memberId)?.payoutIntent?.amount
                  const newAmount = parseFloat(String(item.amount)) || 0
                  const hasChanged = isCreatingFromReaction && originalAmount !== undefined && parseFloat(originalAmount) !== newAmount
                  return (
                    <div key={item.id ?? item.memberId} className="flex items-center justify-between">
                      <div className="flex items-center gap-[6px]">
                        <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee] overflow-hidden">
                          {item.member?.avatarUrl
                            ? <img src={item.member.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : (item.member?.showName || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-[13px] text-[#1c1c26] leading-[22px] w-[110px] truncate">{item.member?.showName ?? ''}</span>
                      </div>
                      <div className="flex items-center gap-[4px]">
                        {hasChanged && (
                          <span className="text-[13px] text-[#bbbbbe] line-through leading-[22px]">
                            {parseFloat(originalAmount!).toLocaleString()}
                          </span>
                        )}
                        <span className="text-[13px] text-[#1c1c26] leading-[22px]">
                          {newAmount.toLocaleString()} {derivedCurrency}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Step 2 footer */}
          <div className="flex items-center justify-between pt-5 shrink-0">
            <button
              onClick={variant === 'page' ? handlePrevious : onCancel}
              className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
            >
              {variant === 'page' ? 'Back' : 'Cancel'}
            </button>
            <div className="flex items-center gap-[10px]">
              {variant !== 'page' && (
                <button
                  onClick={handlePrevious}
                  className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleCreateTransaction}
                disabled={!transactionName || !executionDate}
                className="h-[38px] px-4 rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
              >
                Create Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
