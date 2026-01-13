import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { IconAlertCircle, IconShieldCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/use-toast'

interface ChangeWalletDialogProps {
  currentWallet: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newWallet: string) => void
}

export function ChangeWalletDialog({ currentWallet, open, onOpenChange, onSuccess }: ChangeWalletDialogProps) {
  const [newWallet, setNewWallet] = useState('')
  const [confirmWallet, setConfirmWallet] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Validation states
  const [walletError, setWalletError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setNewWallet('')
      setConfirmWallet('')
      setIsVerified(false)
      setWalletError('')
      setConfirmError('')
    }
  }, [open])

  const validateAddress = (address: string) => {
    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/
    if (!evmAddressRegex.test(address)) {
      setWalletError('Invalid EVM wallet address')
      return false
    }
    setWalletError('')
    return true
  }

  const checkWalletAvailability = async (address: string) => {
    // TODO: Implement actual backend check
    // Simulate check
    if (address.toLowerCase() === '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef') {
      setWalletError('This wallet address is already registered. Please use a different wallet.')
      return false
    }
    return true
  }

  const handleWalletBlur = async () => {
    if (!newWallet) return
    if (validateAddress(newWallet)) {
      await checkWalletAvailability(newWallet)
    }
  }

  const handleVerifyOwnership = async () => {
    if (!validateAddress(newWallet)) return
    
    setIsVerifying(true)
    try {
      // TODO: Implement actual wallet signature logic
      // e.g. await signMessage(`I confirm changing my login wallet to ${newWallet} on PactPay at ${Date.now()}`)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsVerified(true)
      toast({
        title: "Ownership verified",
        description: "Wallet ownership has been successfully verified.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: "Failed to verify wallet ownership. Please try again.",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleUpdate = async () => {
    // Final validation
    let isValid = true
    if (!validateAddress(newWallet)) isValid = false
    
    if (newWallet !== confirmWallet) {
      setConfirmError('Wallet addresses do not match')
      isValid = false
    } else {
      setConfirmError('')
    }

    if (!isVerified) {
      toast({
        variant: "destructive",
        title: "Verification required",
        description: "Please verify wallet ownership first.",
      })
      isValid = false
    }

    if (!isValid) return

    setIsUpdating(true)
    try {
      // TODO: Implement actual update logic
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onSuccess(newWallet)
      onOpenChange(false)
      toast({
        title: "Login wallet updated successfully",
        description: "Please use the new wallet to log in next time.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Login Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
            <IconAlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Changing your login wallet will affect how you access your account.
              </p>
              <p className="text-sm">
                This does NOT affect your receiving wallets in organizations.
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="rounded-lg bg-purple-50 p-4 text-sm text-purple-900">
            This is your <span className="font-bold">login wallet</span>, separate from the receiving wallets you use for payments.
          </div>

          <div className="space-y-4">
            {/* Current Wallet */}
            <div className="space-y-2">
              <Label>Current Login Wallet</Label>
              <div className="rounded-md border bg-muted/50 px-3 py-3 text-sm text-muted-foreground font-mono break-all">
                <div>{currentWallet}</div>
                <div className="mt-1 text-xs opacity-70">Ethereum Mainnet</div>
              </div>
            </div>

            {/* New Wallet */}
            <div className="space-y-2">
              <Label htmlFor="new-wallet">New Login Wallet Address</Label>
              <Input
                id="new-wallet"
                placeholder="Enter new wallet address"
                value={newWallet}
                onChange={(e) => {
                  setNewWallet(e.target.value)
                  setIsVerified(false) // Reset verification if wallet changes
                  if (walletError) setWalletError('')
                }}
                onBlur={handleWalletBlur}
                className={cn(walletError && "border-destructive")}
              />
              {walletError && <p className="text-xs text-destructive">{walletError}</p>}
            </div>

            {/* Confirm New Wallet */}
            <div className="space-y-2">
              <Label htmlFor="confirm-wallet">Confirm New Wallet</Label>
              <Input
                id="confirm-wallet"
                placeholder="Re-enter new wallet address"
                value={confirmWallet}
                onChange={(e) => {
                  setConfirmWallet(e.target.value)
                  if (confirmError) setConfirmError('')
                }}
                className={cn(confirmError && "border-destructive")}
              />
              {confirmError && <p className="text-xs text-destructive">{confirmError}</p>}
            </div>

            {/* Wallet Verification */}
            <div className="space-y-2">
              <Label>Wallet Ownership Verification</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Sign a message with your new wallet to prove ownership.
              </p>
              <Button 
                type="button"
                className={cn(
                  "w-full gap-2 transition-all",
                  isVerified 
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                )}
                onClick={handleVerifyOwnership}
                disabled={isVerifying || !newWallet || !!walletError || isVerified}
              >
                {isVerifying ? (
                  "Verifying..." 
                ) : isVerified ? (
                  <>
                    <IconShieldCheck className="h-4 w-4" />
                    Verified
                  </>
                ) : (
                  <>
                    <IconShieldCheck className="h-4 w-4" />
                    Verify Ownership
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-purple-500 hover:bg-purple-600 text-white min-w-[120px]"
            onClick={handleUpdate}
            disabled={isUpdating || !newWallet || !confirmWallet || !isVerified || !!walletError || !!confirmError}
          >
            {isUpdating ? "Updating..." : "Update Wallet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

