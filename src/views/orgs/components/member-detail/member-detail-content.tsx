import apis from '@/apis'
import { AssetChain } from '@/apis/orgnization.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { MemberRole, canManageMember } from '@/utils/permissions'
import { useEffect, useState } from 'react'
import { DrawerChanges, Member } from './types'

interface MemberDetailContentProps {
  selectedMember: Member
  currentUserRole: MemberRole[]
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
        if (!selectedMember.network) {
          toast({
            title: 'Error',
            description: 'Network does not exist, modification is not allowed',
            variant: 'destructive'
          })
          return
        }
        const currency = drawerChanges.currency || selectedMember.currency || ''
        const serviceFee = drawerChanges.serviceFee || selectedMember.serviceFee || 0
        await apis.organization.updateMemberPayoutIntent(
          selectedMember.memberId,
          serviceFee.toString(),
          getChainIdByCurrency(currency),
          currency
        )
      }

      // 构建更新后的成员数据
      const updatedMember: Member = {
        ...selectedMember,
        name: drawerChanges.name ?? selectedMember.name,
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
      <div className="flex justify-end px-4 pt-4">
        {/* <Button variant="ghost" size="icon" onClick={onDrawerClose}>
        </Button> */}
      </div>

      <div className="space-y-6 px-4 pb-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        {/* Basic Information */}
        <div>
          <h3 className="text-muted-foreground mb-4 text-xs uppercase font-medium">BASIC INFORMATION</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <Input
                value={drawerChanges.name !== undefined ? drawerChanges.name : selectedMember.name}
                onChange={e =>
                  setDrawerChanges({
                    ...drawerChanges,
                    name: e.target.value
                  })
                }
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
                  {selectedMember.roles && selectedMember.roles.length > 0 ? (
                    selectedMember.roles.map(role => (
                      <Badge key={role} variant="secondary" className="bg-black text-white hover:bg-black/80">{role}</Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="bg-black text-white hover:bg-black/80">{selectedMember.role}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Status</span>
                <Badge variant="default" className="bg-black text-white hover:bg-black/80">{selectedMember.status}</Badge>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="mt-1 text-sm font-medium">{selectedMember.email}</p>
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
            <div>
              <Label className="text-muted-foreground text-xs">Network</Label>
              <p className="mt-1 text-sm">
                {getAssetNameByCurrency(drawerChanges.currency || selectedMember.currency || '')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Join Date</Label>
              <p className="mt-1 text-sm">{selectedMember.joinDate}</p>
            </div>
          </div>
        </div>

        <Separator />

        {selectedMember.status === 'Active' &&
          canManageMember(currentUserRole, selectedMember.roles || [selectedMember.role]) && (
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
