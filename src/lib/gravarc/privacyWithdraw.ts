'use client'

import type { PrivacyPayrollItem } from '@/apis/transaction.api'
import { confirmSync } from '@/lib/confirm-sync'
import { GRAVARC_ABI } from '@/lib/gravarc/gravarcAbi'
import { verifyDepositMembershipPath } from '@/lib/gravarc/depositMembershipPath'
import apis from '@/apis'
import { naclDecryptWithKeyPair, secretboxDecryptWithKey } from '@/lib/gravarc/naclCrypto'
import {
  computeNullifierHash,
  generateWithdrawProof,
  type WithdrawInfo,
} from '@/lib/gravarc/withdrawProofBrowser'
import { normalizeTransactionHash } from '@/utils/evm-transaction'
import { privateWithdrawBalance, validatePrivateWithdrawAmount } from './privateWithdrawBalance'
import type { Provider } from '@reown/appkit/react'
import { createPublicClient, createWalletClient, custom, type Hex } from 'viem'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrivacyWithdrawParams {
  item: PrivacyPayrollItem
  recipient: string
  expectedAmount: bigint
  /** NaCl box key pair derived once from the user's password (decrypts content + secret). */
  keyPair: { secretKey: Uint8Array }
  walletProvider: Provider
  account: string
  chainIdNum: number
  chainName: string
  /** Reserved for the disabled relayed-operation choice. */
  delegate?: boolean
  onStatus?: (msg: string) => void
}
export interface PrivacyWithdrawResult {
  itemId: string
  txHash: string
}

// Decrypted withdraw-message payload produced by the deposit flow
// (see execute-confirm-dialog-content.tsx). Note it carries `depositRoot` but NOT
// `authRoot` / `token` / `tier` — those are supplied from `withdrawData` / the item.
interface DecryptedWithdrawMessage {
  nullifier: string
  amount: string
  leafIndex: number
  authRoot: string
  depositorSecretHash: string
  depositPathElements: string[]
  depositPathIndices: number[]
  authPathElements: string[]
  authPathIndices: number[]
}

/** One owned payroll allocation; DeFi and direct withdrawal use the same witness. */
export function unlockPrivacyPayrollItem(
  item: PrivacyPayrollItem,
  keyPair: { secretKey: Uint8Array },
  account: string,
): { info: WithdrawInfo; rawSecret: string } {
  const wd = item.withdrawData
  if (!wd?.content || !wd.encryptedSecret || !wd.privacyDepositLeaf || wd.leafIndex == null || wd.tier == null) {
    throw new Error('Confirmed encrypted allocation is unavailable')
  }
  if (!item.recipient || item.recipient.toLowerCase() !== account.toLowerCase()) {
    throw new Error('Connect the wallet that owns this allocation')
  }
  let decoded: DecryptedWithdrawMessage
  try { decoded = JSON.parse(naclDecryptWithKeyPair(wd.content, keyPair)) as DecryptedWithdrawMessage }
  catch { throw new Error('Failed to decrypt withdraw message — wrong password?') }
  if (decoded.leafIndex !== wd.leafIndex) throw new Error('Encrypted allocation has a different deposit leaf index')
  let rawSecret: string
  try { rawSecret = secretboxDecryptWithKey(wd.encryptedSecret, keyPair.secretKey) }
  catch { throw new Error('Failed to decrypt your secret — wrong password?') }
  return {
    rawSecret,
    info: {
      nullifier: decoded.nullifier,
      amount: decoded.amount,
      token: item.tokenAddress || item.batch.tokenAddress,
      authRoot: decoded.authRoot,
      depositorSecretHash: decoded.depositorSecretHash,
      authPathElements: decoded.authPathElements,
      authPathIndices: decoded.authPathIndices,
      leafIndex: wd.leafIndex,
      depositPathElements: decoded.depositPathElements,
      depositPathIndices: decoded.depositPathIndices,
      tier: wd.tier,
    },
  }
}

/** Read a receiver's private balance only after decrypting its own message. */
export async function readPrivacyWithdrawState(
  item: PrivacyPayrollItem,
  keyPair: { secretKey: Uint8Array },
  walletProvider: Provider,
) {
  const wd = item.withdrawData
  if (!wd?.content || !wd.gravArcAddress || wd.leafIndex == null) {
    throw new Error('Withdrawal message is not ready')
  }
  let decoded: DecryptedWithdrawMessage
  try {
    decoded = JSON.parse(naclDecryptWithKeyPair(wd.content, keyPair)) as DecryptedWithdrawMessage
  } catch {
    throw new Error('Failed to decrypt withdraw message — wrong password?')
  }
  if (decoded.leafIndex !== wd.leafIndex) throw new Error('Encrypted withdrawal message has a different deposit leaf index')
  const nullifierHash = await computeNullifierHash(decoded.nullifier)
  const publicClient = createPublicClient({ transport: custom(walletProvider) })
  const [claimed] = await publicClient.readContract({
    address: wd.gravArcAddress as Hex,
    abi: GRAVARC_ABI,
    functionName: 'nullifierHashes',
    args: [nullifierHash],
  })
  const refunded = await publicClient.readContract({
    address: wd.gravArcAddress as Hex,
    abi: GRAVARC_ABI,
    functionName: 'refundedNullifierHashes',
    args: [nullifierHash],
  })
  return privateWithdrawBalance(BigInt(decoded.amount), claimed, refunded)
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Performs the full privacy_deposit withdraw for a single payroll item, entirely
 * client-side: decrypt → ZK proof → on-chain `withdraw()` → confirm-withdraw callback.
 *
 * Throws on failure. Throws a sentinel-free Error with `code === 'nothing-to-claim'`
 * when the allocation has already been fully withdrawn so callers can skip quietly.
 */
export async function withdrawPrivacyItem(params: PrivacyWithdrawParams): Promise<PrivacyWithdrawResult> {
  const { item, recipient, expectedAmount, keyPair, walletProvider, account, chainIdNum, chainName, delegate, onStatus } =
    params

  if (delegate) throw new Error('Relayed withdrawal is not available yet')

  const wd = item.withdrawData
  if (!wd) throw new Error('This item has no withdraw data')
  if (!wd.content) throw new Error('Missing encrypted withdraw message')
  if (!wd.encryptedSecret) throw new Error('Missing encrypted secret — please bind your wallet first')
  if (!wd.privacyDepositLeaf) throw new Error('Deposit not confirmed yet for this item')
  if (wd.leafIndex === null || wd.leafIndex === undefined) throw new Error('Missing deposit leaf index')
  if (!wd.gravArcAddress) throw new Error('GravArc contract is not configured for this chain')
  if (wd.tier === null || wd.tier === undefined) throw new Error('Missing tier for this deposit')

  const gravArcAddress = wd.gravArcAddress as Hex
  onStatus?.('Decrypting withdraw message…')
  const { info, rawSecret } = unlockPrivacyPayrollItem(item, keyPair, account)

  // 2. Build viem clients over the connected wallet provider.
  const chain = {
    id: chainIdNum,
    name: chainName,
    nativeCurrency: { name: 'Native Token', symbol: 'NATIVE', decimals: 18 },
    rpcUrls: { default: { http: [] }, public: { http: [] } },
  } as const
  const publicClient = createPublicClient({ chain: chain as any, transport: custom(walletProvider) })
  const walletClient = createWalletClient({ account: account as Hex, chain: chain as any, transport: custom(walletProvider) })

  // 3. Read on-chain claim state for this nullifier.
  onStatus?.('Checking on-chain withdrawal state…')
  const nullifierHash = await computeNullifierHash(info.nullifier)
  const [claimed, nextNonce] = await publicClient.readContract({
    address: gravArcAddress,
    abi: GRAVARC_ABI,
    functionName: 'nullifierHashes',
    args: [nullifierHash],
  })
  const refunded = await publicClient.readContract({
    address: gravArcAddress,
    abi: GRAVARC_ABI,
    functionName: 'refundedNullifierHashes',
    args: [nullifierHash],
  })
  if (refunded) throw new Error('This allocation was refunded on-chain')

  onStatus?.('Refreshing deposit membership path…')
  const path = await apis.transaction.getDepositMembershipPath(wd.caipChainId, info.leafIndex)
  const membership = await verifyDepositMembershipPath(
    path,
    info.leafIndex,
    info.authRoot,
    info.depositorSecretHash,
    wd.privacyDepositLeaf,
  )
  const freshInfo = {
    ...info,
    depositPathElements: membership.pathElements,
    depositPathIndices: membership.pathIndices,
  }

  const { remaining } = privateWithdrawBalance(BigInt(info.amount), claimed, false)
  if (remaining <= 0n) {
    const err = new Error('Nothing left to claim — already fully withdrawn') as Error & { code?: string }
    err.code = 'nothing-to-claim'
    throw err
  }

  // Core direct withdrawal uses the connected transaction sender as relayer.
  // Its proof fee returns to that wallet; the sender also pays network gas.
  validatePrivateWithdrawAmount(expectedAmount, remaining)
  const fee = (expectedAmount + 999n) / 1000n
  const relayer = account as Hex

  // 5. Fetch the withdraw circuit files and generate the proof in-browser.
  onStatus?.('Preparing ZK circuit…')
  const proof = await generateWithdrawProof(
    freshInfo,
    rawSecret,
    recipient,
    fee,
    claimed,
    nextNonce,
    expectedAmount,
    relayer,
    onStatus,
  )

  // 6. Submit the withdraw transaction.
  onStatus?.('Sending withdraw transaction…')
  const b = (x: string) => BigInt(x)
  const { pA, pB, pC } = proof.proof
  const withdrawArgs = {
    address: gravArcAddress,
    abi: GRAVARC_ABI,
    functionName: 'withdraw',
    args: [{
      pA: [b(pA[0]), b(pA[1])] as [bigint, bigint],
      pB: [[b(pB[0][0]), b(pB[0][1])], [b(pB[1][0]), b(pB[1][1])]] as [[bigint, bigint], [bigint, bigint]],
      pC: [b(pC[0]), b(pC[1])] as [bigint, bigint],
      nullifierHash: proof.nullifierHash,
      recipient: recipient as Hex,
      claimedAmount: proof.claimedAmount,
      token: proof.token,
      tier: proof.tier,
      depositRoot: proof.depositRoot,
      expectedAmount: proof.expectedAmount,
      fee: proof.fee,
      relayer: proof.relayer,
      nonce: proof.nonce,
    }],
    chain: chain as any,
  } as const

  let txHashRaw: Hex
  try {
    txHashRaw = await walletClient.writeContract(withdrawArgs)
  } catch (gasErr: unknown) {
    const msg = gasErr instanceof Error ? gasErr.message.toLowerCase() : ''
    if (msg.includes('gas') && msg.includes('high')) {
      txHashRaw = await walletClient.writeContract({ ...withdrawArgs, gas: 3_000_000n })
    } else {
      throw gasErr
    }
  }
  const txHash = normalizeTransactionHash(txHashRaw)

  onStatus?.('Waiting for confirmation…')
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') throw new Error('withdraw transaction reverted')

  // 7. Verify the public receipt asynchronously; this cannot establish the
  // private allocation's partial or final claim state.
  onStatus?.('Confirming…')
  if (item.source !== 'defi') {
    await confirmSync.enqueue({
      type: 'confirm-withdraw',
      itemId: item.id,
      txHash,
      label: item.transactionName ?? item.id,
    })
  }

  return { itemId: item.id, txHash }
}
