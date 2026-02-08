import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { Switch } from '@/components/ui/switch'
import {
  // IconAlertTriangle,
  IconArrowRight,
  // IconBell,
  IconBulb,
  IconCopy,
  IconDiamond,
  IconUpload,
  IconUser,
  IconWallet
} from '@tabler/icons-react'

interface SettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationName: string
  displayName: string
  setDisplayName: (name: string) => void
  walletAddress: string
  formatAddress: (address: string) => string
  handleCopy: () => void
  // muteNotifications: boolean
  // setMuteNotifications: (mute: boolean) => void
  onOpenUpdateWallet: () => void
}

export function SettingsDrawer({
  open,
  onOpenChange,
  organizationName,
  displayName,
  setDisplayName,
  walletAddress,
  formatAddress,
  handleCopy,
  // muteNotifications,
  // setMuteNotifications,
  onOpenUpdateWallet
}: SettingsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex h-full w-full flex-col sm:w-[600px]">
        <DrawerHeader className="shrink-0 border-b">
          <DrawerTitle className="text-2xl">Settings for {organizationName}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* Employee Profile Section */}
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <IconUser className="text-primary h-5 w-5" />
                <h2 className="text-lg font-semibold">Employee Profile</h2>
              </div>
              <p className="text-muted-foreground text-sm">How you appear in this organization</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name in {organizationName}</Label>
                  <Input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  <p className="text-muted-foreground text-xs">
                    This name will be visible to admins and other employees in this organization only
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Organization Avatar</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {displayName
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">
                      <IconUpload className="h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    You can use different avatars for different organizations
                  </p>
                </div>
              </div>
            </div>

            {/* Receiving Preferences Section */}
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <IconWallet className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold">Receiving Preferences</h2>
              </div>
              <p className="text-muted-foreground text-sm">Manage your payment wallet for this organization</p>
              <div className="space-y-4">
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <IconBulb className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <p className="text-sm text-blue-900">
                      This is your <strong>receiving wallet</strong> for payments from this organization, separate from
                      your login wallet.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Organization Network</Label>
                  <div className="bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <IconDiamond className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm font-medium">Ethereum Mainnet</span>
                    </div>
                    <span className="text-muted-foreground text-xs">Set by organization</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current Receiving Wallet</Label>
                  <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-2">
                    <span className="flex-1 font-mono text-sm">{formatAddress(walletAddress)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                      <IconCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenUpdateWallet()
                    }}
                  >
                    Update Receiving Wallet
                    <IconArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Organization Notifications Section
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <IconBell className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Organization Notifications</h2>
              </div>
              <p className="text-muted-foreground text-sm">Control notifications from this organization</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="mute-notifications" className="cursor-pointer">
                      Mute Notifications for this Org
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Non-critical notifications from {organizationName} will be hidden
                    </p>
                  </div>
                  <Switch
                    id="mute-notifications"
                    checked={muteNotifications}
                    onCheckedChange={setMuteNotifications}
                  />
                </div>
              </div>
            </div>
            */}

            {/* Danger Zone Section
            <div className="space-y-4 rounded-md border border-red-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100">
                  <IconAlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                  <p className="text-sm text-red-800">Irreversible actions</p>
                </div>
              </div>
              <div className="space-y-2 rounded-md bg-red-50 p-4">
                <div className="space-y-1">
                  <h3 className="font-medium text-red-900">Leave Organization</h3>
                  <p className="text-sm text-red-800">
                    You will no longer receive payments from {organizationName}. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Leave {organizationName}
                </Button>
              </div>
            </div>
            */}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

