import api from '@/apis'
import { OrganizationPaymentAccount } from '@/apis/orgnization.api'
import { ModifySafeOwnerParams } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'

interface SafeWalletConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentAccount: OrganizationPaymentAccount
  onSuccess?: () => void
}

type OperationType = 'add_owner' | 'remove_owner' | 'change_threshold' | 'swap_owner'

export function SafeWalletConfigDialog({ open, onOpenChange, paymentAccount, onSuccess }: SafeWalletConfigDialogProps) {
  const [loading, setLoading] = useState(false)
  const [operationType, setOperationType] = useState<OperationType>('add_owner')

  // Form states
  const [newOwnerAddress, setNewOwnerAddress] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newOwnerDescription, setNewOwnerDescription] = useState('')
  const [ownerToRemove, setOwnerToRemove] = useState('')
  const [oldOwnerToSwap, setOldOwnerToSwap] = useState('')
  const [newThreshold, setNewThreshold] = useState<string>('')

  const currentOwners = paymentAccount.config.owners || []
  const currentThreshold = paymentAccount.config.threshold || 1

  const resetForm = () => {
    setNewOwnerAddress('')
    setNewOwnerEmail('')
    setNewOwnerDescription('')
    setOwnerToRemove('')
    setOldOwnerToSwap('')
    setNewThreshold('')
    setOperationType('add_owner')
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const payload: ModifySafeOwnerParams = {
        paymentAccountId: Number(paymentAccount.id),
        operationType
      }

      // Construct payload based on operation type
      switch (operationType) {
        case 'add_owner':
          if (!newOwnerAddress) return
          payload.addOwnerParams = {
            ownerAddress: newOwnerAddress,
            threshold: newThreshold ? Number(newThreshold) : undefined,
            ownerEmail: newOwnerEmail,
            ownerDescription: newOwnerDescription
          }
          break
        case 'remove_owner':
          if (!ownerToRemove) return
          payload.removeOwnerParams = {
            ownerAddress: ownerToRemove,
            threshold: newThreshold ? Number(newThreshold) : undefined
          }
          break
        case 'change_threshold':
          if (!newThreshold) return
          payload.changeThresholdParams = {
            threshold: Number(newThreshold)
          }
          break
        case 'swap_owner':
          if (!oldOwnerToSwap || !newOwnerAddress) return
          payload.swapOwnerParams = {
            oldOwnerAddress: oldOwnerToSwap,
            newOwnerAddress: newOwnerAddress,
            ownerEmail: newOwnerEmail,
            ownerDescription: newOwnerDescription
          }
          break
      }

      await api.transaction.modifySafeOwner(payload)

      alert('Transaction created successfully. Please check your pending transactions.')
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Failed to modify safe owner:', error)
      alert('Failed to create transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Safe Wallet Config</DialogTitle>
          <DialogDescription>
            Modify your Safe Wallet configuration. This will create a multi-sig transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Configuration */}
          <div className="bg-muted/50 space-y-2 rounded-lg border p-4 text-sm">
            <div className="font-semibold">Current Configuration</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">Threshold:</div>
              <div>{currentThreshold} / {currentOwners.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Owners:</div>
              <ul className="list-inside list-disc space-y-0.5 text-xs font-mono">
                {currentOwners.map((owner) => (
                  <li key={owner} className="truncate">{owner}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="min-h-[300px] space-y-6">
            {/* Operation Type Selection */}
            <div className="space-y-3">
              <Label className="mb-2 block">Operation Type</Label>
              <div>
                <Select
                  value={operationType}
                  onValueChange={(val) => {
                    setOperationType(val as OperationType)
                    setNewThreshold('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add_owner">Add Owner</SelectItem>
                    <SelectItem value="remove_owner">Remove Owner</SelectItem>
                    <SelectItem value="swap_owner">Swap Owner</SelectItem>
                    <SelectItem value="change_threshold">Update Threshold Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-2 text-[0.8rem]">
                  Choose "Update Threshold Only" to change the confirmation threshold without modifying owners.
                </p>
              </div>
            </div>

            {/* Dynamic Form Fields */}
            <div className="space-y-4">
              {operationType === 'add_owner' && (
                <>
                  <div className="space-y-3">
                    <Label className="mb-2 block">New Owner Address</Label>
                    <Input
                      placeholder="0x..."
                      value={newOwnerAddress}
                      onChange={(e) => setNewOwnerAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">Owner Email</Label>
                    <Input
                      placeholder="email@example.com"
                      type="email"
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">Description</Label>
                    <Input
                      placeholder="e.g. Finance Manager"
                      value={newOwnerDescription}
                      onChange={(e) => setNewOwnerDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">New Threshold (Optional)</Label>
                    <div>
                      <Input
                        type="number"
                        placeholder={`Current: ${currentThreshold}`}
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(e.target.value)}
                        min={1}
                        max={currentOwners.length + 1}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Leave empty to keep current threshold. Max: {currentOwners.length + 1}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {operationType === 'remove_owner' && (
                <>
                  <div className="space-y-3">
                    <Label className="mb-2 block">Owner to Remove</Label>
                    <Select value={ownerToRemove} onValueChange={setOwnerToRemove}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentOwners.map((owner) => (
                          <SelectItem key={owner} value={owner}>
                            <span className="font-mono text-xs">{owner}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">New Threshold (Optional)</Label>
                    <div>
                      <Input
                        type="number"
                        placeholder={`Current: ${currentThreshold}`}
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(e.target.value)}
                        min={1}
                        max={currentOwners.length - 1}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Required if current threshold &gt; remaining owners. Max: {Math.max(1, currentOwners.length - 1)}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {operationType === 'change_threshold' && (
                <div className="space-y-3">
                  <Label className="mb-2 block">New Threshold</Label>
                  <div>
                    <Input
                      type="number"
                      placeholder={`Current: ${currentThreshold}`}
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      min={1}
                      max={currentOwners.length}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Must be between 1 and {currentOwners.length}
                    </p>
                  </div>
                </div>
              )}

              {operationType === 'swap_owner' && (
                <>
                  <div className="space-y-3">
                    <Label className="mb-2 block">Old Owner (To be replaced)</Label>
                    <Select value={oldOwnerToSwap} onValueChange={setOldOwnerToSwap}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentOwners.map((owner) => (
                          <SelectItem key={owner} value={owner}>
                            <span className="font-mono text-xs">{owner}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">New Owner Address</Label>
                    <Input
                      placeholder="0x..."
                      value={newOwnerAddress}
                      onChange={(e) => setNewOwnerAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">New Owner Email</Label>
                    <Input
                      placeholder="email@example.com"
                      type="email"
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="mb-2 block">New Owner Description</Label>
                    <Input
                      placeholder="e.g. Finance Manager"
                      value={newOwnerDescription}
                      onChange={(e) => setNewOwnerDescription(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating Transaction...' : 'Create Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
