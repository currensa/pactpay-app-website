import apis from '@/apis'
import { MembersResponse } from '@/apis/orgnization.api'
import type { TransactionItem } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { CreateTransactionDialogContent } from '@/views/transaction/components'
import { IconArrowLeft } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InsufficientBalanceDialog } from './components/insufficient-balance-dialog'

export default function CreateTransaction() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const isCreatingFromReaction = searchParams.get('fromReaction') === '1'
  const reactionSourceTransactionId = searchParams.get('transactionId') ?? ''

  const [organizationMembers, setOrganizationMembers] = useState<MembersResponse['data']>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [reactionSourceMembers, setReactionSourceMembers] = useState<TransactionItem[]>([])
  const [reactionSourceLoading, setReactionSourceLoading] = useState(false)
  const [initialExecutionDate, setInitialExecutionDate] = useState<string>('')
  const [insufficientBalanceDialogOpen, setInsufficientBalanceDialogOpen] = useState(false)
  const [balanceCheckData, setBalanceCheckData] = useState<{
    currentBalance: number
    requiredAmount: number
    currency: string
    walletAddress: string
    executionDate: string
  } | null>(null)

  const fetchOrganizationMembers = async () => {
    try {
      setMembersLoading(true)
      const response = await apis.organization.getOrganizationMembers(1, 100)
      setOrganizationMembers(response.data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load organization members.',
        variant: 'destructive'
      })
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizationMembers()
  }, [])

  // Re-action 时根据 URL 中的 transactionId 拉取原交易详情，用于回填成员与金额
  useEffect(() => {
    if (!isCreatingFromReaction || !reactionSourceTransactionId) return
    const fetchReactionSource = async () => {
      try {
        setReactionSourceLoading(true)
        const plan = await apis.transaction.getTransactionPlanDetail(reactionSourceTransactionId)
        setReactionSourceMembers((plan.items ?? []) as TransactionItem[])
        if (plan.payPeriod) {
          const d = new Date(plan.payPeriod)
          setInitialExecutionDate(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          )
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load source transaction for re-action.',
          variant: 'destructive'
        })
      } finally {
        setReactionSourceLoading(false)
      }
    }
    fetchReactionSource()
  }, [isCreatingFromReaction, reactionSourceTransactionId, toast])

  const handleBack = () => {
    navigate('/orgs/transaction')
  }

  const handleCancel = () => {
    navigate('/orgs/transaction')
  }

  const handleCreateTransaction = async (params: {
    selectedMembers: Set<string>
    memberServiceFees: Record<string, string>
    memberCurrencies: Record<string, string>
    transactionName: string
    executionDate: string
  }) => {
    try {
      const members = Array.from(params.selectedMembers).map(memberId => {
        const member = organizationMembers.find(m => m.id === memberId)
        if (!member) throw new Error(`Member ${memberId} not found`)
        const fee = params.memberServiceFees[memberId] || '0'
        return {
          memberId: member.memberId,
          receivingAccountId: Number(member.receivingAccounts[0].id),
          amount: fee,
          currency: params.memberCurrencies[memberId] || 'USDC'
        }
      })

      const paymentAccounts = await apis.organization.getOrganizationPaymentAccounts()
      const payload = {
        payPeriod: params.executionDate ? new Date(params.executionDate).toISOString() : new Date().toISOString(),
        paymentAccountId: Number(paymentAccounts.list[0].id),
        transactionName: params.transactionName || 'New Transaction',
        members
      }

      const createResult = await apis.transaction.createTransactionPlan(payload)

      // 获取交易计划详情
      const transactionPlan = await apis.transaction.getTransactionPlanDetail(createResult.batchId)

      // 计算总费用：按币种分组
      const SERVICE_FEE_GAS_PER_MEMBER = 10
      const amountByCurrency: Record<string, number> = {}

      // 计算每种币的总金额
      transactionPlan.items.forEach(item => {
        const currency = item.currency
        const amount = parseFloat(item.amount)
        amountByCurrency[currency] = (amountByCurrency[currency] || 0) + amount
      })

      // 获取稳定币信息（用于服务费 gas）
      const orgAssetsChains = await apis.chainAsset.getOrgAssetsChains()
      const stableAsset = orgAssetsChains.find(item => item.asset?.isStable === true)
      const totalServiceFeeGas = params.selectedMembers.size * SERVICE_FEE_GAS_PER_MEMBER

      if (stableAsset) {
        const stableCurrency = stableAsset.asset.symbol
        amountByCurrency[stableCurrency] = (amountByCurrency[stableCurrency] || 0) + totalServiceFeeGas
      }

      // 检查每种币的余额
      for (const [currency, requiredAmount] of Object.entries(amountByCurrency)) {
        const balance = await apis.transaction.getPaymentAccountBalance(
          Number(paymentAccounts.list[0].id),
          currency
        )
        const currentBalance = parseFloat(balance.balanceFormatted)

        if (currentBalance < requiredAmount) {
          // 余额不足，显示弹窗
          setBalanceCheckData({
            currentBalance,
            requiredAmount,
            currency,
            walletAddress: transactionPlan.paymentAccount.config.address,
            executionDate: params.executionDate
          })
          setInsufficientBalanceDialogOpen(true)
          return
        }
      }

      // 余额充足，显示成功消息并跳转
      const successMessage = isCreatingFromReaction
        ? 'New transaction created from re-action'
        : 'Transaction created successfully'
      toast({
        title: 'Success',
        description: successMessage
      })

      navigate('/orgs/transaction')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create transaction. Please try again.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 左上角 Back 按钮 + 标题 */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0" aria-label="Back">
          <IconArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">Create New Transaction</h1>
      </div>

      <div className="flex-1">
        <CreateTransactionDialogContent
          variant="page"
          isCreatingFromReaction={isCreatingFromReaction}
          organizationMembers={organizationMembers}
          membersLoading={membersLoading}
          transactionDetailMembers={reactionSourceMembers}
          initialExecutionDate={initialExecutionDate}
          reactionSourceLoading={reactionSourceLoading}
          onCancel={handleCancel}
          onCreateTransaction={handleCreateTransaction}
        />
      </div>

      {/* 余额不足弹窗 */}
      {balanceCheckData && (
        <InsufficientBalanceDialog
          open={insufficientBalanceDialogOpen}
          onClose={() => {
            setInsufficientBalanceDialogOpen(false)
            navigate('/orgs/transaction')
          }}
          currentBalance={balanceCheckData.currentBalance}
          requiredAmount={balanceCheckData.requiredAmount}
          currency={balanceCheckData.currency}
          walletAddress={balanceCheckData.walletAddress}
          executionDate={balanceCheckData.executionDate}
        />
      )}
    </div>
  )
}
