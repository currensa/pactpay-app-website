import apis from '@/apis'
import { AssetChain } from '@/apis/orgnization.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { IconCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { DrawerChanges, Member, MemberRole } from './types'

interface MemberDetailContentProps {
  selectedMember: Member
  currentUserRole: MemberRole
  onDrawerClose: () => void
  onRemoveMember: (member: Member) => void
  onSaveSuccess?: (updatedMember: Member) => void
}

export function MemberDetailContent({
  selectedMember,
  currentUserRole,
  onDrawerClose,
  onRemoveMember,
  onSaveSuccess
}: MemberDetailContentProps) {
  const { toast } = useToast()

  // 内部状态管理
  const [drawerChanges, setDrawerChanges] = useState<DrawerChanges>({})
  const [assetsChains, setAssetsChains] = useState<AssetChain[]>([])

  // MemberRole 枚举值
  const memberRoles: MemberRole[] = ['Admin', 'Operator', 'Member']

  // 计算是否有未保存的修改
  const hasUnsavedChanges = Object.keys(drawerChanges).length > 0

  // 根据货币符号获取对应的链ID
  const getChainIdByCurrency = (currency: string): string => {
    const assetChain = assetsChains.find(ac => ac.asset.symbol === currency)
    return assetChain?.chain.chainId || ''
  }

  // 根据货币符号获取对应的资产名称
  const getAssetNameByCurrency = (currency: string): string => {
    const assetChain = assetsChains.find(ac => ac.asset.symbol === currency)
    return assetChain?.chain.name || ''
  }

  // 获取资产链信息
  useEffect(() => {
    const fetchAssetsChains = async () => {
      try {
        const data = await apis.organization.getAssetsChains()
        setAssetsChains(data)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error?.response?.data?.message || 'Failed to load assets chains',
          variant: 'destructive'
        })
      }
    }
    fetchAssetsChains()
  }, [])

  // 当 selectedMember 变化时重置 drawerChanges
  useEffect(() => {
    setDrawerChanges({})
  }, [selectedMember.id])

  // 处理角色选择变化
  const handleRoleChange = (role: MemberRole, checked: boolean) => {
    const currentRoles = drawerChanges.roles || selectedMember.roles || (selectedMember.role ? [selectedMember.role] : [])
    let newRoles: MemberRole[]
    if (checked) {
      newRoles = [...currentRoles, role]
    } else {
      newRoles = currentRoles.filter((r) => r !== role)
    }
    setDrawerChanges({ ...drawerChanges, roles: newRoles })
  }

  // 渲染角色选择项
  const renderRoleCheckbox = (role: MemberRole) => {
    const currentRoles = drawerChanges.roles || selectedMember.roles || (selectedMember.role ? [selectedMember.role] : [])
    const isChecked = currentRoles.includes(role)
    return (
      <label
        key={role}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent',
          isChecked && 'bg-accent'
        )}
      >
        <div
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded border-2',
            isChecked ? 'border-primary bg-primary' : 'border-input'
          )}
        >
          {isChecked && <IconCheck className="h-3 w-3 text-primary-foreground" />}
        </div>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleRoleChange(role, e.target.checked)}
          className="sr-only"
        />
        <span>{role}</span>
      </label>
    )
  }

  // 保存 Drawer 修改
  const handleSaveChanges = async () => {
    if (!selectedMember) return

    try {
      // 更新收款账户地址
      if (drawerChanges.receivingWallet !== undefined) {
        await apis.organization.updateMemberAccountAddress(selectedMember.memberId, drawerChanges.receivingWallet)
      }

      // 更新支付意向（Service Fee）
      if (drawerChanges.serviceFee !== undefined || drawerChanges.currency !== undefined) {
        const currency = drawerChanges.currency || selectedMember.currency || ''
        const serviceFee = drawerChanges.serviceFee || selectedMember.serviceFee || 0
        await apis.organization.updateMemberPayoutIntent(
          selectedMember.memberId,
          serviceFee.toString(),
          getChainIdByCurrency(currency),
          currency
        )
      }

      // 更新成员角色
      if (drawerChanges.roles !== undefined && drawerChanges.roles.length > 0) {
        await apis.organization.updateMemberRoles(selectedMember.memberId, drawerChanges.roles)
      }

      // 构建更新后的成员数据
      const updatedMember: Member = {
        ...selectedMember,
        receivingWallet: drawerChanges.receivingWallet ?? selectedMember.receivingWallet,
        serviceFee: drawerChanges.serviceFee ?? selectedMember.serviceFee,
        currency: drawerChanges.currency ?? selectedMember.currency,
        roles: drawerChanges.roles ?? selectedMember.roles,
        role: drawerChanges.roles && drawerChanges.roles.length > 0
          ? drawerChanges.roles[0]
          : (drawerChanges.role ?? selectedMember.role)
      }

      toast({
        title: 'Success',
        description: 'Member information updated successfully!'
      })

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
      <DrawerHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
              <span className="text-lg font-medium">{selectedMember.name[0].toUpperCase()}</span>
            </div>
            <div>
              <DrawerTitle>{selectedMember.name}</DrawerTitle>
              <Badge className="mt-1">{selectedMember.role}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs mr-2">Status</Label>
            <Badge className="mt-1">{selectedMember.status}</Badge>
          </div>
        </div>
      </DrawerHeader>

      <div className="space-y-6 px-4 pb-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Information */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-xs uppercase">BASIC INFORMATION</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="mt-1">{selectedMember.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Receiving Wallet Address</Label>
              <Input
                value={
                  drawerChanges.receivingWallet !== undefined
                    ? drawerChanges.receivingWallet
                    : selectedMember.receivingWallet || ''
                }
                onChange={e =>
                  setDrawerChanges({
                    ...drawerChanges,
                    receivingWallet: e.target.value
                  })
                }
                placeholder="0x..."
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Service Fee</Label>
              <Input
                type="number"
                value={
                  drawerChanges.serviceFee !== undefined
                    ? drawerChanges.serviceFee
                    : selectedMember.serviceFee
                }
                onChange={e =>
                  setDrawerChanges({
                    ...drawerChanges,
                    serviceFee: parseFloat(e.target.value) || 0
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Currency</Label>
              <Select
                value={
                  drawerChanges.currency !== undefined
                    ? drawerChanges.currency
                    : selectedMember.currency || ''
                }
                onValueChange={(value: string) =>
                  setDrawerChanges({
                    ...drawerChanges,
                    currency: value
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {assetsChains.map((assetChain) => (
                    <SelectItem key={assetChain.asset.id} value={assetChain.asset.symbol}>
                      <div className="flex items-center gap-2">
                        <img
                          src={assetChain.asset.iconUrl}
                          alt={assetChain.asset.symbol}
                          className="w-4 h-4"
                        />
                        {assetChain.asset.symbol} - {assetChain.asset.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMember.status === 'Active' &&
              selectedMember.role !== 'Admin' &&
              currentUserRole === 'Admin' && (
                <div>
                  <Label className="text-muted-foreground text-xs">Role</Label>
                  <div className="mt-1 space-y-2 rounded-md border border-input bg-background p-2">
                    {memberRoles.map(renderRoleCheckbox)}
                  </div>
                </div>
              )}
            <div>
              <Label className="text-muted-foreground text-xs">Network</Label>
              <p className="mt-1">
                {getAssetNameByCurrency(drawerChanges.currency || selectedMember.currency || '')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Join Date</Label>
              <p className="mt-1">{selectedMember.joinDate}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Statistics */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-xs uppercase">PAYMENT STATISTICS</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Total Received</span>
              <span className="font-medium">$25,000 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Last Payment Date</span>
              <span className="font-medium">{selectedMember.lastPayment || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Payment Count</span>
              <span className="font-medium">5 payments</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Activity Log */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-xs uppercase">ACTIVITY LOG</h3>
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground text-xs">2024-01-15 10:30</p>
              <p className="text-sm">Received payment: 5000 USDC</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">2024-01-01 09:00</p>
              <p className="text-sm">Joined organization</p>
            </div>
          </div>
        </div>
        {selectedMember.status === 'Active' &&
          selectedMember.role !== 'Admin' &&
          (currentUserRole === 'Admin' ||
            (currentUserRole === 'Operator' && selectedMember.role === 'Member')) && (
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
