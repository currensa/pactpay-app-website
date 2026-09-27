import apis from '@/apis'
import { MembersResponse } from '@/apis/orgnization.api'
import type { CreatePrivacyDepositPlanResponseDto, TransactionItem } from '@/apis/transaction.api'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { naclEncrypt } from '@/lib/gravarc/naclCrypto'
import { payoutIntentMatchesToken } from '@/lib/gravarc/payrollTokenSelection'
import { useTranslation } from '@/utils/i18n'
import { CreateTransactionDialogContent } from '@/views/transaction/components'
import { formatUnits, parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export default function CreateTransaction() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()
  const isCreatingFromReaction = searchParams.get('fromReaction') === '1'
  const reactionSourceTransactionId = searchParams.get('transactionId') ?? ''
  const selectedTokenAddress = searchParams.get('tokenAddress') ?? ''

  const [organizationMembers, setOrganizationMembers] = useState<MembersResponse['data']>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [reactionSourceMembers, setReactionSourceMembers] = useState<TransactionItem[]>([])
  const [reactionSourceLoading, setReactionSourceLoading] = useState(false)
  const [initialExecutionDate, setInitialExecutionDate] = useState<string>('')
  const [reactionSourceCaipChainId, setReactionSourceCaipChainId] = useState<string>('')
  const [reactionSourceTokenAddress, setReactionSourceTokenAddress] = useState<string>('')
  const [accessChecked, setAccessChecked] = useState(false)
  const [, setCreatedPlan] = useState<CreatePrivacyDepositPlanResponseDto | null>(null)
  const payrollConfig = useOrganizationStore(state => state.payrollConfig)

  const { getTokenDecimals, getChainAssetByToken, fetchChainAssets } = useChainAssetStore()
  const membersForSelectedToken = useMemo(() => organizationMembers.map(member => ({
    ...member,
    payoutIntent: payoutIntentMatchesToken(member.payoutIntent, payrollConfig?.caipChainId ?? '', selectedTokenAddress)
      ? member.payoutIntent : null,
  })), [organizationMembers, payrollConfig?.caipChainId, selectedTokenAddress])

  useEffect(() => {
    let cancelled = false

    const ensurePayrollConfig = async () => {
      try {
        await useOrganizationStore.getState().fetchPayrollTokenSymbol()
        if (cancelled) return
        const latestPayrollConfig = useOrganizationStore.getState().payrollConfig
        if (!latestPayrollConfig) {
          navigate(`/orgs/transaction?setupPayroll=1`, {
            replace: true,
            state: { pendingCreatePath: `${location.pathname}${location.search}` },
          })
          return
        }
        if (!selectedTokenAddress || !useChainAssetStore.getState().getChainAssetByToken(latestPayrollConfig.caipChainId, selectedTokenAddress)) {
          navigate('/orgs/transaction/create?type=people', { replace: true })
          return
        }
        if (!cancelled) setAccessChecked(true)
      } catch {
        if (!cancelled) navigate('/orgs/transaction', { replace: true })
      }
    }

    ensurePayrollConfig()

    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, navigate, selectedTokenAddress])

  const fetchOrganizationMembers = async () => {
    try {
      setMembersLoading(true)
      const response = await apis.organization.getOrganizationMembers({ page: 1, pageSize: 100, status: 'active' })
      setOrganizationMembers(response.data)
    } catch (error) {
      toast({
        title: 'Payroll creation failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (!accessChecked) return
    fetchOrganizationMembers()
  }, [accessChecked])

  useEffect(() => {
    if (!accessChecked) return
    if (!isCreatingFromReaction || !reactionSourceTransactionId) return
    const fetchReactionSource = async () => {
      try {
        setReactionSourceLoading(true)
        await fetchChainAssets()
        const plan = await apis.transaction.getTransactionPlanDetail(reactionSourceTransactionId)
        const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress || '')
        const convertedItems: TransactionItem[] = (plan.items ?? []).map(item => ({
          ...item,
          amount: item.amount === null ? null : formatUnits(BigInt(item.amount), decimals),
        }))
        setReactionSourceMembers(convertedItems)
        setReactionSourceCaipChainId(plan.caipChainId)
        setReactionSourceTokenAddress(plan.tokenAddress || '')
        if (plan.payPeriod) {
          const d = new Date(plan.payPeriod)
          setInitialExecutionDate(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          )
        }
      } catch {
        // request interceptor handles API errors
      } finally {
        setReactionSourceLoading(false)
      }
    }
    fetchReactionSource()
  }, [accessChecked, fetchChainAssets, getTokenDecimals, isCreatingFromReaction, reactionSourceTransactionId, toast])

  if (!accessChecked) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[13px] text-[#8d8d93]">{t('common.loading')}</div>
      </div>
    )
  }

  const handleCancel = () => navigate('/orgs/transaction')

  const handleCreateTransaction = async (params: {
    selectedMembers: Set<string>
    memberAmounts: Record<string, string>
    transactionName: string
    executionDate: string
    privacyRefundable: boolean
  }) => {

    try {
      const payrollConfig = useOrganizationStore.getState().payrollConfig
      if (!payrollConfig) throw new Error('Payroll config not found')
      if (!getChainAssetByToken(payrollConfig.caipChainId, selectedTokenAddress)) throw new Error('Selected token is not configured for the Organization network')

      const decimals = getTokenDecimals(payrollConfig.caipChainId, selectedTokenAddress)
      const allocations = Array.from(params.selectedMembers).map(memberId => {
        const member = organizationMembers.find(m => m.id === memberId)
        if (!member) throw new Error(`Member ${memberId} not found`)
        if (!member.gravArcAddress) throw new Error(`Member ${member.showName} has no wallet address`)
        return {
          memberId: member.memberId,
          address: member.gravArcAddress,
          amount: parseUnits(params.memberAmounts[memberId] || '0', decimals).toString(),
        }
      }).filter(member => BigInt(member.amount) > 0n)
      if (!allocations.length) throw new Error('Add at least one positive payroll amount')
      const profile = localStorage.getItem('gravArcUserInfo')
      const encPubkey = profile ? (JSON.parse(profile) as { encPubkey?: string }).encPubkey : null
      if (!encPubkey) throw new Error('Set up your private wallet before creating payroll')
      const encryptedPlan = naclEncrypt(JSON.stringify({
        version: 2,
        orgId: localStorage.getItem('organizationId'),
        caipChainId: payrollConfig.caipChainId,
        tokenAddress: selectedTokenAddress,
        privacyRefundable: params.privacyRefundable,
        allocations,
      }), encPubkey.startsWith('0x') ? encPubkey.slice(2) : encPubkey)

      const plan = await apis.transaction.createPrivacyDepositPlan({
        caipChainId: payrollConfig.caipChainId,
        tokenAddress: selectedTokenAddress,
        transactionName: params.transactionName || t('pages.transactions.newTransaction'),
        payPeriod: params.executionDate ? new Date(params.executionDate).toISOString() : undefined,
        privacyRefundable: params.privacyRefundable,
        members: allocations.map(({ memberId }) => ({ memberId })),
        encryptedPlan,
      })
      setCreatedPlan(plan)

      toast({
        title: t('pages.orgMembers.success'),
        description: isCreatingFromReaction
          ? t('pages.transactions.reactionCreated')
          : t('pages.transactions.transactionCreated')
      })
      navigate('/orgs/transaction')
    } catch {
      // request interceptor handles API errors
    }
  }

  return (
    <div className="h-full">
      <CreateTransactionDialogContent
        variant="page"
        isCreatingFromReaction={isCreatingFromReaction}
        organizationMembers={membersForSelectedToken}
        selectedCaipChainId={payrollConfig?.caipChainId ?? ''}
        selectedTokenAddress={selectedTokenAddress}
        membersLoading={membersLoading}
        transactionDetailMembers={reactionSourceMembers}
        initialExecutionDate={initialExecutionDate}
        reactionSourceLoading={reactionSourceLoading}
        reactionSourceCaipChainId={reactionSourceCaipChainId}
        reactionSourceTokenAddress={reactionSourceTokenAddress}
        onCancel={handleCancel}
        onCreateTransaction={handleCreateTransaction}
      />
    </div>
  )
}
