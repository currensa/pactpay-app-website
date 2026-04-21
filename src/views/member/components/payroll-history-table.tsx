import apis from '@/apis'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PayrollItemStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { formatUtcDateTime } from '@/utils/date'
import { buildExplorerTransactionUrl, formatTransactionHash } from '@/utils/transaction'
import { TransactionItemStatusBadge } from '@/views/transaction/components/transaction-status-badge'
import { useEffect, useState } from 'react'

const PAGE_SIZE = 10

interface PayrollHistoryRow {
  id: string
  date: string
  orgId: string
  orgName: string
  memberId: string
  amount: number
  token: string
  status: string
  transactionName: string | null
  txHash: string | null
  caipChainId: string
}


interface PayrollHistoryTableProps {
  /** 传入时只查该组织数据，并隐藏 Organization 列 */
  orgId?: string
  memberId?: string
  onOrgClick?: (orgId: string, orgName: string, memberId: string) => void
}

export function PayrollHistoryTable({ orgId, memberId, onOrgClick }: PayrollHistoryTableProps) {
  const { toast } = useToast()
  const { fetchChainAssets, fetchChains, getTokenSymbol, getTokenDecimals, getChain } = useChainAssetStore()
  const { organizations, getOrganizations } = useOrganizationStore()

  const [rows, setRows] = useState<PayrollHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showOrgColumn = !orgId

  useEffect(() => {
    setCurrentPage(1)
    loadPage(1)
  }, [orgId, memberId])

  useEffect(() => {
    if (currentPage === 1) return
    loadPage(currentPage)
  }, [currentPage])

  async function loadPage(page: number) {
    try {
      setLoading(true)
      const orgs = organizations.length > 0 ? organizations : await getOrganizations()
      const orgNameMap = Object.fromEntries(orgs.map(o => [o.organization.orgId, o.organization.orgName]))
      await Promise.all([fetchChainAssets(), fetchChains()])

      const data = await apis.transaction.getMyPayrollHistory({
        ...(orgId ? { orgId } : {}),
        page,
        pageSize: PAGE_SIZE,
      })

      setTotal(data.total)
      setRows(
        data.data.map(tx => {
          const memberItem = tx.items.find(i => i.member?.memberId === memberId) ?? tx.items[0]
          const rawAmount = memberItem?.amount ?? tx.totalAmount
          const decimals = getTokenDecimals(tx.caipChainId, tx.tokenAddress ?? '')
          const amount = Number(rawAmount) / Math.pow(10, decimals)
          const token = getTokenSymbol(tx.caipChainId, tx.tokenAddress ?? '') ?? tx.tokenAddress?.slice(0, 6) ?? '—'
          return {
            id: tx.id,
            date: formatUtcDateTime(tx.payPeriod),
            orgId: tx.orgId,
            orgName: orgNameMap[tx.orgId] ?? tx.orgId,
            memberId: memberItem?.member?.memberId ?? memberId ?? '',
            amount,
            token,
            status: memberItem.status,
            transactionName: tx.transactionName ?? null,
            txHash: memberItem.txHash ?? null,
            caipChainId: tx.caipChainId,
          }
        })
      )
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load payroll history.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(page: number) {
    setCurrentPage(page)
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scheduled for</TableHead>
            {showOrgColumn && <TableHead>Organization</TableHead>}
            <TableHead>Transaction</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Tx Hash</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeletonRows rows={5} cols={showOrgColumn ? 6 : 5} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showOrgColumn ? 6 : 5} className="py-[24px]">
                <div className="flex flex-col items-center justify-center gap-[10px]">
                  <img src="/empty-table.svg" alt="No records" className="h-[120px] w-[120px]" />
                  <p className="text-[14px] leading-[22px] text-[#8d8d93]">No records found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => {
              const explorerUrl = getChain(row.caipChainId)?.explorerUrls?.[0]
              const txUrl = buildExplorerTransactionUrl(explorerUrl, row.txHash)
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  {showOrgColumn && (
                    <TableCell>
                      {onOrgClick ? (
                        <button
                          onClick={() => onOrgClick(row.orgId, row.orgName, row.memberId)}
                          className="text-[#5e85ee] hover:underline cursor-pointer"
                        >
                          {row.orgName}
                        </button>
                      ) : (
                        row.orgName
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-[#606067]">
                    {row.transactionName ?? '—'}
                  </TableCell>
                  <TableCell>
                    {row.amount.toLocaleString()} {row.token}
                  </TableCell>
                  <TableCell>
                    {txUrl ? (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#5e85ee] hover:underline"
                        title={row.txHash ?? ''}
                      >
                        {formatTransactionHash(row.txHash)}
                      </a>
                    ) : (
                      <span className="font-mono text-[#8d8d93]">{formatTransactionHash(row.txHash)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <TransactionItemStatusBadge status={row.status === PayrollItemStatus.REFUNDED ? 'Payment cancelled' : row.status} />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={total}
        pageSize={PAGE_SIZE}
        itemLabel="records"
      />
    </div>
  )
}
