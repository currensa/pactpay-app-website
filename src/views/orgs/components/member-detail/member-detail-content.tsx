import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { canManageMember, getAssignableRoles, getMemberRoles, MemberRole, Permission, useHasPermission } from '@/utils/permissions'
import { StatusBadge } from '@/views/orgs/components/status-badge'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackendRole, DrawerChanges } from './types'
import { formatActivityDescription, formatActivityTime } from '@/utils/activity'

interface MemberDetailContentProps {
  selectedMember: OrganizationMember
  /** Token symbol from org payroll config, e.g. "USDT". Null when config not yet loaded. */
  payrollTokenSymbol: string | null
  onDrawerClose: () => void
  onRemoveMember: (member: OrganizationMember) => void
  onSaveSuccess?: (updatedMember: OrganizationMember) => void
}

/**
 * Backend role constraints:
 *   - Owner cannot be set/removed via this interface
 *   - Non-Owner members MUST include Member
 *   - Admin and Operator are mutually exclusive
 * Valid combinations exposed to UI: Member | Admin+Member | Operator+Member
 */
type RoleOption = 'Member' | 'Admin' | 'Operator'

const ROLE_OPTIONS: { value: RoleOption; label: string; description: string }[] = [
  { value: 'Member', label: 'Member', description: 'View payroll details and submit claims' },
  { value: 'Operator', label: 'Operator', description: 'Create transactions and manage members' },
  { value: 'Admin', label: 'Admin', description: 'Full management except Owner operations' },
]

function getEffectiveRoleOption(roles: string[]): RoleOption {
  if (roles.includes('Admin')) return 'Admin'
  if (roles.includes('Operator')) return 'Operator'
  return 'Member'
}

function roleOptionToBackendRoles(option: RoleOption): BackendRole[] {
  if (option === 'Admin') return ['Admin', 'Member']
  if (option === 'Operator') return ['Operator', 'Member']
  return ['Member']
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#8d8d93] text-[13px] leading-[22px]">{label}</span>
      <span className="text-[#1c1c26] text-[14px] leading-[24px]">{value}</span>
    </div>
  )
}

export function MemberDetailContent({
  selectedMember,
  payrollTokenSymbol,
  onDrawerClose,
  onRemoveMember,
  onSaveSuccess,
}: MemberDetailContentProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const hasPermission = useHasPermission()
  const [drawerChanges, setDrawerChanges] = useState<DrawerChanges>({})
  const [editingFee, setEditingFee] = useState(false)
  const feeInputRef = useRef<HTMLInputElement>(null)
  const [paymentStats, setPaymentStats] = useState<{ tokenAddress: string; caipChainId: string; totalReceived: string; paymentCount: number; lastPayment: string | null }[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotal, setActivityTotal] = useState(0)
  const activityPageSize = 10
  const { getTokenSymbol, getTokenDecimals, fetchChainAssets } = useChainAssetStore()

  const hasUnsavedChanges = Object.keys(drawerChanges).length > 0

  useEffect(() => {
    setDrawerChanges({})
    setEditingFee(false)
    setPaymentStats([])
    setActivityLogs([])
    setActivityPage(1)
    setActivityTotal(0)
    Promise.all([
      fetchChainAssets(),
      apis.transaction.getMemberPaymentStatistics(selectedMember.memberId),
      apis.organization.getMemberActivityLogs(selectedMember.memberId, { page: 1, pageSize: activityPageSize }),
    ]).then(([, statsRes, logsRes]) => {
      setPaymentStats(statsRes.statistics)
      setActivityLogs(logsRes.data)
      setActivityTotal(logsRes.total)
    }).catch(() => { })
  }, [selectedMember.memberId])

  const handleLoadMoreActivity = async () => {
    const nextPage = activityPage + 1
    try {
      const res = await apis.organization.getMemberActivityLogs(selectedMember.memberId, {
        page: nextPage,
        pageSize: activityPageSize,
      })
      setActivityLogs(prev => [...prev, ...res.data])
      setActivityPage(nextPage)
    } catch { }
  }

  useEffect(() => {
    if (editingFee) feeInputRef.current?.focus()
  }, [editingFee])

  const currentMember = useOrganizationStore(s => s.currentMember)
  const currentUserRole = getMemberRoles(currentMember)
  const memberRoles = selectedMember.roles?.map(r => r.role) ?? []
  const targetIsOwner = memberRoles.includes('Owner' as MemberRole)
  const canEditRoles = hasPermission(Permission.SET_OPERATOR) && canManageMember(currentUserRole, memberRoles)
  const canRemove = selectedMember.status === 'active' && hasPermission(Permission.REMOVE_MEMBER) && canManageMember(currentUserRole, memberRoles)
  const visibleRoleOptions = ROLE_OPTIONS.filter(opt =>
    getAssignableRoles(currentUserRole).includes(opt.value as MemberRole)
  )

  const currentRoleOption = drawerChanges.roles
    ? getEffectiveRoleOption(drawerChanges.roles)
    : getEffectiveRoleOption(memberRoles)

  const currentFeeValue =
    drawerChanges.amount !== undefined
      ? drawerChanges.amount
      : (selectedMember.payoutIntent?.amount ?? '')

  const feeDisplay = currentFeeValue
    ? payrollTokenSymbol
      ? `${currentFeeValue} ${payrollTokenSymbol}`
      : currentFeeValue
    : '-'

  const joinDate = selectedMember.createdAt
    ? new Date(selectedMember.createdAt).toISOString().split('T')[0].replace(/-/g, '/')
    : '—'

  const handleRoleChange = (option: RoleOption) => {
    setDrawerChanges({ ...drawerChanges, roles: roleOptionToBackendRoles(option) })
  }

  const handleSaveChanges = async () => {
    try {
      if (drawerChanges.amount !== undefined) {
        await apis.organization.updateMemberPayoutIntent(selectedMember.memberId, {
          amount: drawerChanges.amount,
        })
      }

      if (drawerChanges.roles !== undefined) {
        await apis.organization.updateMemberRoles(selectedMember.memberId, drawerChanges.roles)
      }

      const updatedMember: OrganizationMember = {
        ...selectedMember,
        payoutIntent:
          drawerChanges.amount !== undefined
            ? { ...selectedMember.payoutIntent, amount: drawerChanges.amount }
            : selectedMember.payoutIntent,
        roles: drawerChanges.roles
          ? drawerChanges.roles.map(role => ({ id: '', role: role as BackendRole, createdAt: '' }))
          : selectedMember.roles,
      }

      toast({ title: 'Success', description: 'Member information updated successfully!' })
      setDrawerChanges({})
      onSaveSuccess?.(updatedMember)
      onDrawerClose()
    } catch (error: any) {
      if (error?.response?.status === 404 && error?.response?.data?.message?.includes('payroll')) {
        toast({
          title: 'Payroll not configured',
          description: error.response.data.message,
          variant: 'destructive',
        })
        setTimeout(() => navigate('/orgs/settings'), 1500)
        return
      }
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update member information',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="relative flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-[6px]">
          <span className="font-bold text-[#1c1c26] text-[15px] leading-6 whitespace-nowrap">
            {selectedMember.showName}
          </span>
          <StatusBadge className="ml-[8px]" status={selectedMember.status} />
        </div>
        {/* bottom separator */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[#f0f0f0]" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8">
        {/* Basic Information */}
        <div className="flex flex-col gap-4">
          <p className="font-bold text-[#1c1c26] text-[14px] leading-6">Basic Information</p>

          <div className="flex flex-col gap-[14px]">
            {/* Email — read-only */}
            <InfoRow label="Email" value={selectedMember.email || '-'} />

            {/* Service Fee — editable */}
            <div className="flex items-center justify-between">
              <span className="text-[#8d8d93] text-[13px] leading-[22px]">
                Service Fee{payrollTokenSymbol ? ` (${payrollTokenSymbol})` : ''}
              </span>
              {editingFee ? (
                <Input
                  ref={feeInputRef}
                  type="text"
                  inputMode="numeric"
                  value={drawerChanges.amount !== undefined ? drawerChanges.amount : (selectedMember.payoutIntent?.amount ?? '')}
                  onChange={e => setDrawerChanges({ ...drawerChanges, amount: e.target.value })}
                  onBlur={() => setEditingFee(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditingFee(false)}
                  className="h-7 w-36 text-right text-sm"
                />
              ) : (
                <button
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                  onClick={() => setEditingFee(true)}
                >
                  <span className="text-[#5e85ee] text-[14px] leading-[24px]">{feeDisplay}</span>
                  <Pencil size={14} className="text-[#5e85ee]" />
                </button>
              )}
            </div>

            {/* Role — editable dropdown (只展示当前用户权限范围内可分配的角色) */}
            <div className="flex items-center justify-between">
              <span className="text-[#8d8d93] text-[13px] leading-[22px]">Role</span>
              {targetIsOwner ? (
                <span className="text-[#1c1c26] text-[14px] leading-[24px]">Owner</span>
              ) : canEditRoles ? (
                <Select
                  value={currentRoleOption}
                  onValueChange={v => handleRoleChange(v as RoleOption)}
                >
                  <SelectTrigger className="border-0 shadow-none bg-transparent p-0 h-auto gap-1 text-[#5e85ee] text-[14px] font-normal focus:ring-0 hover:opacity-70 w-auto [&>svg]:hidden transition-opacity">
                    <SelectValue />
                    <ChevronDown size={14} className="text-[#5e85ee]" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleRoleOptions.map(opt => (
                      <SelectPrimitive.Item
                        key={opt.value}
                        value={opt.value}
                        className="relative flex w-full cursor-default select-none flex-col rounded-sm px-3 py-2 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <SelectPrimitive.ItemText>
                          <span className="text-sm font-medium">{opt.label}</span>
                        </SelectPrimitive.ItemText>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-[#1c1c26] text-[14px] leading-[24px]">{currentRoleOption}</span>
              )}
            </div>

            {/* Join Date — read-only */}
            <InfoRow label="Join Date" value={joinDate} />
          </div>
        </div>

        {/* Payment Statistics — 按 caipChainId+tokenAddress 聚合后展示 */}
        {paymentStats.length > 0 && (() => {
          // 聚合：相同 token 累加 totalReceived / paymentCount，lastPayment 取最新
          const aggregated = Object.values(
            paymentStats.reduce<Record<string, { caipChainId: string; tokenAddress: string; totalReceived: bigint; paymentCount: number; lastPayment: string | null }>>(
              (acc, stat) => {
                const key = `${stat.caipChainId}::${stat.tokenAddress.toLowerCase()}`
                if (acc[key]) {
                  acc[key].totalReceived += BigInt(stat.totalReceived)
                  acc[key].paymentCount += stat.paymentCount
                  const a = acc[key].lastPayment, b = stat.lastPayment
                  acc[key].lastPayment = !a ? b : !b ? a : a > b ? a : b
                } else {
                  acc[key] = { caipChainId: stat.caipChainId, tokenAddress: stat.tokenAddress, totalReceived: BigInt(stat.totalReceived), paymentCount: stat.paymentCount, lastPayment: stat.lastPayment }
                }
                return acc
              }, {}
            )
          )
          const multiToken = aggregated.length > 1
          return (
            <div className="flex flex-col gap-4">
              <p className="font-bold text-[#1c1c26] text-[14px] leading-6">Payment Statistics</p>
              <div className="flex flex-col gap-[14px]">
                {aggregated.map((stat, i) => {
                  const symbol = getTokenSymbol(stat.caipChainId, stat.tokenAddress) ?? stat.tokenAddress.slice(0, 6) + '…'
                  const decimals = getTokenDecimals(stat.caipChainId, stat.tokenAddress)
                  const total = (Number(stat.totalReceived) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 6 })
                  const lastDate = stat.lastPayment ? new Date(stat.lastPayment).toISOString().split('T')[0] : '-'
                  return (
                    <div key={i} className={multiToken ? 'flex flex-col gap-[10px] pb-[10px] border-b border-[rgba(0,0,0,0.06)] last:border-0 last:pb-0' : 'flex flex-col gap-[10px]'}>
                      {multiToken && (
                        <span className="text-[#606067] text-[12px] font-medium">{symbol}</span>
                      )}
                      <InfoRow label="Total Received" value={`${total} ${symbol}`} />
                      <InfoRow label="Payment Count" value={`${stat.paymentCount}`} />
                      <InfoRow label="Last Payment" value={lastDate} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
        {/* Activity Log */}
        {activityLogs.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="font-bold text-[#1c1c26] text-[14px] leading-6">Activity Log</p>
            <div className="flex flex-col gap-4">
              {activityLogs.map(log => (
                <div key={log.id} className="flex flex-col gap-[2px]">
                  <span className="text-[#8d8d93] text-[14px] leading-[22px]">
                    {formatActivityTime(log.createdAt)}
                  </span>
                  <span className="text-[#1c1c26] text-[16px] leading-[24px]">
                    {formatActivityDescription(log)}
                  </span>
                </div>
              ))}
            </div>
            {activityLogs.length < activityTotal && (
              <button
                className="text-[#5e85ee] text-[13px] leading-[22px] hover:opacity-70 transition-opacity text-left"
                onClick={handleLoadMoreActivity}
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 pb-6 pt-4 shrink-0">
        <Button
          variant="outline"
          className="flex-1 text-[#d92b2b] border border-[rgba(0,0,0,0.12)] rounded-[12px] py-[9px] h-auto text-[13px] leading-[22px] font-normal bg-transparent hover:bg-transparent hover:text-[#d92b2b] hover:border-[rgba(0,0,0,0.2)] disabled:opacity-25 disabled:cursor-not-allowed"
          disabled={!canRemove}
          onClick={() => onRemoveMember(selectedMember)}
        >
          Remove Member
        </Button>
        <Button
          className="flex-1 bg-[#5e85ee] rounded-[12px] py-[9px] h-auto text-[13px] leading-[22px] font-normal text-white hover:bg-[#5e85ee] disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
          disabled={!hasUnsavedChanges}
          onClick={handleSaveChanges}
        >
          Confirm Changes
        </Button>
      </div>
    </div>
  )
}
