import apis from '@/apis'
import type { PrivacyDepositDataResponse, TransactionPlan } from '@/apis/transaction.api'
import { confirmSync } from '@/lib/confirm-sync'
import { assertPreparedReceipt, attachDepositHash, discardRejectedDeposit, loadPreparedDeposit, prepareDeposit, preparedConfirmJob, type PreparedDeposit } from '@/lib/confirm-sync/preparedDeposit'
import { generateDepositProof } from '@/lib/gravarc/depositProofBrowser'
import { createDepositorStatusPayload } from '@/lib/gravarc/depositorClaimStatus'
import { reviewedPayrollPlanIsCurrent } from '@/lib/gravarc/reviewedPayrollPlan'
import { GRAVARC_ABI, ERC20_ABI as GRAVARC_ERC20_ABI } from '@/lib/gravarc/gravarcAbi'
import { naclDecrypt, naclEncrypt } from '@/lib/gravarc/naclCrypto'
import useChainAssetStore from '@/stores/chain-asset'
import { normalizeTransactionHash } from '@/utils/evm-transaction'
import { openWalletModal, selectWalletNetwork } from '@/providers/app-kit-provider'
import { useTranslation } from '@/utils/i18n'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { getPublicClient } from '@wagmi/core'
import { useEffect, useState } from 'react'
import { createWalletClient, custom, formatUnits, type Hex } from 'viem'
import { useConfig } from 'wagmi'
import { TransactionStatusBadge } from './transaction-status-badge'
import type { Transaction } from './types'

const ETH_SENTINEL = '0x0000000000000000000000000000000000000000' as Hex

type DepositStatus =
  | 'idle'
  | 'connecting'
  | 'checking'
  | 'approving'
  | 'fetching-data'
  | 'fetching-circuit'
  | 'fetching-path'
  | 'proving'
  | 'depositing'
  | 'done'
  | 'error'

interface ExecuteConfirmDialogContentProps {
  executingTransaction: Transaction | null
  transactionPlan: TransactionPlan | null
  onCancel: () => void
  onSuccess: (txHash: string, syncState: 'synced' | 'pending') => void
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] leading-[22px] text-[#606067]">{label}</span>
      <span className="text-[14px] leading-[22px] text-[#1c1c26]">{children}</span>
    </div>
  )
}

export function ExecuteConfirmDialogContent({
  executingTransaction,
  transactionPlan,
  onSuccess,
}: ExecuteConfirmDialogContentProps) {
  const { getChainAssetByToken, getChain, getTokenDecimals } = useChainAssetStore()
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [planPassword, setPlanPassword] = useState('')
  const [privateTotal, setPrivateTotal] = useState<string | null>(null)
  const [reviewedTotal, setReviewedTotal] = useState<bigint | null>(null)
  const [reviewedAllocations, setReviewedAllocations] = useState<Array<{ memberId: string; address: string; amount: bigint }> | null>(null)
  const [reviewedEncryptedPlan, setReviewedEncryptedPlan] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<PreparedDeposit | null>(null)
  const [recoveryHash, setRecoveryHash] = useState('')
  const [recoveryInvalid, setRecoveryInvalid] = useState(false)
  const isAiTransaction = executingTransaction?.type === 'token_usage_plan'
  // privacy_deposit 与带 privacyTier 的 GravArc 充值批次（token_usage_plan）都走 GravArc 存款路径。
  const { t } = useTranslation()

  useEffect(() => {
    if (!transactionPlan) return
    try {
      const saved = loadPreparedDeposit(localStorage.getItem('userId') ?? '', transactionPlan.orgId, transactionPlan.id)
      setPrepared(saved)
      setRecoveryHash(saved?.txHash ?? '')
      setRecoveryInvalid(false)
    } catch (error) {
      setRecoveryInvalid(true)
      setErrorMsg(error instanceof Error ? error.message : 'Invalid saved deposit recovery data')
      setStatus('error')
    }
  }, [transactionPlan?.id, transactionPlan?.orgId])

  useEffect(() => confirmSync.subscribe(event => {
    if (event.kind !== 'synced' || event.job.type !== 'confirm-privacy-deposit' ||
      event.job.orgId !== transactionPlan?.orgId || event.job.batchId !== transactionPlan.id) return
    setPrepared(null)
    setStatus('done')
  }), [transactionPlan?.id, transactionPlan?.orgId])

  const stepLabels: Record<DepositStatus, string> = {
    idle: t('pages.transactions.connectWallet'),
    connecting: t('pages.transactions.connecting'),
    checking: t('pages.transactions.checkingAllowance'),
    approving: t('pages.transactions.approving'),
    'fetching-data': 'Fetching deposit data…',
    'fetching-circuit': 'Downloading ZK circuit…',
    'fetching-path': 'Fetching Merkle path…',
    proving: 'Generating ZK proof…',
    depositing: t('pages.transactions.depositing'),
    done: t('pages.transactions.done'),
    error: t('pages.transactions.retry'),
  }

  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const wagmiConfig = useConfig()

  useEffect(() => {
    setPlanPassword('')
    setPrivateTotal(null)
    setReviewedTotal(null)
    setReviewedAllocations(null)
    setReviewedEncryptedPlan(null)
  }, [address, transactionPlan?.id, transactionPlan?.orgId])

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error'

  useEffect(() => {
    if (status !== 'connecting') return
    if (!isConnected || !address || !walletProvider) return
    if (isAiTransaction) executePrivacyDeposit(address as Hex, walletProvider)
    else prepareReview(address as Hex, walletProvider)
  }, [status, isConnected, address, walletProvider])

  async function handleDeposit() {
    if (!transactionPlan) return
    if (prepared || recoveryInvalid) return
    setErrorMsg('')

    if (!isConnected) {
      setStatus('connecting')
      try {
        await openWalletModal(Number(transactionPlan.caipChainId.split(':')[1]))
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Could not connect wallet')
        setStatus('error')
      }
      return
    }

    if (!isAiTransaction && !reviewedAllocations) await prepareReview(address as Hex, walletProvider!)
    else await executePrivacyDeposit(address as Hex, walletProvider!)
  }

  async function handleRecover() {
    if (!prepared) return
    try {
      if (!prepared.txHash && (!address || address.toLowerCase() !== prepared.depositorAddress.toLowerCase())) {
        throw new Error('Connect the original depositor wallet to recover this deposit')
      }
      const chain = getChain(prepared.caipChainId)
      if (!chain?.vaultAddress) throw new Error('GravArc contract is not configured for this deposit')
      const publicClient = getPublicClient(wagmiConfig, { chainId: Number(chain.chainId) })
      if (!publicClient) throw new Error('Deposit chain is unavailable')
      if (!/^0x[0-9a-fA-F]{64}$/.test(recoveryHash)) throw new Error('Enter a valid deposit transaction hash')
      const receipt = await publicClient.getTransactionReceipt({ hash: recoveryHash as Hex })
      assertPreparedReceipt(prepared, chain.vaultAddress, receipt)
      const saved = attachDepositHash(prepared, recoveryHash)
      setPrepared(saved)
      setErrorMsg('')
      const result = await confirmSync.enqueue(preparedConfirmJob(saved))
      if (result === 'synced') {
        setPrepared(null)
        setStatus('done')
        onSuccess(saved.txHash!, 'synced')
      } else {
        setErrorMsg('')
        onSuccess(saved.txHash!, 'pending')
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not recover deposit')
    }
  }

  // ── Privacy deposit (new flow) ─────────────────────────────────────────────

  async function decryptPrivatePlan(data: PrivacyDepositDataResponse, walletClient: Parameters<typeof naclDecrypt>[2]) {
    if (!transactionPlan || !planPassword || !data.encryptedPlan) throw new Error('Unlock the encrypted payroll plan before execution')
    const decoded = JSON.parse(await naclDecrypt(data.encryptedPlan, planPassword, walletClient)) as {
      version: number
      orgId: string
      caipChainId: string
      tokenAddress: string
      privacyRefundable?: boolean
      allocations: Array<{ memberId: string; address: string; amount: string }>
    }
    if (![1, 2].includes(decoded.version) ||
      (decoded.version === 1 && transactionPlan.privacyRefundable !== true) ||
      (decoded.version === 2 && decoded.privacyRefundable !== transactionPlan.privacyRefundable) ||
      data.privacyRefundable !== transactionPlan.privacyRefundable ||
      decoded.orgId !== transactionPlan.orgId ||
      decoded.caipChainId !== transactionPlan.caipChainId ||
      decoded.tokenAddress.toLowerCase() !== transactionPlan.tokenAddress?.toLowerCase() ||
      !Array.isArray(decoded.allocations) || decoded.allocations.length !== data.members.length) {
      throw new Error('Encrypted payroll plan does not match this deposit')
    }
    const seen = new Set<string>()
    return decoded.allocations.map(allocation => {
      const recipient = data.members.find(member => member.memberId === allocation.memberId)
      if (!recipient || recipient.address.toLowerCase() !== allocation.address.toLowerCase() ||
        seen.has(allocation.memberId) || !/^\d+$/.test(allocation.amount) || BigInt(allocation.amount) <= 0n) {
        throw new Error('Encrypted payroll allocation is invalid')
      }
      seen.add(allocation.memberId)
      return { ...allocation, amount: BigInt(allocation.amount) }
    })
  }

  async function prepareReview(account: Hex, provider: Provider) {
    if (!transactionPlan) return
    try {
      setStatus('fetching-data')
      const data = await apis.transaction.getPrivacyDepositData(transactionPlan.id)
      if (data.depositorAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Connect the plan creator’s bound wallet to execute this deposit')
      }
      const walletClient = createWalletClient({ account, transport: custom(provider) })
      const allocations = await decryptPrivatePlan(data, walletClient)
      const total = allocations.reduce((sum, allocation) => sum + allocation.amount, 0n)
      setPrivateTotal(formatUnits(total, getTokenDecimals(transactionPlan.caipChainId, transactionPlan.tokenAddress || ETH_SENTINEL)))
      setReviewedTotal(total)
      setReviewedAllocations(allocations)
      setReviewedEncryptedPlan(data.encryptedPlan)
      setPlanPassword('')
      setStatus('idle')
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not review this payroll plan')
      setStatus('error')
    }
  }

  async function executePrivacyDeposit(account: Hex, provider: Provider) {
    if (!transactionPlan) return

    try {
      const userId = localStorage.getItem('userId') ?? ''
      if (!userId) throw new Error('Log in before preparing a deposit')
      if (loadPreparedDeposit(userId, transactionPlan.orgId, transactionPlan.id)) {
        throw new Error('This deposit has saved recovery data; confirm it before submitting another transaction')
      }
      const chainEntry = getChain(transactionPlan.caipChainId)
      if (!chainEntry) throw new Error(`Chain ${transactionPlan.caipChainId} is not found in chain list.`)

      const numericChainId = parseInt(chainEntry.chainId, 10)
      if (!chainEntry.vaultAddress) {
        throw new Error(`GravArc contract is not configured for chain ${transactionPlan.caipChainId}.`)
      }
      const vaultAddress = chainEntry.vaultAddress as Hex
      const tokenAddress = (transactionPlan.tokenAddress || ETH_SENTINEL) as Hex

      await selectWalletNetwork(numericChainId)
      const currentChainIdHex = await provider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) throw new Error('Wallet did not switch to the deposit network')

      const chainAssetEntry = getChainAssetByToken(transactionPlan.caipChainId, tokenAddress)
      const isNative = chainAssetEntry?.isNative ?? false

      const walletClient = createWalletClient({ account, transport: custom(provider) })
      const publicClient = getPublicClient(wagmiConfig, { chainId: numericChainId })
      if (!publicClient) throw new Error(`Public client for chain ${numericChainId} is not configured.`)
      const configuredChain = publicClient.chain
      if (!configuredChain) throw new Error(`Chain metadata for chain ${numericChainId} is not configured.`)

      // Fetch receiver metadata; private amounts are recovered only from the encrypted plan.
      setStatus('fetching-data')
      const privacyData = await apis.transaction.getPrivacyDepositData(transactionPlan.id)
      if (privacyData.depositorAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Connect the plan creator’s bound wallet to execute this deposit')
      }
      if (privacyData.privacyRefundable !== transactionPlan.privacyRefundable) {
        throw new Error('Payroll refund setting changed after review; review the plan again')
      }
      let privateAmounts: Map<string, bigint> | null = null
      if (!isAiTransaction) {
        if (!reviewedPayrollPlanIsCurrent(
          reviewedEncryptedPlan, privacyData.encryptedPlan, reviewedAllocations, privacyData.members,
        )) {
          setReviewedAllocations(null)
          setReviewedEncryptedPlan(null)
          setReviewedTotal(null)
          setPrivateTotal(null)
          throw new Error('Payroll plan or recipients changed after review; review it again')
        }
        privateAmounts = new Map(reviewedAllocations!.map(allocation => [allocation.memberId, allocation.amount]))
      }

      // Verified circuit artifacts are loaded by the proof generator.
      setStatus('fetching-circuit')

      // Fetch Merkle deposit path and validate it matches the on-chain state
      setStatus('fetching-path')
      const [depositPath, onChainNextIndex] = await Promise.all([
        apis.transaction.getDepositPath(transactionPlan.caipChainId),
        publicClient.readContract({
          address: vaultAddress,
          abi: GRAVARC_ABI,
          functionName: 'nextIndex',
        }),
      ])
      if (Number(onChainNextIndex) !== depositPath.nextIndex) {
        throw new Error(
          `Deposit tree out of sync: backend nextIndex=${depositPath.nextIndex}, on-chain nextIndex=${Number(onChainNextIndex)}. Please retry in a moment.`
        )
      }

      // Generate ZK proof entirely in browser.
      // Direct deposit commits exactly the recipient allocations, as in Core.
      setStatus('proving')
      const refundable = transactionPlan.privacyRefundable === true
      let depositorSecretHash: string | null = null
      const profile = (!isAiTransaction || refundable) ? await apis.auth.getMyGravArcUserInfo() : null
      if ((!isAiTransaction || refundable) && (!profile || profile.address.toLowerCase() !== account.toLowerCase() ||
        !profile.encPubkey || !/^(0x)?[0-9a-fA-F]{64}$/.test(profile.encPubkey) ||
        (refundable && !/^0x[0-9a-fA-F]{64}$/.test(profile.secretHash)))) {
        throw new Error('Deposit requires a matching depositor privacy profile and encryption key')
      }
      const depositorEncPubkey = profile?.encPubkey ?? null
      if (refundable) depositorSecretHash = profile!.secretHash
      const receivers = privacyData.members.map(m => {
        const amount = privateAmounts ? privateAmounts.get(m.memberId) : BigInt(m.amount ?? '0')
        if (amount === undefined) throw new Error('Encrypted payroll allocation is missing')
        return {
          address: m.address,
          secretHash: m.secretHash,
          encPubkey: m.encPubkey,
          amount: isAiTransaction ? amount + BigInt(m.platformFee ?? '0') : amount,
        }
      })
      if (receivers.some(receiver => receiver.amount <= 0n)) throw new Error('Payroll total must be positive')
      if (privateAmounts) {
        const total = receivers.reduce((sum, receiver) => sum + receiver.amount, 0n)
        setPrivateTotal(formatUnits(total, getTokenDecimals(transactionPlan.caipChainId, tokenAddress)))
      }
      const proofResult = await generateDepositProof(
        receivers,
        BigInt(tokenAddress),
        { nextIndex: depositPath.nextIndex, siblings: depositPath.siblings },
        refundable,
        depositorSecretHash,
      )

      if (!isAiTransaction && (reviewedTotal === null || proofResult.totalAmount !== reviewedTotal)) {
        throw new Error('Public deposit total does not match the reviewed payroll total')
      }

      // Legacy system recharges still compare their stored public total.
      if (isAiTransaction && proofResult.totalAmount !== BigInt(transactionPlan.totalAmount ?? '0')) {
        throw new Error(
          `Deposit total mismatch: proof totalAmount=${proofResult.totalAmount} but plan totalAmount=${transactionPlan.totalAmount}. ` +
          `Check the system recharge amounts before submitting.`,
        )
      }

      const tokenBalance = isNative
        ? await publicClient.getBalance({ address: account })
        : await publicClient.readContract({
            address: tokenAddress,
            abi: GRAVARC_ERC20_ABI,
            functionName: 'balanceOf',
            args: [account],
          })
      if (tokenBalance < proofResult.totalAmount) throw new Error('Insufficient balance for the reviewed deposit total')

      // ERC20 allowance check & approve. The vault pulls exactly proofResult.totalAmount (Σ gross, which
      // equals transactionPlan.totalAmount). totalAmount is also a public input to the ZK proof, so it must
      // match the value committed during proving — any mismatch reverts with InvalidDepositProof.
      if (!isNative) {
        setStatus('checking')
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: GRAVARC_ERC20_ABI,
          functionName: 'allowance',
          args: [account, vaultAddress],
        })
        if (allowance < proofResult.totalAmount) {
          setStatus('approving')
          const approveTx = normalizeTransactionHash(await walletClient.writeContract({
            address: tokenAddress,
            abi: GRAVARC_ERC20_ABI,
            functionName: 'approve',
            args: [vaultAddress, proofResult.totalAmount],
            chain: configuredChain,
          }))
          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx })
          if (approveReceipt.status !== 'success') throw new Error('approve transaction reverted.')
        }
      }

      // Prepare encrypted confirmation data before submitting the transaction, so a
      // returned hash can be persisted immediately, without another encryption step.
      const withdrawMessages = proofResult.receivers.map((r, i) => {
        const msgContent = JSON.stringify({
          nullifier: r.nullifier,
          amount: r.amount,
          depositRoot: proofResult.newDepositRoot,
          leafIndex: proofResult.leafIndex,
          authRoot: proofResult.authRoot,
          depositorSecretHash: proofResult.depositorSecretHash,
          depositPathElements: proofResult.depositPathElements,
          depositPathIndices: proofResult.depositPathIndices,
          authPathElements: r.authPathElements,
          authPathIndices: r.authPathIndices,
        })
        const pubKeyHex = r.encPubkey.startsWith('0x') ? r.encPubkey.slice(2) : r.encPubkey
        return {
          address: r.address,
          content: naclEncrypt(msgContent, pubKeyHex),
          secretHash: privacyData.members[i].secretHash,
          encPubkey: r.encPubkey,
        }
      })

      let refundEncContent: string | undefined
      let refundDepositInfo: string | undefined
      if (!isAiTransaction) {
        if (!depositorEncPubkey) throw new Error('Missing depositor encryption key')
        const depositorPayload = await createDepositorStatusPayload(
          transactionPlan.id, privacyData.members, proofResult, tokenAddress, refundable,
        )
        const pubKeyHex = depositorEncPubkey.startsWith('0x')
          ? depositorEncPubkey.slice(2)
          : depositorEncPubkey
        refundEncContent = naclEncrypt(JSON.stringify(depositorPayload), pubKeyHex)
        refundDepositInfo = JSON.stringify({
          ...(refundable ? { depositorSecretHash: proofResult.depositorSecretHash } : {}),
          encPubkey: depositorEncPubkey,
        })
      } else if (refundable && depositorEncPubkey) {
        refundEncContent = naclEncrypt(JSON.stringify({
          batchId: transactionPlan.id,
          leafIndex: proofResult.leafIndex,
          token: tokenAddress,
          tier: proofResult.tier,
          authRoot: proofResult.authRoot,
          depositLeaf: proofResult.depositLeaf,
          depositorSecretHash: proofResult.depositorSecretHash,
          slots: proofResult.refundSlots,
        }), depositorEncPubkey.startsWith('0x') ? depositorEncPubkey.slice(2) : depositorEncPubkey)
        refundDepositInfo = JSON.stringify({ depositorSecretHash: proofResult.depositorSecretHash, encPubkey: depositorEncPubkey })
      }

      if (!isAiTransaction) {
        const latest = await apis.transaction.getPrivacyDepositData(transactionPlan.id)
        if (latest.transactionStatus !== 'ready' ||
          latest.depositorAddress.toLowerCase() !== account.toLowerCase() ||
          latest.privacyRefundable !== transactionPlan.privacyRefundable ||
          !reviewedPayrollPlanIsCurrent(reviewedEncryptedPlan, latest.encryptedPlan, reviewedAllocations, latest.members)) {
          throw new Error('Payroll plan or member wallets changed before submission; review it again')
        }
      }

      const preparedDeposit: PreparedDeposit = {
        version: 1,
        userId,
        orgId: transactionPlan.orgId,
        batchId: transactionPlan.id,
        caipChainId: transactionPlan.caipChainId,
        depositorAddress: account,
        depositLeaf: proofResult.depositLeaf,
        label: executingTransaction?.name || transactionPlan.id,
        withdrawMessages,
        ...(refundEncContent ? { encContent: refundEncContent, depositInfo: refundDepositInfo } : {}),
      }
      prepareDeposit(preparedDeposit)
      setPrepared(preparedDeposit)

      // Call privacyDeposit on-chain
      setStatus('depositing')
      const depositArgs = {
        address: vaultAddress,
        abi: GRAVARC_ABI,
        functionName: 'deposit',
        args: [{
          pA: proofResult.proof.pA.map(BigInt) as [bigint, bigint],
          pB: proofResult.proof.pB.map(row => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
          pC: proofResult.proof.pC.map(BigInt) as [bigint, bigint],
          newRoot: BigInt(proofResult.newDepositRoot),
          depositLeaf: BigInt(proofResult.depositLeaf),
          totalAmount: proofResult.totalAmount,
          token: tokenAddress,
          tier: proofResult.tier,
        }],
        ...(isNative ? { value: proofResult.totalAmount } : {}),
        chain: configuredChain,
      } as const

      let depositTxHash: Hex
      try {
        depositTxHash = await walletClient.writeContract(depositArgs)
      } catch (gasErr: unknown) {
        const msg = gasErr instanceof Error ? gasErr.message : ''
        if (msg.toLowerCase().includes('gas') && msg.toLowerCase().includes('high')) {
          try {
            depositTxHash = await walletClient.writeContract({ ...depositArgs, gas: 3_000_000n })
          } catch (retryError) {
            if ((retryError as { name?: string; code?: number })?.name === 'UserRejectedRequestError' ||
              (retryError as { code?: number })?.code === 4001) {
              discardRejectedDeposit(preparedDeposit)
              setPrepared(null)
            }
            throw retryError
          }
        } else {
          if ((gasErr as { name?: string; code?: number })?.name === 'UserRejectedRequestError' ||
            (gasErr as { code?: number })?.code === 4001) {
            discardRejectedDeposit(preparedDeposit)
            setPrepared(null)
          }
          throw gasErr
        }
      }
      const depositTx = normalizeTransactionHash(depositTxHash)
      const savedDeposit = attachDepositHash(preparedDeposit, depositTx)
      setPrepared(savedDeposit)
      const confirmJob = preparedConfirmJob(savedDeposit)
      try {
        confirmSync.stage(confirmJob)
      } catch {
        throw new Error(`Deposit submitted (${depositTx}), but this browser could not save its confirmation. Keep this transaction hash for recovery.`)
      }
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status !== 'success') {
        confirmSync.discard(confirmJob)
        throw new Error('privacyDeposit transaction reverted.')
      }
      try {
        assertPreparedReceipt(savedDeposit, vaultAddress, receipt)
      } catch (receiptError) {
        confirmSync.discard(confirmJob)
        throw receiptError
      }
      const syncResult = await confirmSync.enqueue(confirmJob)
      if (syncResult === 'synced') setPrepared(null)

      setStatus('done')
      onSuccess(depositTx, syncResult === 'synced' ? 'synced' : 'pending')
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  // ── Progress steps ─────────────────────────────────────────────────────────

  const privacySteps: DepositStatus[] = [
    'fetching-data',
    'fetching-circuit',
    'fetching-path',
    'proving',
    'checking',
    'approving',
    'depositing',
  ]
  const privacyLabels = ['Data', 'Circuit', 'Path', 'Proof', 'Allowance', 'Approve', 'Deposit']

  const activeSteps = privacySteps
  const activeLabels = privacyLabels

  return (
    <div className="flex flex-col gap-[20px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[#1c1c26] text-[16px] font-bold leading-[26px]">{t('pages.transactions.transactionSummary')}</span>
      </div>

      {/* Summary card */}
      {executingTransaction && (
        <div className="bg-[#f5f5f5] rounded-[12px] p-4 flex flex-col gap-[18px]">
          <InfoRow label={t('pages.transactions.transactionName')}>{executingTransaction.name}</InfoRow>
          <InfoRow label={isAiTransaction ? t('pages.transactions.paymentTime') : t('pages.transactions.payDay')}>{executingTransaction.executionDate}</InfoRow>
          <InfoRow label={t('pages.transactions.network')}>{executingTransaction.network}</InfoRow>
          <div className="flex items-center justify-between">
            <span className="text-[14px] leading-[22px] text-[#606067]">{t('pages.transactions.status')}</span>
            <TransactionStatusBadge status={executingTransaction.status} />
          </div>
          <InfoRow label={isAiTransaction ? t('pages.transactions.totalAmount') : 'Expected public deposit total'}>
            {privateTotal ?? (isAiTransaction ? executingTransaction.totalAmount : 'Private')} {executingTransaction.currency}
          </InfoRow>
          <InfoRow label={isAiTransaction ? t('pages.transactions.payees') : t('pages.transactions.totalMembers')}>
            {isAiTransaction ? t('pages.transactions.apiService') : executingTransaction.members}
          </InfoRow>
        </div>
      )}

      {/* Progress steps */}
      {isBusy && (
        <div className="flex flex-wrap items-center gap-[8px] text-[12px] text-[#606067]">
          {activeSteps.map((s, i) => {
            const stepIdx = activeSteps.indexOf(status as DepositStatus)
            const done = stepIdx > i
            const active = status === s
            return (
              <div key={s} className="flex items-center gap-[4px]">
                {i > 0 && <span className="text-[rgba(0,0,0,0.2)]">→</span>}
                <span className={active ? 'text-[#5e85ee] font-medium' : done ? 'text-[#5ddd22]' : 'text-[#8d8d93]'}>
                  {activeLabels[i]}{done ? ' ✓' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="rounded-[12px] border border-[rgba(217,43,43,0.2)] bg-[rgba(217,43,43,0.04)] px-4 py-3 text-[13px] text-[#d92b2b]">
          {errorMsg}
        </div>
      )}


      {!isAiTransaction && !reviewedAllocations && status !== 'done' && !prepared && (
        <input
          type="password"
          autoComplete="off"
          value={planPassword}
          onChange={event => { setPlanPassword(event.target.value); setReviewedAllocations(null); setReviewedEncryptedPlan(null); setReviewedTotal(null); setPrivateTotal(null) }}
          placeholder="Private account password"
          className="h-[38px] rounded-[10px] border px-3 text-[13px]"
        />
      )}

      {reviewedAllocations && status !== 'done' && (
        <div className="rounded-[12px] border p-4 text-[13px]">
          <p className="mb-2 font-medium">Review private payroll allocations before submitting one deposit:</p>
          <p className="mb-2 text-[#606067]">Depositor refund: {transactionPlan?.privacyRefundable === true ? 'enabled' : 'disabled'}</p>
          {reviewedAllocations.map(allocation => (
            <div key={allocation.memberId} className="flex justify-between gap-3 py-1">
              <span>{transactionPlan?.items.find(item => item.member?.memberId === allocation.memberId)?.member?.showName || allocation.memberId}</span>
              <span>{formatUnits(allocation.amount, getTokenDecimals(transactionPlan!.caipChainId, transactionPlan!.tokenAddress || ETH_SENTINEL))} {executingTransaction?.currency}</span>
            </div>
          ))}
        </div>
      )}

      {prepared && status !== 'done' && (
        <div className="rounded-[12px] border border-[#e5bd61] bg-[#fffaf0] p-4 text-[13px]">
          <p className="font-medium">This deposit has saved encrypted recovery data. Do not submit it again.</p>
          <p className="mt-2">{prepared.txHash ? 'The on-chain deposit is confirmed. Encrypted delivery is syncing; no new deposit is needed.' : 'If your wallet submitted the deposit, enter its transaction hash to resend the encrypted receiver and refund messages.'}</p>
          <input
            type="text"
            aria-label="Deposit transaction hash"
            value={recoveryHash}
            readOnly={!!prepared.txHash}
            onChange={event => setRecoveryHash(event.target.value.trim())}
            placeholder="0x… deposit transaction hash"
            className="mt-3 h-[38px] w-full rounded-[10px] border px-3"
          />
          <button type="button" onClick={handleRecover} disabled={!/^0x[0-9a-fA-F]{64}$/.test(recoveryHash)}
            className="mt-3 h-[38px] rounded-[12px] bg-[#5e85ee] px-4 text-white disabled:opacity-40">
            {prepared.txHash ? 'Retry delivery sync' : 'Resend encrypted delivery'}
          </button>
          {errorMsg && <p className="mt-2 text-[#d92b2b]">{errorMsg}</p>}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleDeposit}
          disabled={isBusy || status === 'done' || !!prepared || recoveryInvalid ||
            (!isAiTransaction && !reviewedAllocations && !planPassword)}
          className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!isAiTransaction && status === 'idle' ? (reviewedAllocations ? 'Confirm and execute' : 'Review payroll') : stepLabels[status]}
        </button>
      </div>
    </div>
  )
}
