import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { confirmSync } from '@/lib/confirm-sync'
import { generateDepositProof } from '@/lib/gravarc/depositProofBrowser'
import { GRAVARC_ABI, ERC20_ABI as GRAVARC_ERC20_ABI } from '@/lib/gravarc/gravarcAbi'
import { naclEncrypt } from '@/lib/gravarc/naclCrypto'
import { erc20Abi, vaultAbi } from '@/lib/vault-abi'
import useChainAssetStore from '@/stores/chain-asset'
import { normalizeTransactionHash } from '@/utils/evm-transaction'
import { useTranslation } from '@/utils/i18n'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { getPublicClient } from '@wagmi/core'
import { useEffect, useState } from 'react'
import { createWalletClient, custom, type Hex } from 'viem'
import { useConfig } from 'wagmi'
import { TransactionStatusBadge } from './transaction-status-badge'
import type { Transaction } from './types'

const ETH_SENTINEL = '0x0000000000000000000000000000000000000000' as Hex

/** 读取当前存款人（本机登录账户）的 GravArc secretHash，用于可退款存款的 depositLeaf 承诺。 */
function readDepositorSecretHash(): string | null {
  try {
    const raw = localStorage.getItem('gravArcUserInfo')
    if (!raw) return null
    return (JSON.parse(raw) as { secretHash?: string | null })?.secretHash ?? null
  } catch {
    return null
  }
}

/** 读取当前存款人的 NaCl box 公钥（encPubkey），用于加密退款载荷（便携化：存后端，任意设备解密）。 */
function readDepositorEncPubkey(): string | null {
  try {
    const raw = localStorage.getItem('gravArcUserInfo')
    if (!raw) return null
    return (JSON.parse(raw) as { encPubkey?: string | null })?.encPubkey ?? null
  } catch {
    return null
  }
}

type DepositStatus =
  | 'idle'
  | 'connecting'
  | 'authorizing'
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
  onSuccess: (txHash: string) => void
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
  const { getChainAssetByToken, getChain } = useChainAssetStore()
  const [status, setStatus] = useState<DepositStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const isAiTransaction = executingTransaction?.type === 'token_usage_plan'
  // privacy_deposit 与带 privacyTier 的 GravArc 充值批次（token_usage_plan）都走 GravArc 存款路径。
  const isPrivacyDeposit =
    transactionPlan?.transactionType === 'privacy_deposit' ||
    (transactionPlan?.privacyTier !== null && transactionPlan?.privacyTier !== undefined)
  const { t } = useTranslation()

  const stepLabels: Record<DepositStatus, string> = {
    idle: t('pages.transactions.connectWallet'),
    connecting: t('pages.transactions.connecting'),
    authorizing: t('pages.transactions.authorizing'),
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

  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const wagmiConfig = useConfig()

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error'

  useEffect(() => {
    if (status !== 'connecting') return
    if (!isConnected || !address || !walletProvider) return
    if (isPrivacyDeposit) {
      executePrivacyDeposit(address as Hex, walletProvider)
    } else {
      executeDeposit(address as Hex, walletProvider)
    }
  }, [status, isConnected, address, walletProvider])

  async function handleDeposit() {
    if (!transactionPlan) return
    setErrorMsg('')

    if (!isConnected) {
      setStatus('connecting')
      open({ view: 'Connect', namespace: 'eip155' })
      return
    }

    if (isPrivacyDeposit) {
      await executePrivacyDeposit(address as Hex, walletProvider!)
    } else {
      await executeDeposit(address as Hex, walletProvider!)
    }
  }

  // ── Stealth deposit (existing flow) ────────────────────────────────────────

  async function executeDeposit(account: Hex, provider: Provider) {
    if (!transactionPlan) return

    try {
      const chainEntry = getChain(transactionPlan.caipChainId)
      if (!chainEntry) throw new Error(`Chain ${transactionPlan.caipChainId} is not found in chain list.`)
      if (!chainEntry.vaultAddress) {
        throw new Error(`Vault contract is not configured for chain ${transactionPlan.caipChainId}.`)
      }

      const numericChainId = parseInt(chainEntry.chainId, 10)
      const vaultAddress = chainEntry.vaultAddress as Hex
      const tokenAddress = (transactionPlan.tokenAddress || ETH_SENTINEL) as Hex
      const merkleRoot = transactionPlan.merkleRoot as Hex
      const currentChainIdHex = await provider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${numericChainId.toString(16)}` }],
        })
      }

      const chainAssetEntry = getChainAssetByToken(transactionPlan.caipChainId, tokenAddress)
      const isNative = chainAssetEntry?.isNative ?? false

      if (!transactionPlan.totalAmount || BigInt(transactionPlan.totalAmount) <= 0n) {
        throw new Error('Total payroll amount is zero.')
      }
      const totalAmount = BigInt(transactionPlan.totalAmount)
      const walletClient = createWalletClient({
        account,
        transport: custom(provider),
      })
      const publicClient = getPublicClient(wagmiConfig, { chainId: numericChainId })
      if (!publicClient) throw new Error(`Public client for chain ${numericChainId} is not configured.`)
      const configuredChain = publicClient.chain
      if (!configuredChain) throw new Error(`Chain metadata for chain ${numericChainId} is not configured.`)

      if (!isNative) {
        setStatus('checking')
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account, vaultAddress],
        })

        if (allowance < totalAmount) {
          setStatus('approving')
          const approveTx = normalizeTransactionHash(await walletClient.writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [vaultAddress, totalAmount],
            chain: configuredChain,
          }))
          const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx })
          if (approveReceipt.status !== 'success') throw new Error('approve transaction reverted.')
        }
      }

      setStatus('authorizing')
      const { authSignature, claimTime } = await apis.transaction.getDepositAuth(transactionPlan.id)

      setStatus('depositing')
      const depositTx = normalizeTransactionHash(await walletClient.writeContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: 'depositForPayroll',
        args: [merkleRoot, tokenAddress, totalAmount, BigInt(claimTime), authSignature as Hex],
        ...(isNative ? { value: totalAmount } : {}),
        chain: configuredChain,
      }))
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status !== 'success') throw new Error('depositForPayroll transaction reverted.')
      // On-chain deposit succeeded (source of truth). Hand the backend confirm to the durable
      // retry queue so a flaky/timed-out confirm never fails the deposit; it persists + resumes.
      await confirmSync.enqueue({
        type: 'confirm-deposit',
        orgId: localStorage.getItem('organizationId') || '',
        batchId: transactionPlan.id,
        depositTxHash: depositTx,
        label: executingTransaction?.name || transactionPlan.id,
      })

      setStatus('done')
      onSuccess(depositTx)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  // ── Privacy deposit (new flow) ─────────────────────────────────────────────

  async function executePrivacyDeposit(account: Hex, provider: Provider) {
    if (!transactionPlan) return

    try {
      const chainEntry = getChain(transactionPlan.caipChainId)
      if (!chainEntry) throw new Error(`Chain ${transactionPlan.caipChainId} is not found in chain list.`)

      const numericChainId = parseInt(chainEntry.chainId, 10)
      if (!chainEntry.vaultAddress) {
        throw new Error(`GravArc contract is not configured for chain ${transactionPlan.caipChainId}.`)
      }
      const vaultAddress = chainEntry.vaultAddress as Hex
      const tokenAddress = (transactionPlan.tokenAddress || ETH_SENTINEL) as Hex

      const currentChainIdHex = await provider.request<string>({ method: 'eth_chainId' })
      if (parseInt(currentChainIdHex, 16) !== numericChainId) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${numericChainId.toString(16)}` }],
        })
      }

      const chainAssetEntry = getChainAssetByToken(transactionPlan.caipChainId, tokenAddress)
      const isNative = chainAssetEntry?.isNative ?? false

      if (!transactionPlan.totalAmount || BigInt(transactionPlan.totalAmount) <= 0n) {
        throw new Error('Total payroll amount is zero.')
      }

      const walletClient = createWalletClient({ account, transport: custom(provider) })
      const publicClient = getPublicClient(wagmiConfig, { chainId: numericChainId })
      if (!publicClient) throw new Error(`Public client for chain ${numericChainId} is not configured.`)
      const configuredChain = publicClient.chain
      if (!configuredChain) throw new Error(`Chain metadata for chain ${numericChainId} is not configured.`)

      // Fetch privacy deposit data (tier + per-member secretHash/encPubkey/amount)
      setStatus('fetching-data')
      const privacyData = await apis.transaction.getPrivacyDepositData(transactionPlan.id)

      // Fetch ZK circuit file CDN links
      setStatus('fetching-circuit')
      const circuitFiles = await apis.transaction.getCircuitFiles(
        transactionPlan.caipChainId,
        privacyData.tier,
      )

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
      // Each receiver's committed amount is GROSS = item amount + platformFee. The fee is added here,
      // per member, so the deposit tree commits the gross amount. At withdraw the contract pays the
      // recipient (gross − platformFee) and routes platformFee to the relayer (see privacyWithdraw.ts),
      // so the member nets exactly their item amount. m.platformFee MUST be the same value later used as
      // the withdraw fee (item.platformFee), otherwise the member is over/under-paid.
      setStatus('proving')
      const refundable = transactionPlan.privacyRefundable ?? true
      const depositorSecretHash = refundable ? readDepositorSecretHash() : null
      if (refundable && !depositorSecretHash) {
        throw new Error('Refundable deposit requires your account secret - please bind your wallet / set up your GravArc account first.')
      }
      const receivers = privacyData.members.map(m => ({
        address: m.address,
        secretHash: m.secretHash,
        encPubkey: m.encPubkey,
        amount: BigInt(m.amount) + BigInt(m.platformFee ?? '0'),
      }))
      const proofResult = await generateDepositProof(
        receivers,
        BigInt(tokenAddress),
        circuitFiles.wasmUrl,
        circuitFiles.zkeyUrl,
        { nextIndex: depositPath.nextIndex, siblings: depositPath.siblings },
        refundable,
        depositorSecretHash,
      )

      // The proof's public totalAmount (Σ gross) must equal the plan total (which also includes service
      // fee). A mismatch means the per-member platformFee fed into the proof is out of sync with the
      // backend — deposit would revert (totalAmount is a proof public input) or mis-credit members.
      if (proofResult.totalAmount !== BigInt(transactionPlan.totalAmount)) {
        throw new Error(
          `Deposit total mismatch: proof totalAmount=${proofResult.totalAmount} but plan totalAmount=${transactionPlan.totalAmount}. ` +
          `Ensure each member's platformFee is present in privacy-deposit-data.`,
        )
      }

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
          depositTxHash = await walletClient.writeContract({ ...depositArgs, gas: 3_000_000n })
        } else {
          throw gasErr
        }
      }
      const depositTx = normalizeTransactionHash(depositTxHash)
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositTx })
      if (receipt.status !== 'success') throw new Error('privacyDeposit transaction reverted.')

      // Encrypt per-receiver withdraw messages and confirm deposit
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

      // 可退款存款：构造退款载荷，用存款人 encPubkey 加密为 encContent 随 confirm 上传后端（便携化：
      // 任意设备登录取回解密），并本地存一份作兜底（confirm 重试耗尽时原设备仍可退款）。
      let refundEncContent: string | undefined
      let refundDepositInfo: string | undefined
      if (refundable && proofResult.refundSlots.length > 0) {
        const refundPayload = {
          batchId: transactionPlan.id,
          leafIndex: proofResult.leafIndex,
          token: tokenAddress,
          tier: proofResult.tier,
          authRoot: proofResult.authRoot,
          depositLeaf: proofResult.depositLeaf,
          depositorSecretHash: proofResult.depositorSecretHash,
          slots: proofResult.refundSlots,
        }
        try {
          localStorage.setItem(
            `gravArcRefundPayload:${transactionPlan.id}`,
            JSON.stringify(refundPayload),
          )
        } catch {
          // localStorage 写入失败不阻断存款流程。
        }
        const depositorEncPubkey = readDepositorEncPubkey()
        if (depositorEncPubkey) {
          try {
            const pubKeyHex = depositorEncPubkey.startsWith('0x')
              ? depositorEncPubkey.slice(2)
              : depositorEncPubkey
            refundEncContent = naclEncrypt(JSON.stringify(refundPayload), pubKeyHex)
            refundDepositInfo = JSON.stringify({
              depositorSecretHash: proofResult.depositorSecretHash,
              encPubkey: depositorEncPubkey,
            })
          } catch {
            // 加密失败不阻断存款；便携化退款不可用，本机 localStorage 兜底仍可退款。
          }
        }
      }

      // On-chain privacy deposit succeeded - queue the backend confirm (carrying the encrypted
      // withdraw messages + encrypted refund payload) for durable retry rather than awaiting a single fragile call.
      await confirmSync.enqueue({
        type: 'confirm-privacy-deposit',
        orgId: localStorage.getItem('organizationId') || '',
        batchId: transactionPlan.id,
        depositTxHash: depositTx,
        withdrawMessages,
        ...(refundEncContent !== undefined ? { encContent: refundEncContent } : {}),
        ...(refundDepositInfo !== undefined ? { depositInfo: refundDepositInfo } : {}),
        label: executingTransaction?.name || transactionPlan.id,
      })

      setStatus('done')
      onSuccess(depositTx)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err?.shortMessage || err?.message || String(err))
      setStatus('error')
    }
  }

  // ── Progress step lists per flow ───────────────────────────────────────────

  const stealthSteps: DepositStatus[] = ['authorizing', 'checking', 'approving', 'depositing']
  const stealthLabels = ['Auth', 'Allowance', 'Approve', 'Deposit']

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

  const activeSteps = isPrivacyDeposit ? privacySteps : stealthSteps
  const activeLabels = isPrivacyDeposit ? privacyLabels : stealthLabels

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
          <InfoRow label={t('pages.transactions.totalAmount')}>
            {executingTransaction.totalAmount} {executingTransaction.currency}
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

      {/* Footer */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleDeposit}
          disabled={isBusy || status === 'done'}
          className="h-[38px] px-[16px] rounded-[12px] bg-[#5e85ee] text-[13px] text-white hover:bg-[#5e85ee]/90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {stepLabels[status]}
        </button>
      </div>
    </div>
  )
}
