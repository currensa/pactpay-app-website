import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/utils/i18n'
import { IconLoader2 } from '@tabler/icons-react'
import { Transaction } from './types'

interface DeleteConfirmDialogContentProps {
  transactionToDelete: Transaction | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialogContent({
  transactionToDelete,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogContentProps) {
  const { t } = useTranslation()

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('pages.transactions.deleteTransaction')}</DialogTitle>
        <DialogDescription>
          {t('pages.transactions.deleteTransactionDescription')}
        </DialogDescription>
      </DialogHeader>

      {transactionToDelete && (
        <div className="mt-[16px] bg-[#f5f5f5] rounded-[12px] p-[14px] flex flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">{t('pages.transactions.transactionName')}</span>
            <span className="text-[13px] font-medium text-[#1c1c26]">{transactionToDelete.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">{t('pages.transactions.transactionId')}</span>
            <span className="font-mono text-[13px] font-medium text-[#1c1c26]">{transactionToDelete.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">{t('pages.transactions.members')}</span>
            <span className="text-[13px] font-medium text-[#1c1c26]">{transactionToDelete.members}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">{t('pages.transactions.totalAmount')}</span>
            <span className="text-[13px] font-medium text-[#1c1c26]">
              ${transactionToDelete.totalAmount} {transactionToDelete.currency}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-[12px] mt-[24px]">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isDeleting}
        >
          {t('common.cancel')}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <>
              <IconLoader2 className="h-[14px] w-[14px] animate-spin" />
              {t('pages.transactions.deleting')}
            </>
          ) : (
            t('pages.transactions.delete')
          )}
        </Button>
      </div>
    </>
  )
}
