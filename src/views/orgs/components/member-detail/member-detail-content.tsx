import apis from '@/apis'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { canManageMember, MemberRole } from '@/utils/permissions'
import { useEffect, useState } from 'react'
import { BackendRole, DrawerChanges, Member } from './types'

interface MemberDetailContentProps {
  selectedMember: Member
  currentUserRole: MemberRole[]
  /** Token symbol from org payroll config, e.g. "USDT". Null when config not yet loaded. */
  payrollTokenSymbol: string | null
  onDrawerClose: () => void
  onRemoveMember: (member: Member) => void
  onSaveSuccess?: (updatedMember: Member) => void
}

/**
 * Backend role constraints:
 *   - Owner cannot be set/removed via this interface
 *   - Non-Owner members MUST include Employee
 *   - Admin and Operator are mutually exclusive
 * Valid combinations exposed to UI: Employee | Admin+Employee | Operator+Employee
 */
type RoleOption = 'Employee' | 'Admin' | 'Operator'

const ROLE_OPTIONS: { value: RoleOption; label: string; description: string }[] = [
  { value: 'Employee', label: 'Employee', description: 'View payroll details and submit claims' },
  { value: 'Operator', label: 'Operator', description: 'Create transactions and manage members' },
  { value: 'Admin', label: 'Admin', description: 'Full management except Owner operations' },
]

/** Derive the single "additional" role to show in the selector */
function getEffectiveRoleOption(roles: string[]): RoleOption {
  if (roles.includes('Admin')) return 'Admin'
  if (roles.includes('Operator')) return 'Operator'
  return 'Employee'
}

/** Convert a role option back to the full roles array the backend expects */
function roleOptionToBackendRoles(option: RoleOption): BackendRole[] {
  if (option === 'Admin') return ['Admin', 'Employee']
  if (option === 'Operator') return ['Operator', 'Employee']
  return ['Employee']
}

export function MemberDetailContent({
  selectedMember,
  currentUserRole,
  payrollTokenSymbol,
  onDrawerClose,
  onRemoveMember,
  onSaveSuccess
}: MemberDetailContentProps) {
  const { toast } = useToast()
  const [drawerChanges, setDrawerChanges] = useState<DrawerChanges>({})

  const hasUnsavedChanges = Object.keys(drawerChanges).length > 0

  useEffect(() => {
    setDrawerChanges({})
  }, [selectedMember.id])

  const memberRoles = selectedMember.roles ?? [selectedMember.role]
  const isOwner = memberRoles.includes('Owner' as MemberRole)

  const canEditRoles =
    !isOwner &&
    canManageMember(currentUserRole, memberRoles)

  const currentRoleOption = drawerChanges.roles
    ? getEffectiveRoleOption(drawerChanges.roles)
    : getEffectiveRoleOption(memberRoles)

  const handleRoleChange = (option: RoleOption) => {
    setDrawerChanges({ ...drawerChanges, roles: roleOptionToBackendRoles(option) })
  }

  const handleSaveChanges = async () => {
    if (!selectedMember) return
    try {
      if (drawerChanges.amount !== undefined) {
        await apis.organization.updateMemberPayoutIntent(selectedMember.memberId, {
          amount: drawerChanges.amount,
        })
      }

      if (drawerChanges.roles !== undefined) {
        await apis.organization.updateMemberRoles(selectedMember.memberId, drawerChanges.roles)
      }

      const updatedMember: Member = {
        ...selectedMember,
        name: drawerChanges.name ?? selectedMember.name,
        serviceFee: drawerChanges.amount !== undefined
          ? parseFloat(drawerChanges.amount) || selectedMember.serviceFee
          : selectedMember.serviceFee,
        roles: (drawerChanges.roles ?? memberRoles) as MemberRole[],
        role: drawerChanges.roles
          ? getEffectiveRoleOption(drawerChanges.roles) as MemberRole
          : selectedMember.role,
      }

      toast({ title: 'Success', description: 'Member information updated successfully!' })
      setDrawerChanges({})
      onSaveSuccess?.(updatedMember)
      onDrawerClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update member information',
        variant: 'destructive'
      })
    }
  }

  return (
    <>
      <div className="space-y-6 px-4 pb-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        {/* Basic Information */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-xs uppercase font-medium">BASIC INFORMATION</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <Input
                value={drawerChanges.name !== undefined ? drawerChanges.name : selectedMember.name}
                onChange={e => setDrawerChanges({ ...drawerChanges, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-lg font-medium">
                    {(drawerChanges.name || selectedMember.name)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {memberRoles.length > 0 ? (
                    memberRoles.map(role => (
                      <Badge key={role} variant="secondary" className="bg-black text-white hover:bg-black/80">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="bg-black text-white hover:bg-black/80">
                      {selectedMember.role}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Status</span>
                <Badge variant="default" className="bg-black text-white hover:bg-black/80">
                  {selectedMember.status}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="mt-1 text-sm font-medium">{selectedMember.email || "-"}</p>
            </div>

            {/* Amount (payout intent) */}
            <div>
              <Label className="text-muted-foreground text-xs">
                Amount{payrollTokenSymbol ? ` (${payrollTokenSymbol})` : ''}
              </Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={drawerChanges.amount !== undefined
                    ? drawerChanges.amount
                    : String(selectedMember.serviceFee)}
                  onChange={e => setDrawerChanges({ ...drawerChanges, amount: e.target.value })}
                  placeholder="e.g. 1000000000"
                  className={payrollTokenSymbol ? 'pr-16' : ''}
                />
                {payrollTokenSymbol && (
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                    {payrollTokenSymbol}
                  </span>
                )}
              </div>
            </div>

            {/* Role */}
            <div>
              <Label className="text-muted-foreground text-xs">Role</Label>
              {isOwner ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Owner — cannot be changed via this interface
                </p>
              ) : canEditRoles ? (
                <Select value={currentRoleOption} onValueChange={v => handleRoleChange(v as RoleOption)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(opt => (
                      // 直接用 Radix 原语，只把 label 放入 ItemText（SelectValue 只展示此部分），
                      // description 放在 ItemText 之外，不会渲染到 trigger 里。
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
                <p className="mt-1 text-sm font-medium">{currentRoleOption}</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Join Date</Label>
              <p className="mt-1 text-sm">{selectedMember.joinDate}</p>
            </div>
          </div>
        </div>

        <Separator />

        {selectedMember.status === 'Active' &&
          canManageMember(currentUserRole, memberRoles) && (
            <div>
              <Button
                variant="link"
                className="text-destructive h-auto p-0"
                onClick={() => onRemoveMember(selectedMember)}
              >
                Remove Member
              </Button>
            </div>
          )}
      </div>

      <DrawerFooter>
        <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges} className="w-full">
          Confirm Changes
        </Button>
      </DrawerFooter>
    </>
  )
}
