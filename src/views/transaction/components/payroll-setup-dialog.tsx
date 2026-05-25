import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/utils/i18n'
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
  const { t } = useTranslation()
  const footerHint = useMemo(
    () => t('pages.transactions.payrollSetupFooterHint'),
    [t]
  )

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose() }}>
      <DialogContent disableOutsideClose>
        <DialogHeader>
          <DialogTitle>{t('pages.transactions.payrollSetupTitle')}</DialogTitle>
          <DialogDescription>
            {t('pages.transactions.payrollSetupDescription')}
          </DialogDescription>
        </DialogHeader>

        <PaymentConfigFields
          chainAssets={chainAssets}
          selectedChainId={selectedChainId}
          selectedToken={selectedToken}
          onSelectedChainIdChange={onSelectedChainIdChange}
          onSelectedTokenChange={onSelectedTokenChange}
          chainLabel={t('pages.transactions.networkRequired')}
          tokenLabel={t('pages.transactions.tokenRequired')}
          dropdownPlacement="bottom"
          footerHint={footerHint}
          className="mt-[8px]"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onSave}
            disabled={!selectedChainId || !selectedToken || saving}
          >
            {saving && <Loader2 className="mr-[6px] h-[14px] w-[14px] animate-spin" />}
            {t('pages.transactions.saveContinue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
