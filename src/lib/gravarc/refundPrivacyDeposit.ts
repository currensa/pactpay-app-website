'use client'

import apis from '@/apis'
import { confirmSync } from '@/lib/confirm-sync'
import { GRAVARC_ABI } from '@/lib/gravarc/gravarcAbi'
import {
  deriveNaclKeyPair,
  naclDecryptWithKeyPair,
  secretboxDecryptWithKey,
} from '@/lib/gravarc/naclCrypto'
import { poseidonHash } from '@/lib/gravarc/poseidon'
import { generateRefundProof, type RefundSlot } from '@/lib/gravarc/refundProofBrowser'
import type { Provider } from '@reown/appkit/react'
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

/** 读取本机保存的退款载荷；不在本机则返回 null。便携化后非唯一来源（后端 encContent 优先）。 */
export function readRefundPayload(batchId: string): RefundPayload | null {
  try {
    const raw = localStorage.getItem(`gravArcRefundPayload:${batchId}`)
    if (!raw) return null
    return JSON.parse(raw) as RefundPayload
  } catch {
    return null
  }
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
 * 提交路径由 delegate 决定（受链级 refundRelayerSupported 约束）：
 *  - delegate=true（默认）：平台 relayer 代付上链（relay-refund），fee 归平台。
 *  - delegate=false：存款人钱包自托付直发（relayer=refunder=存款人，msg.sender==relayer 成立），
 *    fee 回流自己，链上成功后异步 confirm-refund-gravarc 回调落库。
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
  /** true=平台 relayer 代付；false=存款人钱包直发。链不支持代付时强制 false。 */
  delegate: boolean
  /** 委托时的平台 relayer 地址（delegate=true 必填）。 */
  relayerAddress?: Hex
  onStatus?: (msg: string) => void
}): Promise<{ txHash: string }> {
  const {
    batchId, caipChainId, gravArcAddress, account, walletClient, provider,
    chainIdNum, chainName, password, delegate, relayerAddress, onStatus,
  } = params

  // 1. 派生 NaCl 密钥对（密码 + 钱包 EIP-712 签名，确定性，跨设备可重建）
  onStatus?.('Unlocking account…')
  const keyPair = await deriveNaclKeyPair(password, walletClient as Parameters<typeof deriveNaclKeyPair>[1])

  // 2. 解密存款人 depositSecret（来自后端 gravArcUserInfo.encryptedSecret，任意设备登录即有）
  onStatus?.('Decrypting depositor secret…')
  const raw = localStorage.getItem('gravArcUserInfo')
  const info = raw ? (JSON.parse(raw) as { encryptedSecret?: string }) : null
  if (!info?.encryptedSecret) {
    throw new Error('Missing depositor GravArc account secret - please bind your wallet first.')
  }
  let depositSecret: string
  try {
    depositSecret = secretboxDecryptWithKey(info.encryptedSecret, keyPair.secretKey)
  } catch {
    throw new Error('Failed to decrypt depositor secret - wrong password?')
  }

  // 3. 取退款载荷：优先后端 encContent（便携化，任意设备），fallback 本机 localStorage（兜底）
  onStatus?.('Loading refund payload…')
  let payload: RefundPayload | null = null
  try {
    const { encContent } = await apis.transaction.getRefundPayload(batchId)
    if (encContent) {
      payload = JSON.parse(naclDecryptWithKeyPair(encContent, keyPair)) as RefundPayload
    }
  } catch {
    // 后端不可达时回落本机 localStorage
  }
  if (!payload) {
    payload = readRefundPayload(batchId)
  }
  if (!payload) {
    throw new Error(
      'Refund payload not found. If this deposit was created on another device, ensure the deposit has been confirmed on-chain so the encrypted refund payload is available on the server.',
    )
  }

  // 4. 拉取最新 deposit 成员路径（针对 leafIndex，相对当前 currentRoot）
  onStatus?.('Fetching deposit membership path…')
  const path = await apis.transaction.getDepositMembershipPath(caipChainId, payload.leafIndex)

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

  // 6. relayer 取值：委托=平台 relayer（fee 归平台）；直发=存款人自己（relayer=refunder=account，fee 回流自己）
  const relayer = delegate ? (relayerAddress as Hex) : account

  // 7. 拉取 refund 电路并生成证明
  onStatus?.('Preparing refund circuit…')
  const circuit = await apis.transaction.getCircuitFiles(caipChainId, payload.tier, 'refund')

  onStatus?.('Generating refund ZK proof in browser…')
  const proof = await generateRefundProof({
    slots: payload.slots,
    depositSecret,
    token: payload.token,
    tier: payload.tier,
    leafIndex: payload.leafIndex,
    depositPathElements: path.siblings,
    depositPathIndices: path.pathIndices,
    totalClaimed,
    fee,
    relayer,
    refunder: account,
    wasmUrl: circuit.wasmUrl,
    zkeyUrl: circuit.zkeyUrl,
    onStatus,
  })

  // 8. 提交：委托走 relay-refund；直发走钱包 writeContract + confirm-refund-gravarc 回调
  if (delegate) {
    onStatus?.('Submitting refund via platform…')
    const res = await apis.transaction.relayGravArcRefund(batchId, {
      pA: proof.proof.pA,
      pB: proof.proof.pB,
      pC: proof.proof.pC,
      depositRoot: proof.depositRoot,
      nullifierHash: proof.nullifierHash,
      token: proof.token,
      refundAmount: proof.refundAmount.toString(),
      fee: proof.fee.toString(),
      relayer: proof.relayer,
      refunder: proof.refunder,
      tier: proof.tier,
    })
    return { txHash: res.txHash }
  }

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
