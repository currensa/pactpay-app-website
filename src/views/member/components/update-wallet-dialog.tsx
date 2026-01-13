import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'
import { WalletUpdateActions, WalletUpdateState } from '../hooks/use-wallet-update'

interface UpdateWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletState: WalletUpdateState
  walletActions: WalletUpdateActions
}

export function UpdateWalletDialog({
  open,
  onOpenChange,
  walletState,
  walletActions
}: UpdateWalletDialogProps) {
  const { newWalletAddress, confirmWalletAddress, selectedNetwork, addressError, isUpdating } = walletState
  const { setNewWalletAddress, setConfirmWalletAddress, setSelectedNetwork, handleUpdateWallet, resetForm } =
    walletActions

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      onOpenChange(true)
    } else if (!isUpdating) {
      onOpenChange(false)
      resetForm()
    }
  }

  const onSubmit = () => {
    handleUpdateWallet(() => {
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Wallet Address</DialogTitle>
          <DialogDescription>Change your receiving wallet address for TechCorp Inc.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-address">Wallet Address</Label>
            <Input
              id="wallet-address"
              placeholder="Enter new wallet address"
              value={newWalletAddress}
              onChange={e => setNewWalletAddress(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-wallet-address">Confirm Wallet Address</Label>
            <Input
              id="confirm-wallet-address"
              placeholder="Re-enter wallet address"
              value={confirmWalletAddress}
              onChange={e => setConfirmWalletAddress(e.target.value)}
              className={`font-mono ${addressError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {addressError && (
              <p className="flex items-center gap-1 text-sm text-red-600">
                <IconAlertTriangle className="h-4 w-4" />
                {addressError}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="network">Network</Label>
            <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
              <SelectTrigger id="network">{selectedNetwork}</SelectTrigger>
              <SelectContent>
                <SelectItem value="Ethereum Mainnet">Ethereum Mainnet</SelectItem>
                <SelectItem value="Polygon">Polygon</SelectItem>
                <SelectItem value="Arbitrum">Arbitrum</SelectItem>
                <SelectItem value="Optimism">Optimism</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-900">
                Double-check carefully. Payments will be sent to this address. Crypto transactions{' '}
                <span className="font-bold text-red-600">cannot be reversed.</span>
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button variant="default" onClick={onSubmit} disabled={!!addressError || isUpdating}>
            {isUpdating && <IconLoader2 className="h-4 w-4 animate-spin" />}
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

