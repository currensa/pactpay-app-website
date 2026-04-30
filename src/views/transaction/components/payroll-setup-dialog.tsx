import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PaymentConfigFields } from '@/views/orgs/components/payment-config-fields'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'

interface PayrollSetupDialogProps {
  open: boolean
  chainAssets: import('@/apis/chain-asset.api').ChainAssetResponse['data']
  selectedChainId: string
  selectedToken: string
  saving: boolean
  onClose: () => void
  onSave: () => void
  onSelectedChainIdChange: (value: string) => void
  onSelectedTokenChange: (value: string) => void
}

export function PayrollSetupDialog({
  open,
  chainAssets,
  selectedChainId,
  selectedToken,
  saving,
  onClose,
  onSave,
  onSelectedChainIdChange,
  onSelectedTokenChange,
}: PayrollSetupDialogProps) {
  const footerHint = useMemo(
    () => 'Saved as this organisation\'s default. Change anytime in Settings.',
    []
  )

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose() }}>
      <DialogContent disableOutsideClose>
        <DialogHeader>
          <DialogTitle>Set up network & token first</DialogTitle>
          <DialogDescription>
            You haven&apos;t configured a payment network or token for this organisation. This is required before creating a transaction.
          </DialogDescription>
        </DialogHeader>

        <PaymentConfigFields
          chainAssets={chainAssets}
          selectedChainId={selectedChainId}
          selectedToken={selectedToken}
          onSelectedChainIdChange={onSelectedChainIdChange}
          onSelectedTokenChange={onSelectedTokenChange}
          chainLabel="Network *"
          tokenLabel="Token *"
          dropdownPlacement="bottom"
          footerHint={footerHint}
          className="mt-[8px]"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!selectedChainId || !selectedToken || saving}
          >
            {saving && <Loader2 className="mr-[6px] h-[14px] w-[14px] animate-spin" />}
            Save & continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
