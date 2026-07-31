'use client'

import { buildPoseidon } from 'circomlibjs'
import { secretStringToField } from '@/lib/gravarc/poseidon'

// ── Circuit file cache (in-memory, avoids repeated CDN downloads) ──────────

const _circuitCache = new Map<string, ArrayBuffer>()

async function fetchCircuit(url: string, onStatus?: (msg: string) => void): Promise<ArrayBuffer> {
  if (_circuitCache.has(url)) return _circuitCache.get(url)!
  onStatus?.('Downloading refund circuit files (first time only - this may take a while)…')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch circuit file: ${url}`)
  const buf = await res.arrayBuffer()
  _circuitCache.set(url, buf)
  return buf
}

// ── Constants ──────────────────────────────────────────────────────────────

const TREE_DEPTH = 20

const TIER_AUTH_DEPTH: Record<number, number> = { 8: 3, 16: 4, 32: 5, 64: 6, 128: 7 }

// ── Helpers ────────────────────────────────────────────────────────────────

function toHex64(n: bigint): string {
  return '0x' + n.toString(16).padStart(64, '0')
}

function buildAuthTree(
  leaves: bigint[],
  depth: number,
  hash2: (a: bigint, b: bigint) => bigint,
) {
  const size = 1 << depth
  const tree = new Array<bigint>(2 * size).fill(0n)
  for (let i = 0; i < leaves.length; i++) tree[size + i] = leaves[i]
  for (let i = size - 1; i >= 1; i--) tree[i] = hash2(tree[2 * i], tree[2 * i + 1])
  return { root: tree[1] }
}

// ── Public types ───────────────────────────────────────────────────────────

export type RefundSlot = {
  nullifier: string       // 0x hex
  secretHash: string      // 0x hex (H(secret) of receiver; padded slot uses random value)
  withdrawAmount: string  // decimal string (receiver's full allocation; padded slot = 0)
}

export type RefundProofInput = {
  /** 完整 tier 个槽位（真实 + padded，顺序与存款时一致） */
  slots: RefundSlot[]
  /** 存款人明文 secret（由 gravArcUserInfo.encryptedSecret 解密得到） */
  depositSecret: string
  token: string
  tier: number
  /** 存款叶子索引，用于取 depositPath */
  leafIndex: number
  depositPathElements: string[]
  depositPathIndices: number[]
  /** 链上各 nullifier 已领取金额之和（由调用方逐个 readContract 累加） */
  totalClaimed: bigint
  /** 退款手续费（须 >= 退款金额 0.1%） */
  fee: bigint
  /** 平台 relayer 地址（msg.sender == relayer） */
  relayer: string
  /** 存款人收款地址（= refunder） */
  refunder: string
  wasmUrl: string
  zkeyUrl: string
  onStatus?: (msg: string) => void
}

export type RefundProofResult = {
  proof: { pA: [string, string]; pB: [[string, string], [string, string]]; pC: [string, string] }
  depositRoot: string
  nullifierHash: string[]
  totalClaimed: bigint
  token: string
  refundAmount: bigint
  fee: bigint
  relayer: string
  refunder: string
  tier: number
}

/**
 * 在浏览器端生成 GravArc refund 的 Groth16 证明（与 refund.circom 见证逐字段对齐）：
 *  - depositorSecretHash = Poseidon(depositSecret)；depositLeaf = Poseidon(authRoot, depositorSecretHash)
 *  - authRoot 由全部 tier 槽位的 authLeaf（= Poseidon(withdrawAmount, token, Poseidon(secretHash, nullifier))）重建
 *  - depositRoot 由 depositLeaf 沿 depositPath 递推还原
 *  - refundAmount = sum(withdrawAmount) - totalClaimed
 */
export async function generateRefundProof(input: RefundProofInput): Promise<RefundProofResult> {
  const { slots, token, tier, depositPathElements, depositPathIndices, totalClaimed, fee, relayer, refunder } = input
  const authDepth = TIER_AUTH_DEPTH[tier]
  if (!authDepth) throw new Error(`Unknown tier ${tier}`)
  if (slots.length !== tier) throw new Error(`Expected ${tier} refund slots, got ${slots.length}`)

  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const hash2 = (a: bigint, b: bigint): bigint => F.toObject(poseidon([a, b])) as bigint

  // depositSecret -> depositorSecretHash（须与存款时 bind-wallet 记录的 secretHash 一致）
  const depositSecretField = await secretStringToField(input.depositSecret)
  const depositorSecretHash = F.toObject(poseidon([depositSecretField])) as bigint

  const nullifiers = slots.map(s => BigInt(s.nullifier))
  const secretHashes = slots.map(s => BigInt(s.secretHash))
  const withdrawAmounts = slots.map(s => BigInt(s.withdrawAmount))
  const tokenBig = BigInt(token)

  // nullifierHash_i = Poseidon(nullifier_i)；commitment_i = Poseidon(secretHash_i, nullifier_i)；
  // authLeaf_i = Poseidon(withdrawAmount_i, token, commitment_i)
  const nullifierHashes = nullifiers.map(n => F.toObject(poseidon([n])) as bigint)
  const authLeaves = secretHashes.map((sh, i) =>
    F.toObject(poseidon([withdrawAmounts[i], tokenBig, F.toObject(poseidon([sh, nullifiers[i]])) as bigint])) as bigint,
  )

  const authRoot = buildAuthTree(authLeaves, authDepth, hash2).root

  // depositLeaf = Poseidon(authRoot, depositorSecretHash)；沿 depositPath 还原 depositRoot
  const depositLeaf = hash2(authRoot, depositorSecretHash)
  let depositRoot = depositLeaf
  for (let l = 0; l < TREE_DEPTH; l++) {
    const bit = depositPathIndices[l]
    const sibling = BigInt(depositPathElements[l])
    depositRoot = bit === 0 ? hash2(depositRoot, sibling) : hash2(sibling, depositRoot)
  }

  const totalWithdraw = withdrawAmounts.reduce((a, b) => a + b, 0n)
  const refundAmount = totalWithdraw - totalClaimed
  if (refundAmount <= 0n) throw new Error('Nothing to refund: total allocations already fully claimed')
  // 合约最低手续费 0.1%：fee * 1000 >= refundAmount
  if (fee * 1000n < refundAmount) {
    throw new Error(`Fee too low: minimum 0.1% of refundAmount (refundAmount=${refundAmount}, fee=${fee})`)
  }

  const circuitInput = {
    // public signals
    depositRoot: depositRoot.toString(),
    nullifierHash: nullifierHashes.map(nh => nh.toString()),
    totalClaimed: totalClaimed.toString(),
    token: tokenBig.toString(),
    refundAmount: refundAmount.toString(),
    fee: fee.toString(),
    relayer: BigInt(relayer).toString(),
    refunder: BigInt(refunder).toString(),
    // private inputs
    depositSecret: depositSecretField.toString(),
    nullifier: nullifiers.map(n => n.toString()),
    secretHash: secretHashes.map(sh => sh.toString()),
    withdrawAmount: withdrawAmounts.map(w => w.toString()),
    depositPathElements: depositPathElements.map(x => BigInt(x).toString()),
    depositPathIndices: depositPathIndices.map(String),
  }

  const { groth16 } = await import('snarkjs')
  const [wasmBuf, zkeyBuf] = await Promise.all([
    fetchCircuit(input.wasmUrl, input.onStatus),
    fetchCircuit(input.zkeyUrl, input.onStatus),
  ])
  input.onStatus?.('Generating refund ZK proof in browser… (private inputs never leave your device)')

  const t0 = performance.now()
  const { proof } = await groth16.fullProve(
    circuitInput,
    new Uint8Array(wasmBuf) as unknown as string,
    { type: 'mem', data: new Uint8Array(zkeyBuf) } as unknown as string,
  )
  console.log(`[refund proof] fullProve took ${((performance.now() - t0) / 1000).toFixed(2)}s`)

  const pA = proof.pi_a.slice(0, 2) as [string, string]
  const pB = proof.pi_b.slice(0, 2) as [[string, string], [string, string]]
  const pC = proof.pi_c.slice(0, 2) as [string, string]

  return {
    proof: {
      pA,
      pB: [[pB[0][1], pB[0][0]], [pB[1][1], pB[1][0]]],
      pC,
    },
    // depositRoot 为 uint256，后端 DTO 要求十进制字符串（@IsNumberString），与电路 public signal 一致；
    // nullifierHash 为 bytes32，需 0x hex（后端 @Matches 0x{64}）。
    depositRoot: depositRoot.toString(),
    nullifierHash: nullifierHashes.map(toHex64),
    totalClaimed,
    token,
    refundAmount,
    fee,
    relayer,
    refunder,
    tier,
  }
}
