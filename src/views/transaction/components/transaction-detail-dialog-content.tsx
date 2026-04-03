import { TransactionItem } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PayrollTransactionStatus } from '@/enums/transaction'
import { Transaction } from './types'

function getStatusBadge(status: Transaction['status']) {
  switch (status) {
    case PayrollTransactionStatus.READY:
      return <Badge variant="secondary">Ready</Badge>
    case PayrollTransactionStatus.PENDING:
      return <Badge variant="warning">Pending</Badge>
    case PayrollTransactionStatus.COMPLETE:
      return <Badge variant="success">Complete</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
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
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-[6px]">
                          <div className="w-[28px] h-[28px] rounded-full bg-[#e8edf9] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#5e85ee] overflow-hidden">
                            {item.member.avatarUrl
                              ? <img src={item.member.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : (item.member.showName || '?')[0]?.toUpperCase()}
                          </div>
                          {item.member.showName}
                        </div>
                      </TableCell>
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
