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
    <div className="flex flex-col space-y-4">
      <DialogHeader>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this transaction? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      {transactionToDelete && (
        <div className="space-y-4 py-4">
          {/* Transaction 摘要 */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Transaction Name:</span>
              <span className="text-sm font-medium">{transactionToDelete.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Transaction ID:</span>
              <span className="font-mono text-sm font-medium">{transactionToDelete.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Members:</span>
              <span className="text-sm font-medium">{transactionToDelete.members}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total Amount:</span>
              <span className="text-sm font-medium">
                ${transactionToDelete.totalAmount} {transactionToDelete.currency}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
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
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            'Delete'
          )}
        </Button>
      </div>
    </div>
  )
}
