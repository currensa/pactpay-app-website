import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Transaction } from './types'

interface ExecuteSuccessDialogContentProps {
  depositTxHash: string
  executingTransaction: Transaction | null
  onClose: () => void
}

export function ExecuteSuccessDialogContent({
  depositTxHash,
  executingTransaction,
  onClose,
}: ExecuteSuccessDialogContentProps) {
  return (
    <div className="flex flex-col space-y-4">
      <DialogHeader>
        <DialogTitle>Deposit Confirmed</DialogTitle>
        <DialogDescription>The deposit has been confirmed. Employees can now claim their payments.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Success notice */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600">✓</div>
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-green-900">Deposit Confirmed Successfully</p>
            <p className="text-xs text-green-800 break-words">
              The Merkle root has been deposited to the vault. Employees can now use their stealth keys to claim
              their payments via the relayer.
            </p>
          </div>
        </div>

        {/* Batch name */}
        {executingTransaction && (
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Batch:</span>
              <span className="text-sm font-medium">{executingTransaction.name}</span>
            </div>
          </div>
        )}

        {/* Deposit tx hash */}
        {depositTxHash && (
          <div className="bg-muted rounded-lg p-3 space-y-1">
            <span className="text-muted-foreground text-sm">Deposit Transaction Hash:</span>
            <p className="font-mono text-sm font-medium break-all">{depositTxHash}</p>
          </div>
        )}

        {/* Next steps */}
        <div className="text-muted-foreground text-sm">
          <p className="mb-1 font-medium">Next Steps:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Employees will see claimable payments in their dashboard</li>
            <li>Each employee uses their meta private key to recover their stealth key</li>
            <li>The relayer will process claim requests on behalf of employees</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}
