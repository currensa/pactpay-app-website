import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ChangeEmailDialog } from '@/views/account/components/dialogs/change-email-dialog'
import { ChangeWalletDialog } from '@/views/account/components/dialogs/change-wallet-dialog'
import { IconCopy, IconMail, IconShield, IconUser, IconWallet } from '@tabler/icons-react'
import { useState } from 'react'

export default function AccountSettings() {
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showWalletDialog, setShowWalletDialog] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('alice@example.com')
  const [currentWallet, setCurrentWallet] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')

  const handleEmailUpdate = (newEmail: string) => {
    setCurrentEmail(newEmail)
  }

  const handleWalletUpdate = (newWallet: string) => {
    setCurrentWallet(newWallet)
  }

  return (
    <div className="space-y-6">
      <ChangeEmailDialog
        currentEmail={currentEmail}
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onSuccess={handleEmailUpdate}
      />

      <ChangeWalletDialog
        currentWallet={currentWallet}
        open={showWalletDialog}
        onOpenChange={setShowWalletDialog}
        onSuccess={handleWalletUpdate}
      />

      {/* My Profile Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 text-blue-600">
            <IconUser className="h-[18px] w-[18px]" />
          </span>
          <h2 className="text-lg font-semibold">My Profile</h2>
        </div>

        <Card>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground font-normal">User ID</Label>
              <div className="flex items-center justify-between">
                <span className="font-medium">UID-8829A4F2B1C3</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <IconCopy className="text-muted-foreground h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="-mx-6 space-y-2 border-t px-6 py-4">
              <Label className="text-muted-foreground font-normal">Account Created</Label>
              <div className="font-medium">Nov 15, 2024</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Login Credentials Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-100 text-purple-600">
            <IconShield className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Login Credentials</h2>
            <p className="text-muted-foreground text-sm">Manage how you sign in to PactPay</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <IconMail className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Email</div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      {currentEmail}
                      <IconCopy className="h-3 w-3 cursor-pointer" />
                    </div>
                  </div>
                </div>
                {/* <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  Primary Login
                </div> */}
              </div>
              <p className="text-muted-foreground text-xs">This email is used for login and receiving notifications.</p>
              <Button
                variant="outline"
                className="w-full justify-center font-normal"
                onClick={() => setShowEmailDialog(true)}
              >
                <span>Change Email &gt; </span>
              </Button>
            </div>

            <div className="space-y-4 border-t pt-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <IconWallet className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Login Wallet</div>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
                    <IconCopy className="h-3 w-3 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-md bg-purple-50 p-3 text-xs text-purple-700">
                <span>📌</span>
                This is your login wallet, separate from receiving wallets you set up for each organization.
              </div>

              <p className="text-muted-foreground text-xs">
                This wallet is used for login only, not for receiving payments.
              </p>

              <Button
                variant="outline"
                className="w-full justify-center font-normal"
                onClick={() => setShowWalletDialog(true)}
              >
                <span>Change Login Wallet &gt; </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
