import apis from '@/apis'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
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
}

function formatPayPeriod(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function statusVariant(status: string): 'success' | 'warning' | 'default' {
  if (status === 'claimed') return 'success'
  if (status === 'pending') return 'warning'
  return 'default'
}

interface PayrollHistoryTableProps {
  /** 传入时只查该组织数据，并隐藏 Organization 列 */
  orgId?: string
  memberId?: string
  onOrgClick?: (orgId: string, orgName: string, memberId: string) => void
}

export function PayrollHistoryTable({ orgId, memberId, onOrgClick }: PayrollHistoryTableProps) {
  const { toast } = useToast()
  const { fetchChainAssets, getTokenSymbol, getTokenDecimals } = useChainAssetStore()
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
      await fetchChainAssets()

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
            date: formatPayPeriod(tx.payPeriod),
            orgId: tx.orgId,
            orgName: orgNameMap[tx.orgId] ?? tx.orgId,
            memberId: memberItem?.member?.memberId ?? memberId ?? '',
            amount,
            token,
            status: memberItem.status,
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
            <TableHead>Date</TableHead>
            {showOrgColumn && <TableHead>Organization</TableHead>}
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeletonRows rows={5} cols={showOrgColumn ? 4 : 3} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showOrgColumn ? 4 : 3} className="text-center text-[#8d8d93] py-[24px]">
                No records
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => (
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
                <TableCell>
                  {row.amount.toLocaleString()} {row.token}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))
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
