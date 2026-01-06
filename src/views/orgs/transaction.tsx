import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import { TransactionItem, TransactionPlan } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Provider, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import Safe from '@safe-global/protocol-kit'
import { IconAlertTriangle, IconCalendar, IconFlame, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface Transaction {
  id: string
  name: string
  type: string
  status: 'ready' | 'pending' | 'complete'
  executionDate: string
  daysRemaining: number | null
  isDueToday: boolean
  totalAmount: string
  currency: string
  members: number
  network: string
  isComplete: boolean,
  paymentAccount?:{
    id: string
    type: string
    config: {
      nonce: number
      owners: string[]
      address: string
      network: string
      version: string
      threshold: number
    }
  }
}

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

function formatWalletAddress(address: string): string {
  if (address.length <= 10) return address
  // 格式: 0x1234...7890 (前6个字符 + ... + 后4个字符)
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 获取今天的日期（YYYY-MM-DD 格式）
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [memberServiceFees, setMemberServiceFees] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(1)
  const [transactionName, setTransactionName] = useState('')
  const [executionDate, setExecutionDate] = useState('')

  // Execute Now 相关状态
  const [executeConfirmDialogOpen, setExecuteConfirmDialogOpen] = useState(false)
  const [executingTransaction, setExecutingTransaction] = useState<Transaction | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeSuccessDialogOpen, setExecuteSuccessDialogOpen] = useState(false)
  const [createdTransactionId, setCreatedTransactionId] = useState<string>('')

  // Transaction 详情弹窗状态
  const [transactionDetailDialogOpen, setTransactionDetailDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [selectedTransactionMembers, setSelectedTransactionMembers] = useState<TransactionMember[]>([])

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
    let status: 'ready' | 'pending' | 'complete' = 'pending'
    if (plan.transactionStatus === 'success') {
      status = 'complete'
    } else if (plan.transactionStatus === 'draft') {
      status = 'ready'
    } else {
      status = 'pending'
    }

    return {
      id: plan.id,
      name: plan.transactionName,
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

  // 计算总金额
  const totalAmount = useMemo(() => {
    let total = 0
    selectedMembers.forEach(memberId => {
      const fee = memberServiceFees[memberId] || '0'
      total += parseFloat(fee) || 0
    })
    return total
  }, [selectedMembers, memberServiceFees])

  // 获取选中的成员列表
  const selectedMembersList = useMemo(() => {
    return organizationMembers.filter(member => selectedMembers.has(member.id))
  }, [selectedMembers, organizationMembers])

  // 初始化服务费数据
  useEffect(() => {
    if (addTransactionDialogOpen) {
      // 如果是 Re-action，预填充数据
      if (isCreatingFromReaction && transactionToReaction) {
        // 异步加载成员数据
        getTransactionMembers(transactionToReaction.id).then(transactionMembers => {
          const memberIds = new Set<string>(transactionMembers.map(m => m.id))

          // 预填充选中的成员
          setSelectedMembers(memberIds)

          // 预填充服务费（使用原 Transaction 的金额）
          const initialFees: Record<string, string> = {}
          transactionMembers.forEach(member => {
            // 如果原 Transaction 的金额与成员默认 Service Fee 不同，使用原金额
            // 这里简化处理，使用成员的 serviceFee
            initialFees[member.id] = member.serviceFee
          })
          setMemberServiceFees(initialFees)
        })

        // 预填充 Transaction Name
        setTransactionName(`${transactionToReaction.name} (Re-action)`)

        // 从 Step 2 开始
        setCurrentStep(2)
        setExecutionDate('')
      } else {
        // 正常创建流程
        const initialFees: Record<string, string> = {}
        organizationMembers.forEach(member => {
          initialFees[member.id] = member.serviceFee
        })
        setMemberServiceFees(initialFees)
        setSelectedMembers(new Set())
        setCurrentStep(1)
        setTransactionName('')
        setExecutionDate('')
      }
    }
  }, [addTransactionDialogOpen, isCreatingFromReaction, transactionToReaction])

  // 处理成员选择
  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  // 全选
  const handleSelectAll = () => {
    if (selectedMembers.size === organizationMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(organizationMembers.map(m => m.id)))
    }
  }

  // 反选
  const handleInvertSelection = () => {
    const newSelected = new Set<string>()
    organizationMembers.forEach(member => {
      if (!selectedMembers.has(member.id)) {
        newSelected.add(member.id)
      }
    })
    setSelectedMembers(newSelected)
  }

  // 更新服务费
  const handleServiceFeeChange = (memberId: string, value: string) => {
    setMemberServiceFees(prev => ({
      ...prev,
      [memberId]: value
    }))
  }

  // 处理下一步
  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2)
    }
  }

  // 处理取消
  const handleCancel = () => {
    setAddTransactionDialogOpen(false)
    setCurrentStep(1)
    setSelectedMembers(new Set())
    setTransactionName('')
    setExecutionDate('')
  }

  // 处理上一步
  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  // 格式化日期显示
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year} / ${month} / ${day}`
  }

  // 处理 Execute Now 点击
  const handleExecuteNow = (transaction: Transaction) => {
    console.log(transaction);
    if (transaction.status === "ready") {
      setExecutingTransaction(transaction)
      setExecuteConfirmDialogOpen(true)
    }else if(transaction.status === "pending") {
      handleGoToSafeWallet(transaction)
    }else{

    }
    
  }

  // 处理 View Details 点击
  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setTransactionDetailDialogOpen(true)
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
  const handleCreateTransaction = async () => {
    try {
      // 构建成员数据
      const members = Array.from(selectedMembers).map(memberId => {
        const fee = memberServiceFees[memberId] || '0'
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
        payPeriod: executionDate ? new Date(executionDate).toISOString() : new Date().toISOString(),
        paymentAccountId: 1, // TODO: 需要从组织配置中获取
        transactionName: transactionName || 'New Transaction',
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
      setCurrentStep(1)
      setSelectedMembers(new Set())
      setTransactionName('')
      setExecutionDate('')

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
        if (!transaction?.paymentAccount) {
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
        await apis.transaction.proposeTransaction(transaction.id, {
          signature:signature,
          signerAddress:address || '',
        })

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

  // 跳转到 Safe Wallet
  const handleGoToSafeWallet = (transaction: Transaction) => {
    // TODO: 步骤 4: 跳转 Safe Wallet（手动）
    // - 用户点击 "Go to Safe Wallet"
    // - 浏览器打开新标签页，跳转到 Safe Wallet
    // - Safe Wallet URL 直接定位到对应的 transaction
    // const safeWalletUrl = `https://app.safe.global/transactions/tx?id=${createdTransactionId}`
    // window.open(safeWalletUrl, '_blank')

    setExecuteSuccessDialogOpen(false)
    setExecutingTransaction(null)
    setCreatedTransactionId('')
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
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <DialogTitle>Create New Transaction</DialogTitle>
          </DialogHeader>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-4 pb-6">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  currentStep === 1
                    ? 'bg-primary text-primary-foreground'
                    : isCreatingFromReaction
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isCreatingFromReaction && currentStep === 2 ? '✓' : '1'}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  currentStep === 1 || isCreatingFromReaction ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                Select Members & Set Amounts
              </span>
            </div>
            <div className="bg-border h-px flex-1" />
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                  currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                2
              </div>
              <span
                className={cn('text-sm font-medium', currentStep === 2 ? 'text-foreground' : 'text-muted-foreground')}
              >
                Choose Date & Preview
              </span>
            </div>
          </div>

          {/* 第一步：选择成员和设置金额 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* 选择控制按钮 */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleInvertSelection}>
                  Invert Selection
                </Button>
              </div>

              {/* 成员表格 */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>MEMBER</TableHead>
                      <TableHead>EMAIL</TableHead>
                      <TableHead>ROLE</TableHead>
                      <TableHead>SERVICE FEE</TableHead>
                      <TableHead>WALLET ADDRESS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                            Loading members...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : organizationMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                          No members found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      organizationMembers.map(member => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedMembers.has(member.id)}
                              onChange={() => handleMemberToggle(member.id)}
                              className="border-input accent-primary h-4 w-4 cursor-pointer rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="text-muted-foreground">{member.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={memberServiceFees[member.id] || ''}
                                onChange={e => handleServiceFeeChange(member.id, e.target.value)}
                                className="w-24"
                                placeholder="0"
                              />
                              <span className="text-muted-foreground text-sm">USDC</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {formatWalletAddress(member.walletAddress)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 第二步：选择日期和预览 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* 输入字段 */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Transaction Name */}
                <div className="space-y-2">
                  <Label htmlFor="transaction-name">Transaction Name</Label>
                  <Input
                    id="transaction-name"
                    placeholder="Enter transaction name."
                    value={transactionName}
                    onChange={e => setTransactionName(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Give this transaction a descriptive name for easy identification.
                  </p>
                </div>

                {/* Execution Date */}
                <div className="space-y-2">
                  <Label htmlFor="execution-date">Execution Date</Label>
                  <div className="relative">
                    <Input
                      id="execution-date"
                      type="date"
                      placeholder="年 / 月 / 日"
                      value={executionDate}
                      onChange={e => setExecutionDate(e.target.value)}
                      min={getTodayDate()}
                      className="pr-10"
                    />
                    <IconCalendar className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Select the date when this transaction should be executed. Cannot select past dates.
                  </p>
                </div>
              </div>

              {/* 摘要面板 */}
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Transaction Name:</span>
                  <span className="text-sm font-medium">{transactionName || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Selected Members:</span>
                  <span className="text-sm font-medium">{selectedMembers.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Execution Date:</span>
                  <span className="text-sm font-medium">
                    {executionDate ? formatDateForDisplay(executionDate) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Total Amount:</span>
                  <span className="text-sm font-medium">{totalAmount.toLocaleString()} USDC</span>
                </div>
              </div>

              {/* 成员详情 */}
              <div className="space-y-3">
                <h3 className="text-muted-foreground text-sm font-medium uppercase">Member Details</h3>
                <div className="space-y-2">
                  {selectedMembersList.map(member => {
                    const fee = memberServiceFees[member.id] || '0'
                    // Charlie Brown 显示 "Original"，其他显示 "Service Fee"
                    const label = member.name === 'Charlie Brown' ? 'Original' : 'Service Fee'
                    return (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {label}: {parseFloat(fee).toLocaleString()} USDC
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {currentStep === 1 && (
              <Button onClick={handleNext} disabled={selectedMembers.size === 0}>
                Next
              </Button>
            )}
            {currentStep === 2 && (
              <>
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
                <Button onClick={handleCreateTransaction} disabled={!transactionName || !executionDate}>
                  Create Transaction
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Now - 确认弹窗 */}
      <Dialog open={executeConfirmDialogOpen} onOpenChange={setExecuteConfirmDialogOpen}>
        <DialogContent>
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
                <IconAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
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
            <Button variant="outline" onClick={() => setExecuteConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmExecute}>Execute</Button>
          </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Created on Safe Wallet</DialogTitle>
            <DialogDescription>Your transaction has been successfully created on Safe Wallet.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 成功提示 */}
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600">✓</div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900">Transaction Created Successfully</p>
                <p className="text-xs text-green-800">
                  The transaction has been proposed on Safe Wallet. You can now review and execute it.
                </p>
              </div>
            </div>

            {/* Transaction ID */}
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Transaction ID:</span>
                <span className="font-mono text-sm font-medium">{createdTransactionId}</span>
              </div>
            </div>

            {/* 下一步操作提示 */}
            <div className="text-muted-foreground text-sm">
              <p className="mb-1 font-medium">Next Steps:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Go to Safe Wallet to review the transaction</li>
                <li>Sign and execute the transaction</li>
                <li>Wait for the transaction to be confirmed on the blockchain</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleDoItLater}>
              I'll do it later
            </Button>
            <Button onClick={handleGoToSafeWallet}>Go to Safe Wallet</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction 详情弹窗 */}
      <Dialog open={transactionDetailDialogOpen} onOpenChange={setTransactionDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {selectedTransaction && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <DialogTitle>{selectedTransaction.name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* 交易信息 */}
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedTransaction.executionDate}</span>
                      {selectedTransaction.isDueToday && (
                        <Badge variant="warning" className="text-xs">
                          Due Today
                        </Badge>
                      )}
                    </div>
                    <div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {selectedTransaction.network}
                      </Badge>
                    </div>
                    <div>{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                  {!selectedTransaction.isComplete && (
                    <Button variant="default" onClick={() => handleExecuteNow(selectedTransaction)}>
                      Execute Now
                    </Button>
                  )}
                </div>

                {/* 摘要卡片 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-muted-foreground text-sm">Member Count</p>
                    <p className="mt-1 text-2xl font-semibold">{selectedTransaction.members}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-muted-foreground text-sm">Total Amount</p>
                    <p className="mt-1 text-2xl font-semibold">
                      ${selectedTransaction.totalAmount} {selectedTransaction.currency}
                    </p>
                  </div>
                </div>

                {/* 成员详情表格 */}
                <div className="space-y-3">
                  <h3 className="text-muted-foreground text-sm font-medium uppercase">Member Details</h3>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>MEMBER</TableHead>
                          <TableHead>EMAIL</TableHead>
                          <TableHead>ROLE</TableHead>
                          <TableHead>WALLET ADDRESS</TableHead>
                          <TableHead className="text-right">AMOUNT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransactionMembers.length > 0 ? (
                          selectedTransactionMembers.map(member => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">{member.name}</TableCell>
                              <TableCell className="text-muted-foreground">{member.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {member.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-sm">
                                {formatWalletAddress(member.walletAddress)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {parseFloat(member.serviceFee).toLocaleString()} {selectedTransaction.currency}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                              Loading members...
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {transactionToDelete && (
            <div className="space-y-4 py-4">
              {/* Transaction 摘要 */}
              <div className="bg-muted space-y-2 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Transaction Name:</span>
                  <span className="text-sm font-medium">{transactionToDelete.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Transaction ID:</span>
                  <span className="font-mono text-sm font-medium">{transactionToDelete.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Members:</span>
                  <span className="text-sm font-medium">{transactionToDelete.members}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Total Amount:</span>
                  <span className="text-sm font-medium">
                    ${transactionToDelete.totalAmount} {transactionToDelete.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmDialogOpen(false)
                setTransactionToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
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
