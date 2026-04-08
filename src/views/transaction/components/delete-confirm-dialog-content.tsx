import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this transaction? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      {transactionToDelete && (
        <div className="mt-[16px] bg-[#f5f5f5] rounded-[12px] p-[14px] flex flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">Transaction Name</span>
            <span className="text-[13px] font-medium text-[#1c1c26]">{transactionToDelete.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">Transaction ID</span>
            <span className="font-mono text-[13px] font-medium text-[#1c1c26]">{transactionToDelete.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">Members</span>
            <span className="text-[13px] font-medium text-[#1c1c26]">{transactionToDelete.members}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#606067]">Total Amount</span>
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
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <>
              <IconLoader2 className="h-[14px] w-[14px] animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete'
          )}
        </Button>
      </div>
    </>
  )
}
