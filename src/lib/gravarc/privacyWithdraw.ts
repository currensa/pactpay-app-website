'use client'

import apis from '@/apis'
import type { StealthPayrollItem } from '@/apis/transaction.api'
import { confirmSync } from '@/lib/confirm-sync'
import { GRAVARC_ABI } from '@/lib/gravarc/gravarcAbi'
import { naclDecryptWithKeyPair, secretboxDecryptWithKey } from '@/lib/gravarc/naclCrypto'
import {
  computeNullifierHash,
  generateWithdrawProof,
  type WithdrawInfo,
} from '@/lib/gravarc/withdrawProofBrowser'
import { normalizeTransactionHash } from '@/utils/evm-transaction'
import type { Provider } from '@reown/appkit/react'
import { createPublicClient, createWalletClient, custom, type Hex } from 'viem'

// ── Relayer (fee recipient) ─────────────────────────────────────────────────
// Hardcoded per product decision: the privacy-withdraw fee (0.1%) is paid to this
// address. The recipient (who receives expectedAmount − fee) is supplied by the user.
// NOTE: replace with the platform's official fee-collection address before production.
// While it is the zero sentinel, the fee is routed back to the recipient so the
// withdraw does not revert on an ERC-20 transfer to the zero address during testing.
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex
export const PRIVACY_WITHDRAW_RELAYER: Hex = ZERO_ADDRESS

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrivacyWithdrawParams {
  item: StealthPayrollItem
  recipient: string
  /** NaCl box key pair derived once from the user's password (decrypts content + secret). */
  keyPair: { secretKey: Uint8Array }
  walletProvider: Provider
  account: string
  chainIdNum: number
  chainName: string
  /**
   * When true, the proof is generated with `relayer = relayerAddress` and the withdraw is submitted
   * by the platform relayer (the user pays no gas); otherwise the user's wallet submits it.
   */
  delegate?: boolean
  /** Platform relayer address — required when `delegate` is true (becomes the proof's relayer). */
  relayerAddress?: string
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
  depositPathElements: string[]
  depositPathIndices: number[]
  authPathElements: string[]
  authPathIndices: number[]
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
  const { item, recipient, keyPair, walletProvider, account, chainIdNum, chainName, delegate, relayerAddress, onStatus } =
    params

  if (delegate && !relayerAddress) {
    throw new Error('Missing platform relayer address for delegated withdraw')
  }

  const wd = item.withdrawData
  if (!wd) throw new Error('This item has no withdraw data')
  if (!wd.content) throw new Error('Missing encrypted withdraw message')
  if (!wd.encryptedSecret) throw new Error('Missing encrypted secret — please bind your wallet first')
  if (!wd.privacyAuthRoot) throw new Error('Missing authRoot for this deposit')
  if (!wd.gravArcAddress) throw new Error('GravArc contract is not configured for this chain')
  if (wd.tier === null || wd.tier === undefined) throw new Error('Missing tier for this deposit')

  const gravArcAddress = wd.gravArcAddress as Hex
  const tokenAddress = (item.tokenAddress || item.batch.tokenAddress) as string

  // 1. Decrypt the withdraw message (NaCl box) and the user's own Secret (NaCl secretbox).
  onStatus?.('Decrypting withdraw message…')
  let decoded: DecryptedWithdrawMessage
  try {
    decoded = JSON.parse(naclDecryptWithKeyPair(wd.content, keyPair)) as DecryptedWithdrawMessage
  } catch {
    throw new Error('Failed to decrypt withdraw message — wrong password?')
  }
  let rawSecret: string
  try {
    rawSecret = secretboxDecryptWithKey(wd.encryptedSecret, keyPair.secretKey)
  } catch {
    throw new Error('Failed to decrypt your secret — wrong password?')
  }

  // Assemble the circuit input. token/tier/authRoot come from outside the message.
  const info: WithdrawInfo = {
    nullifier: decoded.nullifier,
    amount: decoded.amount,
    token: tokenAddress,
    authRoot: wd.privacyAuthRoot,
    authPathElements: decoded.authPathElements,
    authPathIndices: decoded.authPathIndices,
    leafIndex: decoded.leafIndex ?? wd.leafIndex ?? 0,
    depositPathElements: decoded.depositPathElements,
    depositPathIndices: decoded.depositPathIndices,
    tier: wd.tier,
  }

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

  const total = BigInt(info.amount)
  const remaining = total - claimed
  if (remaining <= 0n) {
    const err = new Error('Nothing left to claim — already fully withdrawn') as Error & { code?: string }
    err.code = 'nothing-to-claim'
    throw err
  }

  // 4. Full withdrawal: use platformFee from the item when available (goes to the relayer);
  // fall back to ceil(0.1%) for items that pre-date the platformFee field.
  const expectedAmount = remaining
  const fee = item.platformFee ? BigInt(item.platformFee) : (expectedAmount + 999n) / 1000n
  const relayer = delegate
    ? (relayerAddress as Hex)
    : PRIVACY_WITHDRAW_RELAYER === ZERO_ADDRESS
      ? (recipient as Hex)
      : PRIVACY_WITHDRAW_RELAYER

  // 5. Fetch the withdraw circuit files and generate the proof in-browser.
  onStatus?.('Preparing ZK circuit…')
  const circuit = await apis.transaction.getCircuitFiles(wd.caipChainId, info.tier, 'withdraw')

  const proof = await generateWithdrawProof(
    info,
    rawSecret,
    recipient,
    fee,
    circuit.wasmUrl,
    circuit.zkeyUrl,
    claimed,
    nextNonce,
    expectedAmount,
    relayer,
    onStatus,
  )

  // 6a. Delegated path: hand the proof to the platform relayer, which submits the withdraw on-chain
  // (the user pays no gas). The backend marks the item claimed itself, so no confirm-withdraw call.
  if (delegate) {
    onStatus?.('Submitting via platform…')
    const { pA, pB, pC } = proof.proof
    const res = await apis.transaction.relayPrivacyWithdraw(item.id, {
      pA: [pA[0], pA[1]],
      pB: [
        [pB[0][0], pB[0][1]],
        [pB[1][0], pB[1][1]],
      ],
      pC: [pC[0], pC[1]],
      nullifierHash: proof.nullifierHash,
      recipient,
      claimedAmount: proof.claimedAmount.toString(),
      token: proof.token,
      tier: proof.tier,
      depositRoot: proof.depositRoot.toString(),
      expectedAmount: proof.expectedAmount.toString(),
      fee: proof.fee.toString(),
      relayer: proof.relayer,
      nonce: proof.nonce.toString(),
    })
    return { itemId: item.id, txHash: res.txHash }
  }

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

  // 7. Notify the backend so the payroll item is marked claimed. The on-chain withdraw already
  // succeeded, so this confirm is queued for durable retry (persisted across reloads) instead of
  // being awaited once — a failed confirm must not mark an already-withdrawn item as failed.
  onStatus?.('Confirming…')
  await confirmSync.enqueue({
    type: 'confirm-withdraw',
    itemId: item.id,
    txHash,
    label: item.transactionName ?? item.id,
  })

  return { itemId: item.id, txHash }
}
