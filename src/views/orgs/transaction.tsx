import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { IconAlertTriangle, IconFlame, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

interface Transaction {
  id: string
  name: string
  status: 'ready' | 'pending' | 'complete'
  executionDate: string
  daysRemaining: number | null
  isDueToday: boolean
  totalAmount: string
  currency: string
  members: number
  network: string
  isComplete: boolean
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    name: 'Special Project Payment',
    status: 'ready',
    executionDate: '2025/12/20',
    daysRemaining: 3,
    isDueToday: false,
    totalAmount: '15,200',
    currency: 'USDC',
    members: 4,
    network: 'Ethereum',
    isComplete: false
  },
  {
    id: '2',
    name: 'Bonus Payment - Q4',
    status: 'pending',
    executionDate: '2025/12/18',
    daysRemaining: 1,
    isDueToday: false,
    totalAmount: '10,500',
    currency: 'USDC',
    members: 3,
    network: 'Ethereum',
    isComplete: false
  },
  {
    id: '3',
    name: 'Monthly Payment - December',
    status: 'ready',
    executionDate: '2025/12/17',
    daysRemaining: 0,
    isDueToday: true,
    totalAmount: '18,700',
    currency: 'USDC',
    members: 5,
    network: 'Ethereum',
    isComplete: false
  },
  {
    id: '4',
    name: 'November Payment',
    status: 'complete',
    executionDate: '2024/12/10',
    daysRemaining: null,
    isDueToday: false,
    totalAmount: '15,200',
    currency: 'USDC',
    members: 4,
    network: 'Ethereum',
    isComplete: true
  }
]

function getStatusBadge(status: Transaction['status']) {
  switch (status) {
    case 'ready':
      return <Badge variant="default">Ready</Badge>
    case 'pending':
      return <Badge variant="warning">Pending</Badge>
    case 'complete':
      return <Badge variant="success">Complete</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function formatRelativeTime(daysRemaining: number | null, isDueToday: boolean, executionDate: string) {
  if (isDueToday) {
    return 'Due Today'
  }
  if (daysRemaining !== null && daysRemaining > 0) {
    return `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
  }
  if (daysRemaining !== null && daysRemaining < 0) {
    const daysAgo = Math.abs(daysRemaining)
    return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`
  }
  // For completed transactions, calculate days ago
  const executionDateObj = new Date(executionDate.replace(/\//g, '-'))
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - executionDateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return `${diffDays} days ago`
}

function getTimeIcon(daysRemaining: number | null, isDueToday: boolean) {
  if (isDueToday) {
    return <IconFlame className="size-4 text-orange-500" />
  }
  if (daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0) {
    return <IconAlertTriangle className="size-4 text-orange-500" />
  }
  return null
}

export default function Transaction() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md flex-1">
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" placeholder="All Statuses">
                {statusFilter === 'all' && 'All Statuses'}
                {statusFilter === 'ready' && 'Ready'}
                {statusFilter === 'pending' && 'Pending'}
                {statusFilter === 'complete' && 'Complete'}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>

            <Button>
              <IconPlus className="mr-2 size-4" />
              New Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Transaction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Execution Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead>Network</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map(transaction => (
                <TableRow
                  key={transaction.id}
                  className={cn(
                    'group',
                    !transaction.isComplete && 'border-l-2 border-l-orange-500 bg-orange-50/20 hover:bg-orange-50/40'
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-full w-1 rounded-full',
                          transaction.isComplete ? 'bg-gray-300' : 'bg-orange-500'
                        )}
                      />
                      <span className="font-medium">{transaction.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell>
                    <div className="items-center gap-2">
                      <span className="text-muted-foreground text-sm">{transaction.executionDate}</span>
                      <div className="flex items-center gap-1.5">
                        {getTimeIcon(transaction.daysRemaining, transaction.isDueToday)}
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(
                            transaction.daysRemaining,
                            transaction.isDueToday,
                            transaction.executionDate
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      ${transaction.totalAmount} {transaction.currency}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{transaction.members}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">{transaction.network}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {!transaction.isComplete && (
                        <Button variant="default" size="sm">
                          Execute Now
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      {transaction.isComplete ? (
                        <Button variant="outline" size="sm">
                          Re-action
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <IconTrash className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{' '}
            {filteredTransactions.length} transactions
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  )
}
