import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { DatePickerInput } from '@/components/ui/datePickerInput'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { timezoneOptions } from '@/lib/timezone-options'
import { cn } from '@/lib/utils'
import useChainAssetStore from '@/stores/chain-asset'
import useHeaderStore from '@/stores/header'
import useOrganizationStore from '@/stores/organization'
import { IconCalendar, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

const imgCreditCard = 'https://www.figma.com/api/mcp/asset/7a9d3d4c-af2e-4654-98b2-5959652689d2'
const imgFrameLogo = 'https://www.figma.com/api/mcp/asset/b2de3152-127b-462c-8406-266b2cec11bf'
const imgUserDollar = 'https://www.figma.com/api/mcp/asset/e1cdd45f-133a-48ff-a629-05467127ba7d'
const imgTimeForward = 'https://www.figma.com/api/mcp/asset/d2b576dc-8113-4697-8aa1-87f3c15d4462'
const imgTimePast = 'https://www.figma.com/api/mcp/asset/e8970215-e02c-4cd8-9b5a-fe81467d16ea'

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
  caipChainId?: string
  token?: string
  gasFeeEstimate?: {
    gasPrice: string | null
    maxFeePerGas: string | null
    maxPriorityFeePerGas: string | null
    effectiveGasPrice: string | null
    nativeSymbol: string | null
    nativeDecimals: number | null
    approve: { gasUnits: string; costWei: string; costNative: string } | null
    deposit: { gasUnits: string; costWei: string; costNative: string } | null
    total: { gasUnits: string; costWei: string; costNative: string } | null
  }
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

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function getChainName(caipChainId: string): string {
  const map: Record<string, string> = {
    'eip155:1': 'Ethereum',
    'eip155:11155111': 'Sepolia Testnet',
    'eip155:137': 'Polygon',
    'eip155:56': 'BNB Chain',
  }
  return map[caipChainId] || caipChainId.split(':')[1] || caipChainId
}


function offsetToLabel(offset: number): string {
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const h = String(Math.floor(abs)).padStart(2, '0')
  const m = String(Math.round((abs % 1) * 60)).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

function toUtcIso(dateStr: string, offsetHours: number): string {
  // dateStr: "YYYY-MM-DD HH:mm", offsetHours: e.g. 8 for UTC+8
  const [datePart, timePart] = dateStr.split(' ')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - offsetHours * 3600 * 1000
  return new Date(utcMs).toISOString()
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
  const [selectedTimezone, setSelectedTimezone] = useState<string>(() => {
    const local = -new Date().getTimezoneOffset() / 60
    return timezoneOptions.reduce((prev, cur) =>
      Math.abs(cur.offset - local) < Math.abs(prev.offset - local) ? cur : prev
    ).value
  })
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)
  const currentMember = useOrganizationStore(s => s.currentMember)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const getTokenSymbol = useChainAssetStore(s => s.getTokenSymbol)

  useEffect(() => {
    fetchPayrollTokenSymbol()
  }, [])

  useEffect(() => {
    if (variant !== 'page') return
    setHeader({
      backUrl: '/orgs/transaction',
      steps: [
        { label: '1.Select Members & Amount', active: currentStep === 1 },
        { label: '2.Review & Confirm', active: currentStep === 2 },
      ],
    })
    return () => clearHeader()
  }, [variant, currentStep])

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

  const selectedTimezoneData = timezoneOptions.find(tz => tz.value === selectedTimezone) ?? timezoneOptions[13]

  const handleCreateTransaction = () => {
    const utcDate = executionDate ? toUtcIso(executionDate, selectedTimezoneData.offset) : executionDate
    onCreateTransaction({ selectedMembers, memberAmounts, transactionName, executionDate: utcDate })
  }

  const memberDetailsForPreview = useMemo(() => {
    return Array.from(selectedMembers).map(memberId => {
      const member = organizationMembers.find(m => m.id === memberId)
      return {
        id: memberId,
        member: {
          showName: member?.showName ?? '',
          memberId: member?.memberId ?? '',
          avatarUrl: member?.avatarUrl ?? null,
          remark: member?.remark ?? null,
          metaPub: member?.metaPub ?? '',
        },
        amount: memberAmounts[memberId] || '0',
      }
    })
  }, [selectedMembers, organizationMembers, memberAmounts])

  const canProceedToStep2 =
    selectedMembers.size > 0 &&
    !currencyMismatch &&
    Array.from(selectedMembers).every(id => parseFloat(memberAmounts[id] || '0') > 0) &&
    transactionName.trim().length > 0 &&
    executionDate.length > 0

  const nextTooltipMsg = (() => {
    if (selectedMembers.size === 0) return 'Please select at least one member'
    if (currencyMismatch) return 'Selected members have different currencies'
    if (!Array.from(selectedMembers).every(id => parseFloat(memberAmounts[id] || '0') > 0))
      return 'All selected members must have an amount greater than 0'
    if (!transactionName.trim()) return 'Please enter a transaction name'
    if (!executionDate) return 'Please select a claim time'
    return ''
  })()

  const isSelected = (id: string) => selectedMembers.has(id)
  const allSelected = eligibleMembers.length > 0 && selectedMembers.size === eligibleMembers.length
  const someSelected = selectedMembers.size > 0 && !allSelected

  const claimTimePassed = executionDate ? new Date(executionDate) < new Date() : false

  // ── Dialog variant table (original columns) ──────────────────────────────
  const dialogMemberTable = (
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
                      {member.memberId === currentMember?.memberId && <span className="shrink-0">🌟</span>}
                      {member.remark && (
                        <span className="max-w-[80px] truncate text-[11px] text-[#8d8d93]" title={member.remark}>
                          ({member.remark})
                        </span>
                      )}
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

  // ── Page variant table (Figma columns: Member, Wallet, Amount, Status) ────
  const pageMemberTable = (
    <div className="flex-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.12)] hover:bg-[#f5f5f5]">
            <TableHead className="w-10 py-2">
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
            <TableHead className="text-[#8d8d93] text-[13px] font-normal py-2 w-[200px]">Member</TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal py-2 w-[200px]">Wallet</TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal py-2 w-[160px]">
              {derivedCurrency || payrollTokenSymbol || 'USDC'}
            </TableHead>
            <TableHead className="text-[#8d8d93] text-[13px] font-normal py-2">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {membersLoading || (isCreatingFromReaction && reactionSourceLoading) ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-[#8d8d93] text-[13px]">
                <div className="flex items-center justify-center gap-2">
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  {isCreatingFromReaction && reactionSourceLoading ? 'Loading re-action data...' : 'Loading members...'}
                </div>
              </TableCell>
            </TableRow>
          ) : organizationMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-[24px]">
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
                  <TableCell className="py-[12px]">
                    <div className={cn(
                      'w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center shrink-0',
                      !hasMetaPub ? 'bg-[#f5f5f5] border-[rgba(0,0,0,0.1)]' : checked ? 'bg-[#5e85ee] border-[#5e85ee]' : 'bg-white border-[rgba(0,0,0,0.2)]'
                    )}>
                      {checked && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-[12px]">
                    <div className="flex items-center gap-[6px]">
                      <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee] overflow-hidden">
                        {member.avatarUrl
                          ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : (member.showName || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-[13px] text-[#1c1c26] leading-[22px]">{member.showName || '-'}</span>
                      {member.memberId === currentMember?.memberId && <span className="shrink-0">🌟</span>}
                      {member.remark && (
                        <span className="max-w-[80px] truncate text-[11px] text-[#8d8d93]" title={member.remark}>
                          ({member.remark})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[12px]">
                    {member.metaPub ? truncateAddress(member.metaPub) : '—'}
                  </TableCell>
                  <TableCell className="py-[12px]" onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      disabled={!hasMetaPub}
                      value={memberAmounts[member.id] ?? ''}
                      onChange={e => handleAmountChange(member.id, e.target.value)}
                      placeholder="0"
                      className={cn(
                        'w-[130px] h-[32px] rounded-[10px] px-3 text-[13px] text-[#1c1c26] leading-[22px] outline-none border-0 disabled:cursor-not-allowed',
                        checked ? 'bg-[#f5f5f5]' : 'bg-transparent'
                      )}
                    />
                  </TableCell>
                  <TableCell className="py-[12px]">
                    {hasMetaPub ? (
                      <span className="inline-flex rounded-[8px] bg-[rgba(93,221,34,0.12)] px-[8px] py-[2px] text-[12px] font-medium text-[#3da813]">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex rounded-[8px] bg-[rgba(0,0,0,0.04)] px-[8px] py-[2px] text-[12px] text-[#606067]">
                        No Wallet
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

      {/* ── Step 1 ─────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <>
          {variant === 'page' ? (
            <div className="flex gap-[26px] flex-1 min-h-0">
              {/* Left: main content */}
              <div className="bg-white rounded-[32px] p-[20px] flex-1 flex flex-col gap-[18px] overflow-hidden min-w-0">
                {/* Transaction Name */}
                <div className="flex flex-col gap-[6px] shrink-0">
                  <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Transaction Name</span>
                  <input
                    type="text"
                    placeholder="e.g. April salary, Q1 bonus..."
                    value={transactionName}
                    onChange={e => setTransactionName(e.target.value)}
                    className="w-full bg-[#f5f5f5] rounded-[12px] px-4 py-[10px] text-[13px] text-[#1c1c26] leading-[22px] placeholder:text-[#bbbbbe] outline-none border-0"
                  />
                </div>

                {/* Member & USDC section */}
                <div className="flex flex-col flex-1 gap-[6px] overflow-hidden min-h-0">
                  <div className="flex items-center gap-[6px] shrink-0">
                    <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px] whitespace-nowrap">
                      Member &amp; {derivedCurrency || payrollTokenSymbol || 'USDC'}
                    </span>
                    <span className="text-[12px] text-[#8d8d93] leading-[22px]">
                      Members without a connected wallet cannot receive payments. Ask them to bind their wallet in Account settings first.
                    </span>
                  </div>
                  {currencyMismatch && (
                    <p className="text-[#d92b2b] text-[12px] shrink-0">
                      Selected members have different currencies. All members in a transaction must share the same currency.
                    </p>
                  )}
                  <div className="flex-1 overflow-hidden min-h-0 border border-[rgba(0,0,0,0.12)] rounded-[12px]">
                    {pageMemberTable}
                  </div>
                  {/* Select controls */}
                  <div className="flex items-center gap-[8px] shrink-0 pt-1">
                    <button
                      onClick={handleSelectAll}
                      className="h-[34px] px-3 rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white text-[12px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleInvertSelection}
                      className="h-[34px] px-3 rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white text-[12px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                    >
                      Invert Selection
                    </button>
                    {currencyMismatch ? (
                      <span className="text-[12px] text-[#d92b2b]">Currency mismatch</span>
                    ) : selectedMembers.size > 0 && derivedCurrency ? (
                      <span className="text-[12px] text-[#606067]">{selectedMembers.size} members · {totalAmount} {derivedCurrency}</span>
                    ) : null}
                  </div>
                </div>

                {/* Claim time */}
                <div className="flex flex-col gap-[6px] shrink-0">
                  <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Claim time</span>
                  <div className="flex items-center gap-[8px]">
                    {/* Date picker */}
                    <div className="flex-1">
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
                    {/* Timezone selector */}
                    <div className="flex-1 flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-4 h-[46px] gap-2">
                      <select
                        value={selectedTimezone}
                        onChange={e => setSelectedTimezone(e.target.value)}
                        className="flex-1 min-w-0 bg-transparent border-0 text-[13px] text-[#1c1c26] outline-none appearance-none cursor-pointer truncate"
                      >
                        {timezoneOptions.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label.en}</option>
                        ))}
                      </select>
                      <IconCalendar size={18} className="text-[#bbbbbe] shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: fee panel */}
              <div className="bg-white rounded-[32px] p-[20px] w-[360px] shrink-0 flex flex-col gap-[18px] justify-between">
                <div className="flex flex-col gap-[18px]">
                  {/* Fee breakdown */}
                  <div className="flex flex-col gap-[10px]">
                    <p className="text-[16px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Fee breakdown
                    </p>
                    <div className="bg-[#f5f5f5] rounded-[18px] p-[18px] flex flex-col gap-[10px]">
                      {feeLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <IconLoader2 className="size-5 animate-spin text-[#8d8d93]" />
                        </div>
                      ) : feePreview ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-[#8d8d93]">Payout total</span>
                            <span className="text-[14px] text-[#1c1c26]">{totalAmount} {derivedCurrency || 'USDC'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-[4px]">
                              <span className="text-[13px] text-[#8d8d93]">Service fee</span>
                              {feePreview.originalFee > feePreview.discountedFee && (
                                <span className="bg-[rgba(93,221,34,0.12)] px-[7px] py-[1px] rounded-[8px] text-[11px] text-[#5ddd22]">
                                  {Math.round((1 - feePreview.discountedFee / feePreview.originalFee) * 100)}% off
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-[2px]">
                              {feePreview.originalFee > feePreview.discountedFee && (
                                <span className="text-[13px] text-[#8d8d93] line-through leading-[22px]">
                                  {feePreview.originalFee}{payrollTokenSymbol || 'U'}
                                </span>
                              )}
                              <span className="text-[20px] font-bold text-[#1c1c26] leading-[32px]">
                                {feePreview.discountedFee}{payrollTokenSymbol || 'U'}
                              </span>
                            </div>
                          </div>
                          {feePreview.gasFeeEstimate?.total?.costNative && (
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-[#8d8d93]">Est. gas</span>
                              <span className="text-[13px] text-[#1c1c26]">
                                {feePreview.gasFeeEstimate.total.costNative}{feePreview.gasFeeEstimate.nativeSymbol || ''}
                              </span>
                            </div>
                          )}
                          <div className="border-t border-[rgba(0,0,0,0.12)] flex items-center justify-between pt-[14px] pb-[6px]">
                            <span className="text-[13px] text-[#1c1c26]">Total from wallet</span>
                            <span className="text-[13px] text-[#1c1c26]">
                              {totalAmount + feePreview.discountedFee} {derivedCurrency || 'USDC'}
                            </span>
                          </div>
                          {feePreview.plan.description && (
                            <p className="text-[11px] text-[#8d8d93] text-center">{feePreview.plan.description}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[12px] text-[#8d8d93] text-center py-4">
                          Select members to preview fee
                        </p>
                      )}
                    </div>
                  </div>

                  {/* How funds move */}
                  <div className="flex flex-col gap-[10px]">
                    <p className="text-[16px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      How funds move
                    </p>
                    <div className="relative bg-[#f5f5f5] rounded-[18px] p-[18px] flex flex-col gap-[14px]">
                      <div className="flex gap-[10px] items-start">
                        <div className="bg-white rounded-[8px] flex items-center justify-center w-[30px] h-[30px] shrink-0">
                          <img src={imgCreditCard} alt="" className="w-[17px] h-[17px]" />
                        </div>
                        <div className="flex flex-col gap-[3px]">
                          <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Your wallet</span>
                          <span className="text-[12px] text-[#8d8d93]">Funds sent to contract</span>
                        </div>
                      </div>
                      <div className="flex items-center pl-[14px]">
                        <div className="w-[1px] h-[14px] bg-[rgba(0,0,0,0.15)]" />
                      </div>
                      <div className="flex gap-[10px] items-start">
                        <div className="bg-white rounded-[8px] flex items-center justify-center w-[30px] h-[30px] shrink-0">
                          <img src={imgFrameLogo} alt="" className="w-[14px] h-[17px]" />
                        </div>
                        <div className="flex flex-col gap-[3px]">
                          <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">PactPay contract</span>
                          <span className="text-[12px] text-[#8d8d93]">Routes and releases at claim time</span>
                        </div>
                      </div>
                      <div className="flex items-center pl-[14px]">
                        <div className="w-[1px] h-[14px] bg-[rgba(0,0,0,0.15)]" />
                      </div>
                      <div className="flex gap-[10px] items-start">
                        <div className="bg-white rounded-[8px] flex items-center justify-center w-[30px] h-[30px] shrink-0">
                          <img src={imgUserDollar} alt="" className="w-[17px] h-[17px]" />
                        </div>
                        <div className="flex flex-col gap-[3px]">
                          <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Members' wallets</span>
                          <span className="text-[12px] text-[#8d8d93]">Claimable from claim time onwards</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review & Confirm button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <button
                        onClick={handleNext}
                        disabled={!canProceedToStep2}
                        className="h-[38px] w-full rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        Review &amp; Confirm
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
            /* Dialog variant */
            <div className="flex flex-col flex-1 overflow-hidden">
              {currencyMismatch && (
                <p className="text-[#d92b2b] text-[13px] mb-3">
                  Selected members have different currencies. All members in a transaction must share the same currency.
                </p>
              )}
              {dialogMemberTable}
              <div className="flex items-center justify-between pt-5 shrink-0">
                <div className="flex items-center gap-[10px]">
                  <button onClick={handleSelectAll} className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors">
                    Select All
                  </button>
                  <button onClick={handleInvertSelection} className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors">
                    Invert Selection
                  </button>
                  {currencyMismatch ? (
                    <span className="text-[13px] text-[#d92b2b]">Currency mismatch</span>
                  ) : selectedMembers.size > 0 && derivedCurrency ? (
                    <span className="text-[13px] text-[#606067]">{selectedMembers.size} members · {totalAmount} {derivedCurrency}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-[10px]">
                  <button onClick={onCancel} className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors">
                    Cancel
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          onClick={handleNext}
                          disabled={selectedMembers.size === 0 || currencyMismatch}
                          className="h-[38px] px-4 rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </span>
                    </TooltipTrigger>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Step 2 ─────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <>
          {variant === 'page' ? (
            <div className="flex gap-[26px] flex-1 min-h-0">
              {/* Left: preview content */}
              <div className="bg-white rounded-[32px] p-[20px] flex-1 flex flex-col gap-[16px] overflow-y-auto min-w-0">
                {/* Transaction Preview */}
                <div className="border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden shrink-0">
                  <div className="bg-[#f5f5f5] px-4 py-[7px]">
                    <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Transaction Preview</span>
                  </div>
                  <div className="flex flex-col gap-[13px] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#8d8d93]">Transaction Name</span>
                      <span className="text-[14px] text-[#1c1c26]">{transactionName || '-'}</span>
                    </div>
                    {derivedCaipChainId && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8d8d93]">Network</span>
                        <span className="text-[14px] text-[#1c1c26]">{getChainName(derivedCaipChainId)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#8d8d93]">Members</span>
                      <span className="text-[14px] text-[#1c1c26]">{selectedMembers.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#8d8d93]">Payout</span>
                      <span className="text-[14px] text-[#1c1c26]">{totalAmount} {derivedCurrency || 'USDC'}</span>
                    </div>
                    {feePreview && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8d8d93]">Service Fee</span>
                        <span className="text-[14px] text-[#1c1c26]">{feePreview.discountedFee} {payrollTokenSymbol || 'USDC'}</span>
                      </div>
                    )}
                    {feePreview?.gasFeeEstimate?.total?.costNative && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8d8d93]">Est. gas</span>
                        <span className="text-[14px] text-[#1c1c26]">
                          {feePreview.gasFeeEstimate.total.costNative} {feePreview.gasFeeEstimate.nativeSymbol || ''}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#1c1c26]">Total from wallet</span>
                      <span className="text-[14px] font-bold text-[#1c1c26]">
                        {feePreview ? totalAmount + feePreview.discountedFee : totalAmount} {derivedCurrency || 'USDC'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Claim Time */}
                <div className="border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden shrink-0">
                  <div className="bg-[#f5f5f5] px-4 py-[7px]">
                    <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Claim Time</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <span className="text-[13px] text-[#1c1c26]">Members can claim from</span>
                      <div className="flex flex-col items-end gap-[2px]">
                        <span className="text-[14px] font-bold text-[#1c1c26]">
                          {executionDate} ({offsetToLabel(selectedTimezoneData.offset)})
                        </span>
                        {claimTimePassed && (
                          <span className="text-[12px] text-[#5ddd22]">
                            This time has passed — members can claim immediately after you execute
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipients */}
                <div className="border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden flex flex-col min-h-0">
                  <div className="bg-[#f5f5f5] px-4 py-[7px] shrink-0">
                    <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Recipients</span>
                  </div>
                  <div className="flex flex-col gap-[16px] p-4 overflow-y-auto">
                    {memberDetailsForPreview.map(item => {
                      const originalAmount = organizationMembers.find(m => m.memberId === item.member?.memberId)?.payoutIntent?.amount
                      const newAmount = parseFloat(String(item.amount)) || 0
                      const hasChanged = isCreatingFromReaction && originalAmount !== undefined && parseFloat(originalAmount) !== newAmount
                      return (
                        <div key={item.id ?? item.member.memberId} className="flex items-center justify-between">
                          <div className="flex items-center gap-[8px]">
                            <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee] overflow-hidden">
                              {item.member?.avatarUrl
                                ? <img src={item.member.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : (item.member?.showName || '?')[0].toUpperCase()}
                            </div>
                            <span className="text-[13px] text-[#1c1c26]  truncate">{item.member?.showName ?? ''}</span>
                            {item.member?.memberId === currentMember?.memberId && <span className="shrink-0">🌟</span>}
                            {item.member?.remark && (
                              <span className="max-w-[80px] truncate text-[11px] text-[#8d8d93]" title={item.member.remark}>
                                ({item.member.remark})
                              </span>
                            )}
                            <span className="text-[13px] text-[#1c1c26] w-[200px] truncate">
                              {item.member?.metaPub ? truncateAddress(item.member.metaPub) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-[4px]">
                            {hasChanged && (
                              <span className="text-[13px] text-[#bbbbbe] line-through">
                                {parseFloat(originalAmount!).toLocaleString()}
                              </span>
                            )}
                            <span className="text-[14px] text-[#1c1c26]">
                              {newAmount.toLocaleString()} {derivedCurrency}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right: what happens panel */}
              <div className="bg-white rounded-[32px] p-[20px] w-[320px] shrink-0 flex flex-col justify-between">
                <div className="flex flex-col gap-[10px]">
                  <p className="text-[16px] text-[#1c1c26]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    What happens after you sign
                  </p>
                  <div className="flex flex-col gap-[14px]">
                    <div className="bg-[#f5f5f5] rounded-[18px] p-[18px] flex flex-col gap-[10px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="bg-white rounded-[8px] flex items-center justify-center w-[30px] h-[30px] shrink-0">
                          <img src={imgTimeForward} alt="" className="w-[17px] h-[17px]" />
                        </div>
                        <span className="text-[13px] font-semibold text-[#1c1c26]">If you execute before claim time</span>
                      </div>
                      <p className="text-[12px] text-[#606067] leading-[20px]">
                        Funds enter the contract and are locked until the claim time. Members will be notified and can claim when the time arrives.
                      </p>
                    </div>
                    <div className="bg-[#f5f5f5] rounded-[18px] p-[18px] flex flex-col gap-[10px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="bg-white rounded-[8px] flex items-center justify-center w-[30px] h-[30px] shrink-0">
                          <img src={imgTimePast} alt="" className="w-[17px] h-[17px]" />
                        </div>
                        <span className="text-[13px] font-semibold text-[#1c1c26]">If you execute after claim time</span>
                      </div>
                      <p className="text-[12px] text-[#606067] leading-[20px]">
                        Funds are released immediately. Members can claim as soon as the transaction is confirmed on-chain.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Back + Sign & confirm */}
                <div className="flex items-center gap-[10px]">
                  <button
                    onClick={handlePrevious}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors shrink-0"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateTransaction}
                    className="h-[38px] flex-1 rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Dialog variant step 2 */
            <div className="flex flex-col flex-1 overflow-hidden bg-white rounded-[32px] p-[22px]">
              <div className="flex flex-1 gap-[20px] overflow-hidden min-h-0">
                <div className="flex flex-col flex-1 gap-[28px] overflow-y-auto min-w-0">
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
                  <div className="flex flex-col gap-[7px]">
                    <span className="text-[13px] font-semibold text-[#1c1c26] leading-[22px]">Execution Date</span>
                    <div className="flex items-center gap-[8px]">
                      {/* Date picker */}
                      <div className="flex-1">
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
                      {/* Timezone selector */}
                      <div className="flex-1 flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-4 h-[46px] gap-2">
                        <select
                          value={selectedTimezone}
                          onChange={e => setSelectedTimezone(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent border-0 text-[13px] text-[#1c1c26] outline-none appearance-none cursor-pointer truncate"
                        >
                          {timezoneOptions.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label.en}</option>
                          ))}
                        </select>
                        <IconCalendar size={18} className="text-[#bbbbbe] shrink-0" />
                      </div>
                    </div>
                  </div>
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
                        <span className="text-[13px] text-[#1c1c26] leading-[22px]">{executionDate ? `${executionDate} ${offsetToLabel(selectedTimezoneData.offset)}` : '-'}</span>
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
                        <div key={item.id ?? item.member.memberId} className="flex items-center justify-between">
                          <div className="flex items-center gap-[6px]">
                            <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee] overflow-hidden">
                              {item.member?.avatarUrl
                                ? <img src={item.member.avatarUrl} alt="" className="w-full h-full object-cover" />
                                : (item.member?.showName || '?')[0].toUpperCase()}
                            </div>
                            <span className="text-[13px] text-[#1c1c26] leading-[22px] truncate">{item.member?.showName ?? ''}</span>
                            {item.member?.memberId === currentMember?.memberId && <span className="shrink-0">🌟</span>}
                            {(item.member as any)?.remark && (
                              <span className="max-w-[100px] truncate text-[11px] text-[#8d8d93]" title={(item.member as any).remark}>
                                ({(item.member as any).remark})
                              </span>
                            )}
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
              <div className="flex items-center justify-between pt-5 shrink-0">
                <button
                  onClick={onCancel}
                  className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-[10px]">
                  <button
                    onClick={handlePrevious}
                    className="h-[38px] px-4 rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[13px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                  >
                    Previous
                  </button>
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
        </>
      )}
    </div>
  )
}
