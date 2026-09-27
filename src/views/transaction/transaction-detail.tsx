import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { confirmSync } from '@/lib/confirm-sync'
import { depositAction } from '@/lib/confirm-sync/depositAction'
import { loadPreparedDeposit } from '@/lib/confirm-sync/preparedDeposit'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableScrollArea } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { PayrollTransactionStatus } from '@/enums/transaction'
import useChainAssetStore from '@/stores/chain-asset'
import useAuthStore from '@/stores/auth'
import useHeaderStore from '@/stores/header'
import useOrganizationStore from '@/stores/organization'
import { useTranslation } from '@/utils/i18n'
import { formatUnits } from 'ethers'
import { CreditCard, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DeleteConfirmDialogContent,
  ExecuteConfirmDialogContent,
  ExecuteSuccessDialogContent,
  GravArcRefundDialogContent,
} from './components'
import type { Transaction } from './components/types'

import { formatLocalDateTime, getRelativeExecutionDate, getRelativeExecutionDateTextClassName } from '@/utils/date'
import { getHighestRole, Permission, useHasPermission } from '@/utils/permissions'
import { buildExplorerTransactionUrl, formatTransactionHash } from '@/utils/transaction'
import { TransactionItemStatusBadge, TransactionStatusBadge } from '@/views/transaction/components/transaction-status-badge'
import { PrivateDepositStatus } from './components/private-deposit-status'

const ITEMS_PER_PAGE = 20





export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { getTokenSymbol, getTokenDecimals, fetchChainAssets, fetchChains, getChain } = useChainAssetStore()
  const { setHeader, clearHeader } = useHeaderStore()
  const hasPermission = useHasPermission()
  const { address } = useAppKitAccount()
  const profileUserId = useAuthStore(state => state.gravArcUserInfo?.userId)
  const sessionUserId = localStorage.getItem('userId')
  const refundIdentity = address && sessionUserId && (!profileUserId || profileUserId === sessionUserId)
    ? `${sessionUserId}:eip155:${address.toLowerCase()}` : null
  const currentMember = useOrganizationStore(s => s.currentMember)

  const [plan, setPlan] = useState<TransactionPlan | null>(null)
  const [privateRefundCheck, setPrivateRefundCheck] = useState<{ planId: string; identity: string; verified: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  // Execute dialog
  const [executeOpen, setExecuteOpen] = useState(false)
  const [executeSuccessOpen, setExecuteSuccessOpen] = useState(false)
  const [lastTxHash, setLastTxHash] = useState('')
  const [depositSyncPending, setDepositSyncPending] = useState(false)
  const [confirmedLocally, setConfirmedLocally] = useState(false)
  const [refreshingPlan, setRefreshingPlan] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Refund dialog

  // GravArc 隐私退款 dialog
  const [gravArcRefundOpen, setGravArcRefundOpen] = useState(false)

  useEffect(() => {
    Promise.all([fetchChainAssets(), fetchChains()]).then(() => {
      if (!id) return
      apis.transaction.getTransactionPlanDetail(id)
        .then(data => {
          setPlan(data)
          setHeader({
            backUrl: '/orgs/transaction',
            breadcrumb: [
              { label: t('pages.transactionDetail.transactions'), href: '/orgs/transaction' },
              { label: data.transactionName },
            ],
          })
        })
        .catch(() => {
          // request interceptor handles API errors
        })
        .finally(() => setLoading(false))
    })
    return () => clearHeader()
  }, [clearHeader, fetchChainAssets, fetchChains, id, setHeader, t])

  useEffect(() => confirmSync.subscribe(event => {
    if (event.kind !== 'synced' || event.job.type !== 'confirm-privacy-deposit' || event.job.batchId !== id) return
    setDepositSyncPending(false)
    void apis.transaction.getTransactionPlanDetail(id).then(setPlan)
  }), [id])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-[#8d8d93] text-[13px]">{t('common.loading')}</div>
  }
  if (!plan) {
    return <div className="flex items-center justify-center h-40 text-[#8d8d93] text-[13px]">{t('pages.transactionDetail.notFound')}</div>
  }

  const tokenSymbol = getTokenSymbol(plan.caipChainId, plan.tokenAddress ?? '') ?? plan.tokenAddress?.slice(0, 6) ?? ''
  const decimals = getTokenDecimals(plan.caipChainId, plan.tokenAddress ?? '')
  const chain = getChain(plan.caipChainId)
  const networkName = chain?.name ?? plan.caipChainId
  const explorerBaseUrl = chain?.explorerUrls?.[0]
  const txExplorerUrl = buildExplorerTransactionUrl(explorerBaseUrl, plan.depositTxHash)

  const payDay = formatLocalDateTime(plan.payPeriod)
  const relativeExecutionDate = getRelativeExecutionDate(plan.payPeriod)
  const relativeExecutionDateLabel = relativeExecutionDate.diffDays == null
    ? relativeExecutionDate.label
    : relativeExecutionDate.diffDays === 0
      ? t('pages.analytics.today')
      : relativeExecutionDate.diffDays > 0
        ? t('pages.analytics.inDays', {
          count: relativeExecutionDate.diffDays,
          dayLabel: t(relativeExecutionDate.diffDays === 1 ? 'pages.analytics.daySingular' : 'pages.analytics.dayPlural')
        })
        : t('pages.analytics.daysAgo', {
          count: Math.abs(relativeExecutionDate.diffDays),
          dayLabel: t(Math.abs(relativeExecutionDate.diffDays) === 1 ? 'pages.analytics.daySingular' : 'pages.analytics.dayPlural')
        })
  const diffDays = relativeExecutionDate.diffDays ?? 0
  const isDueToday = diffDays === 0 && plan.transactionStatus !== PayrollTransactionStatus.COMPLETE
  const isComplete = plan.transactionStatus === PayrollTransactionStatus.COMPLETE
  const isRefunded = plan.transactionStatus === PayrollTransactionStatus.REFUNDED
  const verifiedRefund = privateRefundCheck?.planId === plan.id && privateRefundCheck.identity === refundIdentity && privateRefundCheck.verified
  const privateStatus = plan.transactionType === 'privacy_deposit' && plan.depositTxHash && (isComplete || isRefunded)
    ? verifiedRefund ? 'refunded' : 'confirmed' : undefined
  let preparedDeposit: { txHash?: string } | null
  try { preparedDeposit = loadPreparedDeposit(localStorage.getItem('userId') ?? '', plan.orgId, plan.id) }
  catch { preparedDeposit = {} }
  const action = depositAction(plan, preparedDeposit, confirmedLocally)
  const executionDateLabel = (
    <span className={getRelativeExecutionDateTextClassName(relativeExecutionDate.tone)}>
      {relativeExecutionDateLabel}
    </span>
  )

  const totalAmountFormatted = (() => {
    if (plan.totalAmount === null) return 'Private'
    try { return parseFloat(formatUnits(BigInt(plan.totalAmount), decimals)).toLocaleString() }
    catch { return plan.totalAmount }
  })()

  const refundedAmountFormatted = (() => {
    if (plan.items.some(item => item.status === 'refunded' && item.amount === null)) return 'Private'
    try {
      // Direct payroll allocations contain no platform fee.
      const totalRefunded = plan.items
        .filter(item => item.status === 'refunded')
        .reduce((sum, item) => sum + BigInt(item.amount!), BigInt(0))
      return parseFloat(formatUnits(totalRefunded, decimals)).toLocaleString()
    } catch { return '0' }
  })()

  const totalPages = Math.ceil(plan.items.length / ITEMS_PER_PAGE)
  const paginatedItems = plan.items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Build a Transaction stub for the execute dialog
  const transactionStub: Transaction = {
    id: plan.id,
    name: plan.transactionName,
    transactionId: plan.id,
    type: plan.transactionType,
    status: plan.transactionStatus as Transaction['status'],
    executionDate: payDay,
    daysRemaining: diffDays,
    isDueToday,
    totalAmount: totalAmountFormatted,
    currency: tokenSymbol,
    members: plan.items.length,
    network: networkName,
    isComplete: plan.transactionStatus === PayrollTransactionStatus.COMPLETE,
  }

  const handleExecuteSuccess = async (txHash: string, syncState: 'synced' | 'pending') => {
    setExecuteOpen(false)
    setConfirmedLocally(true)
    setLastTxHash(txHash)
    setDepositSyncPending(syncState === 'pending')
    setExecuteSuccessOpen(true)
    const updated = await apis.transaction.getTransactionPlanDetail(plan.id)
    setPlan(updated)
  }

  const handleRefreshPlan = async () => {
    if (refreshingPlan) return
    setRefreshingPlan(true)
    try {
      setPlan(await apis.transaction.getTransactionPlanDetail(plan.id))
    } catch {
      // The request interceptor reports API errors.
    } finally {
      setRefreshingPlan(false)
    }
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await apis.transaction.deleteTransactionPlan(plan.id)
      toast({ title: t('pages.orgMembers.success'), description: t('pages.transactionDetail.transactionDeleted') })
      navigate('/orgs/transaction')
    } catch {
      // request interceptor handles API errors
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-[20px]">
      {/* ── Info card ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-4 md:p-6 flex flex-col gap-[16px]">
        {/* Top row: status + name + actions */}
        <div className="flex flex-col gap-[16px] md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-col gap-[10px]">
            {/* Status badge + transaction name */}
            <div className="relative flex min-w-0 flex-wrap items-center gap-[10px] pl-[12px]">
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-[22px] rounded-full ${isComplete ? 'bg-[#5ddd22]' : isRefunded ? 'bg-[#606067]' : 'bg-[#5e85ee]'}`} />
              <TransactionStatusBadge status={plan.transactionStatus} privateStatus={privateStatus} pending={action === 'pending'} />
              <span className="min-w-0 break-words text-[#1c1c26] text-[16px] font-bold leading-[26px]">{plan.transactionName}</span>
            </div>
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px] text-[13px] leading-[22px]">
              <span>
                <span className="text-[#8d8d93]">{t('pages.transactionDetail.payDayLocal')}: </span>
                <span className="text-[#1c1c26] font-medium">{payDay}</span>
              </span>
              <div className="hidden h-[14px] w-px bg-[rgba(0,0,0,0.12)] sm:block" />
              <span>
                <span className="text-[#8d8d93]">{t('pages.transactionDetail.executionDateLocal')}: </span>
                {executionDateLabel}
              </span>
              <div className="hidden h-[14px] w-px bg-[rgba(0,0,0,0.12)] sm:block" />
              <span>
                <span className="text-[#8d8d93]">{t('pages.transactionDetail.network')}: </span>
                <span className="text-[#1c1c26]">{networkName}</span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex w-full flex-wrap items-center gap-[10px] md:w-auto md:justify-end">
            {isComplete
              ? (
                <>
                  {/* GravArc 隐私退款：仅 privacy_deposit 且可退款批次显示 */}
                  {plan.createdBy === localStorage.getItem('userId') && plan.transactionType === 'privacy_deposit' && plan.privacyRefundable === true && (
                    <button
                      onClick={() => setGravArcRefundOpen(true)}
                      className="flex min-h-[38px] items-center gap-[4px] rounded-[12px] border border-[rgba(255,168,0,0.4)] bg-white px-[14px] text-[13px] text-[#c47d00] transition-colors hover:bg-[rgba(255,168,0,0.06)]"
                    >
                      <RotateCcw size={14} />
                      {t('pages.transactionDetail.refund')}
                    </button>
                  )}
                  {/* {hasPermission(Permission.EXECUTE_TRANSACTION) && plan.items.some(item => item.status !== 'claimed') && (
                    <button
                      onClick={() => setRefundOpen(true)}
                      className="flex min-h-[38px] items-center gap-[4px] rounded-[12px] border border-[rgba(255,168,0,0.4)] bg-white px-[14px] text-[13px] text-[#c47d00] transition-colors hover:bg-[rgba(255,168,0,0.06)]"
                    >
                      <RotateCcw size={14} />
                      {t('pages.transactionDetail.refund')}
                    </button>
                  )} */}
                </>
              )
              : !isRefunded && hasPermission(Permission.EXECUTE_TRANSACTION) && plan.createdBy === localStorage.getItem('userId') && (
                  <button
                    onClick={() => setExecuteOpen(true)}
                    disabled={action === 'disabled' || action === 'pending'}
                    className="flex min-h-[38px] items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[14px] text-[13px] text-white transition-opacity hover:bg-[#5e85ee]/90 disabled:cursor-not-allowed disabled:bg-[#d8def8] disabled:hover:bg-[#d8def8]"
                  >
                    <CreditCard size={14} />
                    {action === 'pending' ? 'Syncing delivery' : action === 'recover' ? t('pages.transactions.recoverDeposit') : t('pages.transactionDetail.executeNow')}
                  </button>
                )
            }
            {action === 'pending' && (
              <button type="button" onClick={() => void handleRefreshPlan()} disabled={refreshingPlan}
                className="flex min-h-[38px] items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] text-[13px] text-[#1c1c26] disabled:opacity-40">
                <RefreshCw size={14} className={refreshingPlan ? 'animate-spin' : ''} /> Refresh status
              </button>
            )}
            {!isComplete && action === 'execute' && hasPermission(Permission.MODIFY_TRANSACTION) && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex min-h-[38px] items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] text-[13px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
              >
                <Trash2 size={14} />
                {t('pages.transactionDetail.delete')}
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-col gap-[12px] md:flex-row md:gap-[20px]">
          <div className="flex flex-1 items-center justify-between rounded-[18px] bg-[#f5f5f5] px-4 py-4 md:px-6 md:py-5">
            <span className="text-[#1c1c26] text-[14px] leading-[22px]">{t('pages.transactionDetail.totalMembers')}</span>
            <span className="text-[#1c1c26] text-[20px] font-medium leading-[28px] md:text-[22px] md:leading-[32px]">{plan.items.length.toLocaleString()}</span>
          </div>
          <div className="flex flex-1 items-center justify-between rounded-[18px] bg-[#f5f5f5] px-4 py-4 md:px-6 md:py-5">
            <span className="text-[#1c1c26] text-[14px] leading-[22px]">{t('pages.transactionDetail.totalAmount')}</span>
            <span className="pl-4 text-right text-[#1c1c26] text-[20px] font-medium leading-[28px] md:text-[22px] md:leading-[32px]">{totalAmountFormatted} {tokenSymbol}</span>
          </div>
          {isRefunded && (
            <div className="flex flex-1 items-center justify-between rounded-[18px] bg-[#f5f5f5] px-4 py-4 md:px-6 md:py-5">
              <span className="text-[#1c1c26] text-[14px] leading-[22px]">{t('pages.transactionDetail.refundedAmount')}</span>
              <span className="pl-4 text-right text-[#1c1c26] text-[20px] font-medium leading-[28px] md:text-[22px] md:leading-[32px]">{refundedAmountFormatted} {tokenSymbol}</span>
            </div>
          )}
          {isComplete && (
            <div className="flex flex-1 items-center justify-between rounded-[18px] bg-[#f5f5f5] px-4 py-4 min-w-0 md:px-6 md:py-5">
              <span className="text-[#1c1c26] text-[14px] leading-[22px] shrink-0">{t('pages.transactionDetail.txHash')}</span>
              {txExplorerUrl ? (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-4 truncate text-right font-mono text-[14px] font-medium leading-[22px] text-[#5e85ee] hover:underline"
                  title={plan.depositTxHash ?? undefined}
                >
                  {formatTransactionHash(plan.depositTxHash)}
                </a>
              ) : (
                <span className="ml-4 truncate text-right font-mono text-[14px] font-medium leading-[22px] text-[#1c1c26]" title={plan.depositTxHash ?? undefined}>
                  {formatTransactionHash(plan.depositTxHash)}
                </span>
              )}
            </div>
          )}
        </div>
        {(isComplete || isRefunded) && plan.transactionType === 'privacy_deposit' && (
          <PrivateDepositStatus plan={plan} symbol={tokenSymbol} decimals={decimals}
            onRefundVerified={verified => setPrivateRefundCheck(refundIdentity ? { planId: plan.id, identity: refundIdentity, verified } : null)} />
        )}
      </div>

      {/* ── Members table ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-6 flex flex-col gap-[20px] flex-1">
        <TableScrollArea>
          <Table className="min-w-[1100px] w-full">
            <TableHeader>
              <TableRow className="border-b border-[rgba(0,0,0,0.12)] hover:bg-transparent">
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[220px]">{t('pages.transactionDetail.member')}</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[220px]">{t('pages.transactionDetail.email')}</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[180px]">{t('pages.transactionDetail.role')}</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[120px]">{t('pages.transactionDetail.status')}</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3">{t('pages.transactionDetail.amount')}</TableHead>
                <TableHead className="text-[#8d8d93] text-[13px] font-normal pb-3 w-[240px]">{t('pages.transactionDetail.txHash')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-[24px]">
                    <div className="flex flex-col items-center justify-center gap-[10px]">
                      <img src="/empty-table.svg" alt={t('pages.transactionDetail.noMembersAlt')} className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">{t('pages.transactionDetail.noMembersFound')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, idx) => {
                  const amountFormatted = item.amount === null ? 'Private' : (() => {
                    try { return parseFloat(formatUnits(BigInt(item.amount), decimals)).toLocaleString() }
                    catch { return item.amount }
                  })()
                  const itemTxExplorerUrl = buildExplorerTransactionUrl(explorerBaseUrl, item.txHash)
                  return (
                    <TableRow key={item.id ?? idx} className="border-b border-[rgba(0,0,0,0.06)] hover:bg-[#f5f5f5]/60">
                      <TableCell className="py-[14px]">
                        <div className="flex items-center gap-[6px]">
                          {item.member?.avatarUrl ? (
                            <img
                              src={item.member.avatarUrl}
                              alt={item.member.showName ?? ''}
                              className="h-[28px] w-[28px] shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e8eefe]">
                              <span className="text-[12px] font-medium text-[#5e85ee]">
                                {item.member?.showName?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="flex min-w-0 items-center gap-[4px]">
                            <span className="max-w-[120px] truncate text-[13px] text-[#1c1c26] leading-[22px]">
                              {item.member?.showName ?? '-'}
                            </span>
                            {item.member?.memberId === currentMember?.memberId && <span className="shrink-0">{t('pages.orgMembers.me')}</span>}
                            {item.member?.remark && (
                              <span className="max-w-[80px] truncate text-[11px] text-[#8d8d93]" title={item.member.remark}>
                                ({item.member.remark})
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">{item.member?.email ?? '-'}</TableCell>
                      <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">{getHighestRole(item.member.roles)}</TableCell>
                      <TableCell className="py-[14px]">
                        {plan.transactionType === 'privacy_deposit' && isComplete
                          ? <span className="text-[12px] text-[#606067]">{t('components.payrollHistoryTable.privateCheckWallet')}</span>
                          : <TransactionItemStatusBadge status={item.status} />}
                      </TableCell>
                      <TableCell className="text-[13px] text-[#1c1c26] leading-[22px] py-[14px]">
                        {amountFormatted} {tokenSymbol}
                      </TableCell>
                      <TableCell className="py-[14px]">
                        {itemTxExplorerUrl ? (
                          <a
                            href={itemTxExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[13px] text-[#5e85ee] leading-[22px] font-mono truncate hover:underline"
                            title={item.txHash ?? undefined}
                          >
                            {formatTransactionHash(item.txHash)}
                          </a>
                        ) : (
                          <span className="block text-[13px] text-[#1c1c26] leading-[22px] font-mono truncate" title={item.txHash ?? undefined}>
                            {formatTransactionHash(item.txHash)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableScrollArea>

        {/* Pagination */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[#606067] text-[13px]">
            {t('pages.transactionDetail.showingMembers', {
              from: (currentPage - 1) * ITEMS_PER_PAGE + 1,
              to: Math.min(currentPage * ITEMS_PER_PAGE, plan.items.length),
              total: plan.items.length,
            })}
          </span>
          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent disableOutsideClose>
          <DialogTitle className="sr-only">{t('pages.transactionDetail.transactionSummary')}</DialogTitle>
          <ExecuteConfirmDialogContent
            executingTransaction={transactionStub}
            transactionPlan={plan}
            onCancel={() => setExecuteOpen(false)}
            onSuccess={handleExecuteSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={executeSuccessOpen} onOpenChange={setExecuteSuccessOpen}>
        <DialogContent className="max-w-2xl">
          <ExecuteSuccessDialogContent
            depositTxHash={lastTxHash}
            syncPending={depositSyncPending}
            executingTransaction={transactionStub}
            caipChainId={plan?.caipChainId}
            onClose={() => { setExecuteSuccessOpen(false); setLastTxHash('') }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DeleteConfirmDialogContent
            transactionToDelete={transactionStub}
            isDeleting={isDeleting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleConfirmDelete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={gravArcRefundOpen} onOpenChange={setGravArcRefundOpen}>
        <DialogContent disableOutsideClose>
          <DialogTitle className="sr-only">{t('pages.transactions.gravArcRefund')}</DialogTitle>
          <GravArcRefundDialogContent
            transaction={transactionStub}
            transactionPlan={plan}
            onCancel={() => setGravArcRefundOpen(false)}
            onSuccess={async () => {
              setGravArcRefundOpen(false)
              const updated = await apis.transaction.getTransactionPlanDetail(plan.id)
              setPlan(updated)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
