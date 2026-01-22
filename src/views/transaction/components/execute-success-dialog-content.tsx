import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Transaction } from './types'

interface ExecuteSuccessDialogContentProps {
  createdTransactionId: string
  executingTransaction: Transaction | null
  onDoItLater: () => void
  onGoToSafeWallet: (transaction: Transaction) => void
}

export function ExecuteSuccessDialogContent({
  createdTransactionId,
  executingTransaction,
  onDoItLater,
  onGoToSafeWallet,
}: ExecuteSuccessDialogContentProps) {
  return (
    <div className="flex flex-col space-y-4">
      <DialogHeader>
        <DialogTitle>Transaction Created on Safe Wallet</DialogTitle>
        <DialogDescription>Your transaction has been successfully created on Safe Wallet.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* 成功提示 */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600">✓</div>
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-green-900">Transaction Created Successfully</p>
            <p className="text-xs text-green-800 break-words">
              The transaction has been proposed on Safe Wallet. You can now review and execute it.
            </p>
          </div>
        </div>

        {/* Transaction ID */}
        <div className="bg-muted rounded-lg p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground text-sm">Transaction ID:</span>
            <span className="font-mono text-sm font-medium break-all sm:break-normal">{createdTransactionId}</span>
          </div>
        </div>

        {/* 下一步操作提示 */}
        <div className="text-muted-foreground text-sm">
          <p className="mb-1 font-medium">Next Steps:</p>
          <ul className="list-disc space-y-1 pl-5 break-words">
            <li>Go to Safe Wallet to review the transaction</li>
            <li>Sign and execute the transaction</li>
            <li>Wait for the transaction to be confirmed on the blockchain</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onDoItLater} className="w-full sm:w-auto">
          I'll do it later
        </Button>
        <Button onClick={() => executingTransaction && onGoToSafeWallet(executingTransaction)} className="w-full sm:w-auto">
          Go to Safe Wallet
        </Button>
      </div>
    </div>
  )
}
