'use client'

import { buildPoseidon } from 'circomlibjs'
import { secretStringToField } from '@/lib/gravarc/poseidon'

// ── Circuit file cache (in-memory, avoids repeated CDN downloads) ──────────

const _circuitCache = new Map<string, ArrayBuffer>()

async function fetchCircuit(url: string, onStatus?: (msg: string) => void): Promise<ArrayBuffer> {
  if (_circuitCache.has(url)) return _circuitCache.get(url)!
  onStatus?.('Downloading circuit files (first time only — this may take a while)…')
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

// ── Public types ───────────────────────────────────────────────────────────

export type WithdrawInfo = {
  blocknumber?: number
  nullifier: string
  amount: string         // withdrawAmount (total allocation) in token base units
  token: string
  authRoot: string
  depositorSecretHash: string
  authPathElements: string[]
  authPathIndices: number[]
  leafIndex: number
  depositPathElements: string[]
  depositPathIndices: number[]
  tier: number
}

export type WithdrawProofResult = {
  proof: { pA: [string, string]; pB: [[string, string], [string, string]]; pC: [string, string] }
  nullifierHash: `0x${string}`
  depositRoot: bigint
  claimedAmount: bigint
  expectedAmount: bigint  // amount claimed this time (= withdrawAmount - claimedAmount by default)
  fee: bigint             // sent to relayer
  relayer: `0x${string}` // self-relay: same as recipient
  nonce: bigint
  token: `0x${string}`
  tier: number
}

// Computes H(nullifier) — used by the withdraw page to look up on-chain ClaimedData
// before calling generateWithdrawProof.
export async function computeNullifierHash(nullifier: string): Promise<`0x${string}`> {
  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const hash = F.toObject(poseidon([BigInt(nullifier)])) as bigint
  return toHex64(hash) as `0x${string}`
}

// ── Main function — runs entirely in the browser ───────────────────────────

export async function generateWithdrawProof(
  info: WithdrawInfo,
  rawSecret: string,
  recipient: string,
  fee: bigint,
  wasmUrl: string,
  zkeyUrl: string,
  claimedAmount: bigint = 0n,
  nonce: bigint = 0n,
  expectedAmountOverride?: bigint,
  relayerOverride?: string,
  onStatus?: (msg: string) => void,
): Promise<WithdrawProofResult> {
  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const hash2 = (a: bigint, b: bigint): bigint => F.toObject(poseidon([a, b])) as bigint

  const nullifier = BigInt(info.nullifier)
  const withdrawAmount = BigInt(info.amount)
  const authRoot = BigInt(info.authRoot)
  const depositorSecretHash = BigInt(info.depositorSecretHash)
  const tier = info.tier
  const authDepth = TIER_AUTH_DEPTH[tier]
  if (!authDepth) throw new Error(`Unknown tier ${tier}`)

  // nullifierHash = Poseidon(nullifier)
  const nullifierHash = F.toObject(poseidon([nullifier])) as bigint

  // 新合约：存款叶子 depositLeaf = Poseidon(authRoot, depositorSecretHash)，
  // 沿 depositPath 递推还原历史 depositRoot。
  const depositLeaf = hash2(authRoot, depositorSecretHash)
  let depositRoot = depositLeaf
  for (let l = 0; l < TREE_DEPTH; l++) {
    const bit = info.depositPathIndices[l]
    const sibling = BigInt(info.depositPathElements[l])
    depositRoot = bit === 0 ? hash2(depositRoot, sibling) : hash2(sibling, depositRoot)
  }

  const remaining = withdrawAmount - claimedAmount
  if (remaining <= 0n) throw new Error('Nothing left to claim for this receiver')

  const expectedAmount = expectedAmountOverride ?? remaining
  if (expectedAmount <= 0n) throw new Error('Expected amount must be positive')
  if (expectedAmount > remaining) throw new Error('Expected amount exceeds remaining allocation')

  const relayer = relayerOverride ?? recipient

  const secretField = await secretStringToField(rawSecret)

  const input = {
    // public signals
    depositRoot:    depositRoot.toString(),
    nullifierHash:  nullifierHash.toString(),
    receiver:       BigInt(recipient).toString(),
    claimedAmount:  claimedAmount.toString(),
    token:          BigInt(info.token).toString(),
    expectedAmount: expectedAmount.toString(),
    fee:            fee.toString(),
    relayer:        BigInt(relayer).toString(),
    nonce:          nonce.toString(),
    // private inputs
    authRoot:       authRoot.toString(),
    depositorSecretHash: depositorSecretHash.toString(),
    nullifier:      nullifier.toString(),
    secret:         secretField.toString(),
    withdrawAmount: withdrawAmount.toString(),
    authPathElements:    info.authPathElements.map(x => BigInt(x).toString()),
    authPathIndices:     info.authPathIndices.map(String),
    depositPathElements: info.depositPathElements.map(x => BigInt(x).toString()),
    depositPathIndices:  info.depositPathIndices.map(String),
  }

  // Generate ZK proof via snarkjs — dynamic import keeps it out of the initial bundle
  const { groth16 } = await import('snarkjs')
  const [wasmBuf, zkeyBuf] = await Promise.all([
    fetchCircuit(wasmUrl, onStatus),
    fetchCircuit(zkeyUrl, onStatus),
  ])
  onStatus?.('Generating ZK proof in browser… (private inputs never leave your device)')

  const t0 = performance.now()
  const { proof } = await groth16.fullProve(
    input,
    new Uint8Array(wasmBuf) as unknown as string,
    { type: 'mem', data: new Uint8Array(zkeyBuf) } as unknown as string,
  )
  console.log(`[withdraw proof] fullProve took ${((performance.now() - t0) / 1000).toFixed(2)}s`)

  const pA = proof.pi_a.slice(0, 2) as [string, string]
  const pB = proof.pi_b.slice(0, 2) as [[string, string], [string, string]]
  const pC = proof.pi_c.slice(0, 2) as [string, string]

  return {
    proof: {
      pA,
      pB: [[pB[0][1], pB[0][0]], [pB[1][1], pB[1][0]]],
      pC,
    },
    nullifierHash:  toHex64(nullifierHash) as `0x${string}`,
    depositRoot,
    claimedAmount,
    expectedAmount,
    fee,
    relayer:        relayer as `0x${string}`,
    nonce,
    token:          info.token as `0x${string}`,
    tier,
  }
}
