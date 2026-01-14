import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { TransactionItem, TransactionPlan } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Provider, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import Safe from '@safe-global/protocol-kit'
import { IconAlertTriangle, IconFlame, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreateTransactionDialogContent,
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  TransactionDetailDialogContent,
} from './components'
import type { Transaction } from './components/transaction/types'


interface TransactionMember {
  id: string
  name: string
  email: string
  role: string
  serviceFee: string
  walletAddress: string
}

function getStatusBadge(status: Transaction['status']) {
  switch (status) {
    case 'ready':
      return <Badge variant="default">Ready</Badge>
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

// 模拟成员数据
// 将 OrganizationMember 转换为 TransactionMember
function transformOrganizationMemberToTransactionMember(member: OrganizationMember): TransactionMember {
  const primaryRole = member.roles?.[0]?.role || 'Member'
  const receivingAccount = member.receivingAccounts?.[0]
  const payoutIntent = member.payoutIntent

  return {
    id: member.memberId,
    name: member.showName,
    email: member.showName.includes('@') ? member.showName : '',
    role: primaryRole.toLowerCase(),
    serviceFee: payoutIntent ? payoutIntent.amount : '0',
    walletAddress: receivingAccount?.config?.address || ''
  }
}




async function signSafeTxHash(safeTxHash: string, walletProvider: Provider) {

  walletProvider.request({
    "method": "wallet_switchEthereumChain",
    "params": [
      {
        chainId: '0xaa36a7'
      }
    ]
  })
  const protocolKit = await Safe.init({
    provider: walletProvider,
    safeAddress: '0xe2E3173A0E55Ea761b29D80c5ABc697eD9882Be3'
  })


  const signature = await protocolKit.signHash(
    safeTxHash
  )

  // const recoveredAddress = ethers.verifyMessage(getBytes(safeTxHash), signature)
  // console.log('recoveredAddress:',recoveredAddress);
  

  return {
    signature:signature.data
  }
}

export default function Transaction() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false)

  // Execute Now 相关状态
  const [executeConfirmDialogOpen, setExecuteConfirmDialogOpen] = useState(false)
  const [executingTransaction, setExecutingTransaction] = useState<Transaction | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeSuccessDialogOpen, setExecuteSuccessDialogOpen] = useState(false)
  const [createdTransactionId, setCreatedTransactionId] = useState<string>('')

  // Transaction 详情弹窗状态
  const [transactionDetailDialogOpen, setTransactionDetailDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [transactionDetailMembers, setTransactionDetailMembers] = useState<TransactionItem[]>([])

  // 删除 Transaction 相关状态
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Re-action 相关状态
  const [reactionConfirmDialogOpen, setReactionConfirmDialogOpen] = useState(false)
  const [transactionToReaction, setTransactionToReaction] = useState<Transaction | null>(null)
  const [isCreatingFromReaction, setIsCreatingFromReaction] = useState(false)

  // 使用 state 管理 transactions，以便删除后可以更新
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // 成员列表状态
  const [organizationMembers, setOrganizationMembers] = useState<TransactionMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const itemsPerPage = 10

  const {address } =  useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>("eip155");

  // 获取组织成员列表
  const fetchOrganizationMembers = async () => {
    try {
      setMembersLoading(true)
      const response = await apis.organization.getOrganizationMembers(1, 100) // 获取所有成员
      const transformedMembers = response.data.map(transformOrganizationMemberToTransactionMember)
      setOrganizationMembers(transformedMembers)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load organization members.',
        variant: 'destructive'
      })
    } finally {
      setMembersLoading(false)
    }
  }

  // 初始化时加载成员列表
  useEffect(() => {
    fetchOrganizationMembers()
  }, [])

  // 将 API 返回的 TransactionPlan 转换为组件需要的 Transaction 格式
  const transformTransactionPlan = (plan: TransactionPlan): Transaction => {
    const payPeriodDate = new Date(plan.payPeriod)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    payPeriodDate.setHours(0, 0, 0, 0)

    const diffTime = payPeriodDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const totalAmount = plan.items.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0)
    const isComplete = plan.transactionStatus === 'success'
    const isDueToday = diffDays === 0 && !isComplete

    // 映射状态
    let status: Transaction['status'] = 'draft'
     if (plan.transactionStatus === 'draft') {
      status = 'draft'
    } else if( [ 'proposed','confirming'].includes(plan.transactionStatus)){
      status = 'pending'
    } else if (plan.transactionStatus === 'ready') {
      status = 'ready'
    } else if (plan.transactionStatus === 'success') {
      status = 'complete'
    } 

    return {
      id: plan.id,
      name: plan.transactionName,
      transactionId:plan.transactionId,
      type:plan.transactionType,
      status,
      executionDate: payPeriodDate
        .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\//g, '/'),
      daysRemaining: isComplete ? null : diffDays,
      isDueToday,
      totalAmount: totalAmount.toLocaleString(),
      currency: plan.items[0]?.currency || 'USDC',
      members: plan.items.length,
      network: plan.paymentAccount?.config?.network === '11155111' ? 'Ethereum' : 'Ethereum',
      isComplete,
      paymentAccount: plan.paymentAccount
    }
  }

  // 将 TransactionItem 转换为 TransactionMember
  const transformTransactionItem = (item: TransactionItem): TransactionMember => {
    return {
      id: item.memberId,
      name: item.member.showName,
      email: item.member.showName.includes('@') ? item.member.showName : '',
      role: 'member', // 需要从其他地方获取角色信息
      serviceFee: item.amount,
      walletAddress: item.receivingConfig?.address || item.receivingAccount?.config?.address || ''
    }
  }

  // 获取交易计划列表
  const fetchTransactionPlans = async () => {
    try {
      setLoading(true)
      const response = await apis.transaction.getTransactionPlans()
      const transformedTransactions = response.data.map(transformTransactionPlan)
      setTransactions(transformedTransactions)
      setTotalPages(Math.ceil(response.total / itemsPerPage))
      setTotalCount(response.total)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transactions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 初始化和刷新数据
  useEffect(() => {
    fetchTransactionPlans()
  }, [currentPage])
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTransactionPlans()
    }, 2000)
    return () => clearInterval(intervalId)
  }, [])
  // 当搜索或筛选变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  // 根据交易 ID 获取成员列表
  const [transactionDetails, setTransactionDetails] = useState<Record<string, TransactionPlan>>({})

  const getTransactionMembers = async (transactionId: string): Promise<TransactionMember[]> => {
    try {
      // 如果已经缓存，直接返回
      if (transactionDetails[transactionId]) {
        return transactionDetails[transactionId].items.map(transformTransactionItem)
      }

      // 否则获取详情
      const detail = await apis.transaction.getTransactionPlanDetail(transactionId)
      setTransactionDetails(prev => ({ ...prev, [transactionId]: detail }))
      return detail.items.map(transformTransactionItem)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load transaction details.',
        variant: 'destructive'
      })
      return []
    }
  }



  // 处理对话框打开时的初始化
  useEffect(() => {
    if (!addTransactionDialogOpen) {
      // 对话框关闭时重置状态
      setIsCreatingFromReaction(false)
      setTransactionToReaction(null)
    }
  }, [addTransactionDialogOpen])

  // 处理取消
  const handleCancel = () => {
    setAddTransactionDialogOpen(false)
    setIsCreatingFromReaction(false)
    setTransactionToReaction(null)
  }


  // 处理 Execute Now 点击
  const handleExecuteNow = (transaction: Transaction) => {
    console.log(transaction);
    if (transaction.status === "draft") {
      setExecutingTransaction(transaction)
      setExecuteConfirmDialogOpen(true)
    }else if(["pending","ready"].includes(transaction.status)) {
      handleGoToSafeWalletPagePage(transaction)
    }else{
      // handleGoToSafeWalletPagePage(transaction)
    }
    
  }

  // 处理 View Details 点击
  const handleViewDetails = async (transaction: Transaction) => {
    try {
      // 获取完整的交易详情
      const transactionPlanDetail = await apis.transaction.getTransactionPlanDetail(transaction.id)
      console.log('Transaction plan detail:', transactionPlanDetail)

      // 设置交易和成员信息
      setSelectedTransaction(transaction)
      setTransactionDetailMembers(transactionPlanDetail.items)
      setTransactionDetailDialogOpen(true)
    } catch (error: any) {
      console.error('Failed to get transaction detail:', error)
      toast({
        description: `Failed to get transaction detail: ${error.message}`,
        variant: 'destructive'
      })
    }
  }

  // 处理删除按钮点击
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction)
    setDeleteConfirmDialogOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return

    setIsDeleting(true)
    try {
      await apis.transaction.deleteTransactionPlan(transactionToDelete.id)

      // 从列表中移除
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id))
      setTotalCount(prev => prev - 1)

      // 显示成功提示
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully'
      })

      setDeleteConfirmDialogOpen(false)
      setTransactionToDelete(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete transaction. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 处理 Re-action 点击
  const handleReactionClick = (transaction: Transaction) => {
    setTransactionToReaction(transaction)
    setReactionConfirmDialogOpen(true)
  }

  // 确认 Re-action
  const handleConfirmReaction = () => {
    if (!transactionToReaction) return

    setReactionConfirmDialogOpen(false)
    setIsCreatingFromReaction(true)
    setAddTransactionDialogOpen(true)
  }

  // 处理创建 Transaction（包括 Re-action）
  const handleCreateTransaction = async (params: {
    selectedMembers: Set<string>
    memberServiceFees: Record<string, string>
    transactionName: string
    executionDate: string
  }) => {
    try {
      // 构建成员数据
      const members = Array.from(params.selectedMembers).map(memberId => {
        const fee = params.memberServiceFees[memberId] || '0'
        // TODO: 需要从组织成员 API 获取 receivingAccountId
        // 这里暂时使用模拟数据
        return {
          memberId,
          receivingAccountId: 1, // 需要从成员数据中获取
          amount: fee,
          currency: 'USDC'
        }
      })

      // 构建创建请求
      const payload = {
        payPeriod: params.executionDate ? new Date(params.executionDate).toISOString() : new Date().toISOString(),
        paymentAccountId: 1, // TODO: 需要从组织配置中获取
        transactionName: params.transactionName || 'New Transaction',
        members
      }

      await apis.transaction.createTransactionPlan(payload)

      // 显示成功提示
      const successMessage = isCreatingFromReaction
        ? 'New transaction created from re-action'
        : 'Transaction created successfully'
      toast({
        title: 'Success',
        description: successMessage
      })

      // 关闭 Modal 并重置状态
      setAddTransactionDialogOpen(false)
      setIsCreatingFromReaction(false)
      setTransactionToReaction(null)

      // 刷新列表
      await fetchTransactionPlans()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create transaction. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // 确认执行
  const handleConfirmExecute = async () => {
    if (!executingTransaction) return

    setExecuteConfirmDialogOpen(false)
    setIsExecuting(true)

    try {
      // TODO: 调用 Safe Wallet API 提交 propose
      // 步骤 2: 提交 Propose（自动）
      // - 调用 Safe Wallet API 提交 propose
      // - 客户自己支付 gas 费用
      // - Safe Wallet 创建对应的 transaction
      // const transactionId = await safeWalletApi.proposeTransaction(...)
      if(executingTransaction.type === "safe_wallet"){
        await proposeSafeTransaction(executingTransaction)
      }


      //

      setIsExecuting(false)
      setExecuteSuccessDialogOpen(true)
    } catch (error) {
      setIsExecuting(false)
      toast({
        title: 'Error',
        description: 'Failed to create transaction on Safe Wallet. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const proposeSafeTransaction = async (transaction: Transaction) => {
      try {
        // 1. 获取完整的交易详情
        const transactionPlanDetail = await apis.transaction.getTransactionPlanDetail(transaction.id)
        console.log('Transaction plan detail:', transactionPlanDetail)

        if (!transactionPlanDetail?.paymentAccount) {
          throw new Error('Payment account not found')
        }

        // 2. 调用 API 执行 获取safeTxHash
        const {txHash} = await apis.transaction.getTransactionHash(transaction.id)
        console.log('Transaction hash:', txHash)

        // 3. 使用 MetaMask 对 Safe 交易哈希进行签名
        const { signature } = await signSafeTxHash(txHash,walletProvider)
        console.log('Signer address:', address)
        console.log('Signature:', signature)
        // 4. 将签名提交给后端 (TODO: 需要添加 API)
        const {safeTxHash} = await apis.transaction.proposeTransaction(transaction.id, {
          signature:signature,
          signerAddress:address || '',
        })
        transaction.transactionId = safeTxHash
        // 5. 更新列表
        await fetchTransactionPlans()

        setCreatedTransactionId(txHash)

        toast({
          description: 'Transaction signed successfully!',
          variant: 'default'
        })

      } catch (error: any) {
        console.error('Failed to sign transaction:', error)

        if (error.name === 'UserRejectedRequestError') {
          toast({
            description: 'Transaction signing was cancelled.',
            variant: 'destructive'
          })
        } else {
          toast({
            description: `Failed to sign transaction: ${error.message}`,
            variant: 'destructive'
          })
        }
      }
  }

  const networkMap = new Map()
  networkMap.set('11155111', 'sep')

  // 跳转到应用内的 Transaction Detail 页面
  const handleGoToSafeWalletPagePage = async (transaction: Transaction) => {
    try {
      // 获取完整的交易详情以获取 chainId 与 transactionId
      const transactionPlanDetail = await apis.transaction.getTransactionPlanDetail(transaction.id)
      if (!transactionPlanDetail?.paymentAccount) {
        throw new Error('Payment account not found')
      }

      const chainId = transactionPlanDetail.paymentAccount.config.chainId
      const txHash = transactionPlanDetail.transactionId

      // 使用内部路由跳转到刚创建的页面，URL 格式：/orgs/transaction/detail/:chainId/:safeTxHash
      navigate(`/transaction/${encodeURIComponent(String(chainId))}/${encodeURIComponent(String(txHash))}`)

      // 关闭/重置当前弹窗/状态
      setExecuteSuccessDialogOpen(false)
      setExecutingTransaction(null)
      setCreatedTransactionId('')
    } catch (error: any) {
      console.error('Failed to get transaction detail:', error)
      toast({
        description: `Failed to get transaction detail: ${error?.message || error}`,
        variant: 'destructive'
      })
    }
  }

  // 稍后处理
  const handleDoItLater = () => {
    setExecuteSuccessDialogOpen(false)
    setExecutingTransaction(null)
    setCreatedTransactionId('')

    // TODO: 步骤 6: 状态更新
    // - PactPay 同步 Safe Wallet API 检查执行状态
    // - 执行成功后:
    //   - Toast: "Transaction executed successfully on Safe Wallet."
    //   - Transaction 状态更新为 "complete"
    //   - 更新列表显示
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // 计算分页
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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

            <Button onClick={() => setAddTransactionDialogOpen(true)}>
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
                        <Button variant="default" size="sm" onClick={() => handleExecuteNow(transaction)}>
                          Execute Now
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(transaction)}>
                        View Details
                      </Button>
                      {transaction.isComplete ? (
                        <Button variant="outline" size="sm" onClick={() => handleReactionClick(transaction)}>
                          Re-action
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(transaction)}
                        >
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
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {totalCount} transactions
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* 新增交易对话框 */}
      <Dialog open={addTransactionDialogOpen} onOpenChange={setAddTransactionDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <CreateTransactionDialogContent
            isCreatingFromReaction={isCreatingFromReaction}
            organizationMembers={organizationMembers}
            membersLoading={membersLoading}
            transactionDetailMembers={transactionDetailMembers}
            onCancel={handleCancel}
            onCreateTransaction={handleCreateTransaction}
          />
        </DialogContent>
      </Dialog>

      {/* Execute Now - 确认弹窗 */}
      <Dialog open={executeConfirmDialogOpen} onOpenChange={setExecuteConfirmDialogOpen}>
        <DialogContent>
          <ExecuteConfirmDialogContent
            executingTransaction={executingTransaction}
            onCancel={() => setExecuteConfirmDialogOpen(false)}
            onConfirm={handleConfirmExecute}
          />
        </DialogContent>
      </Dialog>

      {/* Execute Now - Loading 状态 */}
      {isExecuting && (
        <Dialog open={isExecuting} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <IconLoader2 className="text-primary h-8 w-8 animate-spin" />
              <div className="text-center">
                <p className="font-medium">Creating transaction on Safe Wallet...</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Please wait while we submit the transaction proposal.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Execute Now - 成功提示弹窗 */}
      <Dialog open={executeSuccessDialogOpen} onOpenChange={setExecuteSuccessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <ExecuteSuccessDialogContent
            createdTransactionId={createdTransactionId}
            executingTransaction={executingTransaction}
            onDoItLater={handleDoItLater}
            onGoToSafeWallet={handleGoToSafeWalletPagePage}
          />
        </DialogContent>
      </Dialog>

      {/* Transaction 详情弹窗 */}
      <Dialog open={transactionDetailDialogOpen} onOpenChange={setTransactionDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <TransactionDetailDialogContent
            selectedTransaction={selectedTransaction}
            transactionDetailMembers={transactionDetailMembers}
            onExecuteNow={handleExecuteNow}
          />
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DeleteConfirmDialogContent
            transactionToDelete={transactionToDelete}
            isDeleting={isDeleting}
            onCancel={() => {
              setDeleteConfirmDialogOpen(false)
              setTransactionToDelete(null)
            }}
            onConfirm={handleConfirmDelete}
          />
        </DialogContent>
      </Dialog>

      {/* Re-action 确认弹窗 */}
      <Dialog open={reactionConfirmDialogOpen} onOpenChange={setReactionConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-action Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to create a new transaction based on this one? The original transaction will remain
              unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setReactionConfirmDialogOpen(false)
                setTransactionToReaction(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmReaction}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
