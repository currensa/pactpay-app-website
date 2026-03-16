import apis from '@/apis'
import { MembersResponse } from '@/apis/orgnization.api'
import type { TransactionItem } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import { CreateTransactionDialogContent } from '@/views/transaction/components'
import { IconArrowLeft } from '@tabler/icons-react'
import { formatUnits } from 'ethers'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

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

  const { getTokenDecimals } = useChainAssetStore()

  const fetchOrganizationMembers = async () => {
    try {
      setMembersLoading(true)
      const response = await apis.organization.getOrganizationMembers({ page: 1, pageSize: 100, status: 'active' })
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

  useEffect(() => {
    if (!isCreatingFromReaction || !reactionSourceTransactionId) return
    const fetchReactionSource = async () => {
      try {
        setReactionSourceLoading(true)
        const plan = await apis.transaction.getTransactionPlanDetail(reactionSourceTransactionId)
        const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress || '')
        const convertedItems: TransactionItem[] = (plan.items ?? []).map(item => ({
          ...item,
          amount: formatUnits(BigInt(item.amount || '0'), decimals),
        }))
        setReactionSourceMembers(convertedItems)
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

  const handleBack = () => navigate('/orgs/transaction')
  const handleCancel = () => navigate('/orgs/transaction')

  const handleCreateTransaction = async (params: {
    selectedMembers: Set<string>
    memberAmounts: Record<string, string>
    transactionName: string
    executionDate: string
  }) => {
    try {
      const members = Array.from(params.selectedMembers).map(memberId => {
        const member = organizationMembers.find(m => m.id === memberId)
        if (!member) throw new Error(`Member ${memberId} not found`)
        return {
          memberId: member.memberId,
          amount: params.memberAmounts[memberId] || '0',
        }
      })

      await apis.transaction.createTransactionPlan({
        payPeriod: params.executionDate ? new Date(params.executionDate).toISOString() : new Date().toISOString(),
        transactionName: params.transactionName || 'New Transaction',
        members
      })

      toast({
        title: 'Success',
        description: isCreatingFromReaction
          ? 'New transaction created from re-action'
          : 'Transaction created successfully'
      })
      navigate('/orgs/transaction')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to create transaction. Please try again.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
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
    </div>
  )
}
