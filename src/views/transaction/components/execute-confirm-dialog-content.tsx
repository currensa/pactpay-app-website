import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Transaction } from './types'

interface ExecuteConfirmDialogContentProps {
  executingTransaction: Transaction | null
  onCancel: () => void
  onConfirm: () => void
}

export function ExecuteConfirmDialogContent({
  executingTransaction,
  onCancel,
  onConfirm,
}: ExecuteConfirmDialogContentProps) {
  return (
    <div className="flex flex-col space-y-4">
      <DialogHeader>
        <DialogTitle>Execute Transaction</DialogTitle>
        <DialogDescription>
          Please confirm that you want to execute this transaction on Safe Wallet.
        </DialogDescription>
      </DialogHeader>

      {executingTransaction && (
        <div className="space-y-4 py-4">
          {/* Transaction 摘要 */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Transaction Name:</span>
              <span className="text-sm font-medium">{executingTransaction.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Members:</span>
              <span className="text-sm font-medium">{executingTransaction.members}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total Amount:</span>
              <span className="text-sm font-medium">
                ${executingTransaction.totalAmount} {executingTransaction.currency}
              </span>
            </div>
          </div>

          {/* 警告提示 */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-900">Important Notice</p>
              <p className="text-xs text-orange-800">
                You will need to pay gas fees when executing this transaction on Safe Wallet. Make sure you have
                sufficient funds in your wallet.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Execute</Button>
      </div>
    </div>
  )
}
