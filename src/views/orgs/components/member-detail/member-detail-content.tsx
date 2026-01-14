import { AssetChain } from '@/apis/orgnization.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { DrawerChanges, Member, MemberRole } from './types'

interface MemberDetailContentProps {
  selectedMember: Member
  drawerChanges: DrawerChanges
  assetsChains: AssetChain[]
  currentUserRole: MemberRole
  hasUnsavedChanges: boolean
  onDrawerChanges: (changes: DrawerChanges) => void
  onGetAssetNameByCurrency: (currency: string) => string
  onSaveChanges: () => void
  onRemoveMember: (member: Member) => void
}

export function MemberDetailContent({
  selectedMember,
  drawerChanges,
  assetsChains,
  currentUserRole,
  hasUnsavedChanges,
  onDrawerChanges,
  onGetAssetNameByCurrency,
  onSaveChanges,
  onRemoveMember
}: MemberDetailContentProps) {
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
                  onDrawerChanges({
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
                  onDrawerChanges({
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
                  onDrawerChanges({
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
                  <Select
                    value={drawerChanges.role || selectedMember.role}
                    onValueChange={(value: string) =>
                      onDrawerChanges({ ...drawerChanges, role: value as MemberRole })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      {drawerChanges.role || selectedMember.role}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            <div>
              <Label className="text-muted-foreground text-xs">Network</Label>
              <p className="mt-1">
                {onGetAssetNameByCurrency(drawerChanges.currency || selectedMember.currency || '')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Badge className="mt-1">{selectedMember.status}</Badge>
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
      </div>

      <DrawerFooter>
        <Button onClick={onSaveChanges} disabled={!hasUnsavedChanges} className="w-full">
          Confirm Changes
        </Button>
      </DrawerFooter>
    </>
  )
}
