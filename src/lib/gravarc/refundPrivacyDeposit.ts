'use client'

import apis from '@/apis'
import { confirmSync } from '@/lib/confirm-sync'
import { loadPreparedDeposit } from '@/lib/confirm-sync/preparedDeposit'
import { GRAVARC_ABI } from '@/lib/gravarc/gravarcAbi'
import { verifyDepositMembershipPath } from '@/lib/gravarc/depositMembershipPath'
import {
  deriveNaclKeyPair,
  naclDecryptWithKeyPair,
  secretboxDecryptWithKey,
} from '@/lib/gravarc/naclCrypto'
import { poseidonHash } from '@/lib/gravarc/poseidon'
import { generateRefundProof, type RefundSlot } from '@/lib/gravarc/refundProofBrowser'
import { verifyRefundPayloadCommitment } from './refundPayloadCommitment'
import type { DepositorStatusPayload } from './depositorClaimStatus'
import type { Provider } from '@reown/appkit/react'
import type { BoxKeyPair } from 'tweetnacl'
import { createPublicClient, custom, type Hex, type WalletClient } from 'viem'

/** 存款时本地保存的退款载荷（见 execute-confirm-dialog-content.tsx）。 */
export type RefundPayload = {
  batchId: string
  leafIndex: number
  token: string
  tier: number
  authRoot: string
  depositLeaf: string
  depositorSecretHash: string
  slots: RefundSlot[]
}

type DepositorPayload = RefundPayload | DepositorStatusPayload

/** Pending ciphertext is a fallback until the backend has confirmed delivery. */
export function readRefundPayload(batchId: string, keyPair: { secretKey: Uint8Array }): DepositorPayload | null {
  try {
    const pending = loadPreparedDeposit(localStorage.getItem('userId') ?? '', localStorage.getItem('organizationId') ?? '', batchId)
    if (pending?.encContent) return JSON.parse(naclDecryptWithKeyPair(pending.encContent, keyPair)) as DepositorPayload
    // Read-only legacy fallback. New deposits never write plaintext refund slots.
    const raw = localStorage.getItem(`gravArcRefundPayload:${batchId}`)
    if (!raw) return null
    return JSON.parse(raw) as RefundPayload
  } catch {
    return null
  }
}

export async function loadDepositorPayload(batchId: string, keyPair: { secretKey: Uint8Array }): Promise<DepositorPayload> {
  let payload: DepositorPayload | null = null
  try {
    const { encContent } = await apis.transaction.getRefundPayload(batchId)
    if (encContent) payload = JSON.parse(naclDecryptWithKeyPair(encContent, keyPair)) as DepositorPayload
  } catch {
    // Pending local ciphertext can be used while delivery is still syncing.
  }
  payload ??= readRefundPayload(batchId, keyPair)
  if (!payload) throw new Error('Depositor recovery data is unavailable for this deposit')
  if (payload.batchId !== batchId) {
    throw new Error('Depositor recovery data does not match this deposit')
  }
  return payload
}

export async function loadDepositorRefundPayload(batchId: string, keyPair: { secretKey: Uint8Array }): Promise<RefundPayload> {
  const payload = await loadDepositorPayload(batchId, keyPair)
  if (!Array.isArray(payload.slots) || payload.slots.length !== payload.tier) {
    throw new Error('Depositor recovery data does not match this deposit')
  }
  await verifyRefundPayloadCommitment(payload)
  return payload as RefundPayload
}

function toHex64(n: bigint): `0x${string}` {
  return ('0x' + n.toString(16).padStart(64, '0')) as `0x${string}`
}

/**
 * 在浏览器端完成 GravArc 隐私存款退款。
 *
 * 便携化：退款载荷优先从后端 deposition 的 encContent 解密取回（存款人 encPubkey 加密，
 *   任意设备登录、用同一钱包+密码派生密钥即可解密），本机 localStorage 作为兜底。
 *
 * 存款人钱包直发（relayer=refunder=存款人）；链上成功后持久化确认。
 */
export async function refundPrivacyDeposit(params: {
  batchId: string
  caipChainId: string
  gravArcAddress: Hex
  account: Hex
  walletClient: WalletClient
  provider: Provider
  chainIdNum: number
  chainName: string
  password: string
  cachedKeyPair?: BoxKeyPair | null
  onUnlocked?: (keyPair: BoxKeyPair) => void
  /** Reserved for the disabled relayed-operation choice. */
  delegate: boolean
  onStatus?: (msg: string) => void
}): Promise<{ txHash: string }> {
  const {
    batchId, caipChainId, gravArcAddress, account, walletClient, provider,
    chainIdNum, chainName, password, cachedKeyPair, onUnlocked, delegate, onStatus,
  } = params

  if (delegate) throw new Error('Relayed refund is not available yet')

  // 1. 派生 NaCl 密钥对（密码 + 钱包 EIP-712 签名，确定性，跨设备可重建）
  onStatus?.('Unlocking account…')
  const keyPair = cachedKeyPair ?? await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])

  // 2. Recover the account ciphertext from the backend, as Core does.
  onStatus?.('Decrypting depositor secret…')
  const info = await apis.auth.getMyGravArcUserInfo()
  if (!info?.encryptedSecret) {
    throw new Error('Missing depositor GravArc account secret - please bind your wallet first.')
  }
  if (info.address.toLowerCase() !== account.toLowerCase()) {
    throw new Error('Connected wallet does not match the bound privacy wallet')
  }
  let depositSecret: string
  try {
    depositSecret = secretboxDecryptWithKey(info.encryptedSecret, keyPair.secretKey)
  } catch {
    throw new Error('Failed to decrypt depositor secret - wrong password?')
  }

  // 3. 取退款载荷：优先后端 encContent（便携化，任意设备），fallback 本机 localStorage（兜底）
  onStatus?.('Loading refund payload…')
  const payload = await loadDepositorRefundPayload(batchId, keyPair)
  onUnlocked?.(keyPair)

  // 4. 拉取并核验最新 deposit 成员路径，不能仅信任扫描器返回值。
  onStatus?.('Fetching deposit membership path…')
  const path = await apis.transaction.getDepositMembershipPath(caipChainId, payload.leafIndex)
  const membership = await verifyDepositMembershipPath(
    path,
    payload.leafIndex,
    payload.authRoot,
    payload.depositorSecretHash,
    payload.depositLeaf,
  )

  // 5. 链上读各 nullifier 的 claimed 与 refunded 状态
  onStatus?.('Checking on-chain claim state…')
  const chain = {
    id: chainIdNum,
    name: chainName,
    nativeCurrency: { name: 'Native Token', symbol: 'NATIVE', decimals: 18 },
    rpcUrls: { default: { http: [] }, public: { http: [] } },
  } as const
  const publicClient = createPublicClient({ chain: chain as any, transport: custom(provider) })

  let totalClaimed = 0n
  for (const slot of payload.slots) {
    const nullifierHash = toHex64(await poseidonHash([BigInt(slot.nullifier)]))
    const [claimed] = (await publicClient.readContract({
      address: gravArcAddress,
      abi: GRAVARC_ABI,
      functionName: 'nullifierHashes',
      args: [nullifierHash],
    })) as [bigint, bigint]
    totalClaimed += claimed
    const refunded = (await publicClient.readContract({
      address: gravArcAddress,
      abi: GRAVARC_ABI,
      functionName: 'refundedNullifierHashes',
      args: [nullifierHash],
    })) as boolean
    if (refunded) {
      throw new Error('This deposit has already been refunded on-chain.')
    }
  }

  const totalWithdraw = payload.slots.reduce((s, sl) => s + BigInt(sl.withdrawAmount), 0n)
  const refundAmount = totalWithdraw - totalClaimed
  if (refundAmount <= 0n) {
    throw new Error('Nothing to refund - all allocations already fully claimed.')
  }
  // 最低手续费 0.1%（ceil）
  const fee = (refundAmount + 999n) / 1000n

  // Direct submission returns the proof fee to the same wallet paying gas.
  const relayer = account

  // 7. 拉取 refund 电路并生成证明
  onStatus?.('Preparing refund circuit…')
  onStatus?.('Generating refund ZK proof in browser…')
  const proof = await generateRefundProof({
    slots: payload.slots,
    depositSecret,
    token: payload.token,
    tier: payload.tier,
    leafIndex: payload.leafIndex,
    depositPathElements: membership.pathElements,
    depositPathIndices: membership.pathIndices,
    totalClaimed,
    fee,
    relayer,
    refunder: account,
    onStatus,
  })

  // 自托付直发：存款人钱包直接调合约 refund（msg.sender == relayer == refunder == account）
  onStatus?.('Submitting refund from your wallet…')
  const refundArgs = {
    address: gravArcAddress,
    abi: GRAVARC_ABI,
    functionName: 'refund',
    args: [
      {
        pA: [BigInt(proof.proof.pA[0]), BigInt(proof.proof.pA[1])] as [bigint, bigint],
        pB: [
          [BigInt(proof.proof.pB[0][0]), BigInt(proof.proof.pB[0][1])],
          [BigInt(proof.proof.pB[1][0]), BigInt(proof.proof.pB[1][1])],
        ] as [[bigint, bigint], [bigint, bigint]],
        pC: [BigInt(proof.proof.pC[0]), BigInt(proof.proof.pC[1])] as [bigint, bigint],
        depositRoot: BigInt(proof.depositRoot),
        nullifierHash: proof.nullifierHash as readonly `0x${string}`[],
        token: proof.token as Hex,
        refundAmount: proof.refundAmount,
        fee: proof.fee,
        relayer: proof.relayer as Hex,
        refunder: proof.refunder as Hex,
        tier: proof.tier,
      },
    ],
    chain: chain as any,
  } as const

  const txHash = await walletClient.writeContract(refundArgs)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') {
    throw new Error('Refund transaction reverted on-chain')
  }

  // 链上已成功，异步回调后端落库（永不 reject：confirm 失败走持久化重试，不让"已退款"变"失败"）
  const orgId = localStorage.getItem('organizationId') || ''
  await confirmSync.enqueue({
    type: 'confirm-refund-gravarc',
    orgId,
    batchId,
    refundTxHash: txHash,
    label: batchId,
  })

  return { txHash }
}
