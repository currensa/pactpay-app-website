import { TransactionItem } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Transaction } from './types'

function getStatusBadge(status: Transaction['status']) {
  switch (status) {
    case 'pending_deposit':
      return <Badge variant="warning">Pending Deposit</Badge>
    case 'pending':
      return <Badge variant="warning">Pending</Badge>
    case 'complete':
      return <Badge variant="success">Complete</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatWalletAddress(address: string): string {
  if (!address || address.length <= 10) return address || '-'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface TransactionDetailDialogContentProps {
  selectedTransaction: Transaction | null
  transactionDetailMembers: TransactionItem[]
  onExecuteNow: (transaction: Transaction) => void
}

export function TransactionDetailDialogContent({
  selectedTransaction,
  transactionDetailMembers,
}: TransactionDetailDialogContentProps) {
  if (!selectedTransaction) return null

  return (
    <div className="flex flex-col space-y-6">
      <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <DialogTitle>{selectedTransaction.name}</DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Transaction info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium">{selectedTransaction.executionDate}</span>
            {selectedTransaction.isDueToday && (
              <Badge variant="warning" className="text-xs">Due Today</Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {selectedTransaction.currency}
            </Badge>
            {getStatusBadge(selectedTransaction.status)}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-muted-foreground text-sm">Member Count</p>
            <p className="mt-1 text-2xl font-semibold">{selectedTransaction.members}</p>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-muted-foreground text-sm">Total Amount</p>
            <p className="mt-1 text-2xl font-semibold">
              {selectedTransaction.totalAmount} {selectedTransaction.currency}
            </p>
          </div>
        </div>

        {/* Member details table */}
        <div className="space-y-3">
          <h3 className="text-muted-foreground text-sm font-medium uppercase">Member Details</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MEMBER</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionDetailMembers.length > 0 ? (
                  transactionDetailMembers.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.member.showName}</TableCell>
                      <TableCell className="text-right font-medium">
                        {parseFloat(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                      Loading members...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
