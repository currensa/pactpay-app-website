import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { PayrollTransactionStatus, getStatusDisplayName } from '@/enums/transaction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import { IconArrowLeft, IconCopy } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

function shortHash(hash: string): string {
  if (!hash) return '-'
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => { })
}

export default function TransactionDetail() {
  const { batchId } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { getTokenSymbol, chains, fetchChainAssets, fetchChains } = useChainAssetStore()
  const [batch, setBatch] = useState<TransactionPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChainAssets()
    fetchChains()
    if (!batchId) return
    const fetchDetail = async () => {
      try {
        const data = await apis.transaction.getTransactionPlanDetail(batchId)
        setBatch(data)
      } catch (error: any) {
        toast({ description: `Failed to load batch detail: ${error.message}`, variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [batchId])

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!batch) return <div className="p-6">Batch not found</div>

  const statusVariant = batch.transactionStatus === PayrollTransactionStatus.COMPLETE
    ? 'success'
    : batch.transactionStatus === PayrollTransactionStatus.PENDING
      ? 'warning'
      : 'secondary'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orgs/transaction')}>
          <IconArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{batch.transactionName}</h1>
        </div>
        <Badge variant={statusVariant}>{getStatusDisplayName(batch.transactionStatus)}</Badge>
      </div>

      {/* Batch info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase">Batch Info</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Batch ID:</span>
            <div className="font-mono mt-0.5">{batch.id}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Pay Period:</span>
            <div className="mt-0.5">{new Date(batch.payPeriod).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Network:</span>
            <div className="mt-0.5">{chains.find(c => c.caipChainId === batch.caipChainId)?.name || batch.caipChainId}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Token:</span>
            <div className="mt-0.5">
              {getTokenSymbol(batch.caipChainId, batch.tokenAddress || '') || batch.tokenAddress || '-'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Members:</span>
            <div className="mt-0.5">{batch.items.length}</div>
          </div>
          {batch.merkleRoot && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Merkle Root:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs">{shortHash(batch.merkleRoot)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(batch.merkleRoot!)}>
                  <IconCopy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {batch.ephemeralPub && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Ephemeral Public Key:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs">{shortHash(batch.ephemeralPub)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(batch.ephemeralPub!)}>
                  <IconCopy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {batch.depositTxHash && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Deposit Tx Hash:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs">{shortHash(batch.depositTxHash)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(batch.depositTxHash!)}>
                  <IconCopy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payroll items */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Payroll Items</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-16 text-center">No items</TableCell>
              </TableRow>
            ) : (
              batch.items.map((item, index) => (
                <TableRow key={item.member?.memberId || index}>
                  <TableCell className="font-medium">{item.member?.showName || item.member?.memberId}</TableCell>
                  <TableCell>
                    {item.amount} {getTokenSymbol(batch.caipChainId, batch.tokenAddress || '') || batch.tokenAddress || ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">pending</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
