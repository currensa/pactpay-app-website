'use client'

import { buildPoseidon } from 'circomlibjs'

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

/** 不可退款存款使用的占位 depositorSecretHash（与 deposit.circom 中的常量一致，使退款证明无法生成） */
const FAKE_DEPOSITOR_SECRET_HASH = BigInt('1'.repeat(64))

export function selectTier(n: number): number {
  for (const t of [8, 16, 32, 64, 128]) if (n <= t) return t
  throw new Error('Too many receivers (max 128)')
}

// ── Helpers ────────────────────────────────────────────────────────────────

function randomNullifier(encPubkey: bigint, poseidon: Awaited<ReturnType<typeof buildPoseidon>>): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(31))
  let r = 0n
  for (const b of bytes) r = (r << 8n) | BigInt(b)
  return poseidon.F.toObject(poseidon([encPubkey, r])) as bigint
}

/** 随机 BN254 域内元素（< 2^248 < p），用于可退款存款的 padded 槽位 secretHash/nullifier。 */
function randomField(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(31))
  let r = 0n
  for (const b of bytes) r = (r << 8n) | BigInt(b)
  return r
}

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
  return {
    root: tree[1],
    proof(idx: number): { pathElements: bigint[]; pathIndices: number[] } {
      const pathElements: bigint[] = []
      const pathIndices: number[] = []
      let nodeIdx = size + idx
      while (nodeIdx > 1) {
        const isRight = nodeIdx & 1
        pathElements.push(tree[isRight ? nodeIdx - 1 : nodeIdx + 1])
        pathIndices.push(isRight)
        nodeIdx >>= 1
      }
      return { pathElements, pathIndices }
    },
  }
}

// ── Public types ───────────────────────────────────────────────────────────

export type ReceiverInput = {
  address: string
  secretHash: string   // public — fetched from /api/users
  encPubkey: string    // public — fetched from /api/users
  amount: bigint       // in wei
}

export type DepositProofResult = {
  proof: { pA: [string, string]; pB: [[string, string], [string, string]]; pC: [string, string] }
  tier: number
  newDepositRoot: string
  oldDepositRoot: string
  authRoot: string
  depositLeaf: string
  depositorSecretHash: string
  canRefund: boolean
  totalAmount: bigint
  leafIndex: number
  receivers: {
    address: string
    nullifier: string
    amount: string
    encPubkey: string
    authPathElements: string[]
    authPathIndices: number[]
  }[]
  depositPathElements: string[]
  depositPathIndices: number[]
  /** 可退款存款的完整 tier 槽位（真实+padded），供退款证明重建 auth 树（仅 refundable 时有意义） */
  refundSlots: { nullifier: string; secretHash: string; withdrawAmount: string }[]
}

// ── Main function — runs entirely in the browser ───────────────────────────

export async function generateDepositProof(
  receivers: ReceiverInput[],
  token: bigint,
  wasmUrl: string,
  zkeyUrl: string,
  depositPath: { nextIndex: number; siblings: string[] },
  /** 是否可退款：true 用存款人真实 secretHash；false 用 FAKE_DEPOSITOR_SECRET_HASH */
  refundable: boolean,
  /** 存款人真实 secretHash（refundable=true 时必填；refundable=false 时可空） */
  depositorSecretHash: string | null,
  onStatus?: (msg: string) => void,
): Promise<DepositProofResult> {
  const tier = selectTier(receivers.length)
  const authDepth = TIER_AUTH_DEPTH[tier]

  // Build Poseidon hash function
  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const hash2 = (a: bigint, b: bigint): bigint => F.toObject(poseidon([a, b])) as bigint

  // Random nullifiers — generated locally, never leave the browser
  // Each nullifier is Poseidon(encPubkey, randomness) so it is bound to the receiver.
  const nullifiers = receivers.map(r =>
    randomNullifier(BigInt(r.encPubkey.startsWith('0x') ? r.encPubkey : '0x' + r.encPubkey), poseidon)
  )

  const amounts = receivers.map(r => r.amount)
  const totalAmount = amounts.reduce((a, b) => a + b, 0n)

  // commitments[i] = Poseidon(H(secret_i), nullifier_i)
  const commitments = receivers.map((r, i) =>
    F.toObject(poseidon([BigInt(r.secretHash), nullifiers[i]])) as bigint
  )

  // authLeaf[i] = Poseidon(amount_i, token, commitment_i)
  const authLeavesRaw = commitments.map((c, i) =>
    F.toObject(poseidon([amounts[i], token, c])) as bigint
  )

  // Pad arrays to tier size.
  // 不可退款：padded 槽位 commitment=0 -> authLeaf=Poseidon(0, token, 0)；退款证明无法重建（不可退款无需退款）。
  // 可退款：padded 槽位用随机 secretHash + nullifier（withdrawAmount=0），commitment=Poseidon(secretHash, nullifier)，
  //   使退款证明能完整重建 tier 大小的 auth 树；padded 数据随退款载荷保存（refundSlots）。
  const authLeaves = [...authLeavesRaw]
  const amountsPadded = [...amounts]
  const commitmentsPadded = [...commitments]
  const paddedSlots: { nullifier: bigint; secretHash: bigint; withdrawAmount: bigint }[] = []
  while (authLeaves.length < tier) {
    const withdrawAmount = 0n
    amountsPadded.push(withdrawAmount)
    if (refundable) {
      const paddedNullifier = F.toObject(poseidon([randomField()])) as bigint
      const paddedSecretHash = F.toObject(poseidon([randomField(), 1n])) as bigint
      const commitment = F.toObject(poseidon([paddedSecretHash, paddedNullifier])) as bigint
      authLeaves.push(F.toObject(poseidon([withdrawAmount, token, commitment])) as bigint)
      commitmentsPadded.push(commitment)
      paddedSlots.push({ nullifier: paddedNullifier, secretHash: paddedSecretHash, withdrawAmount })
    } else {
      authLeaves.push(F.toObject(poseidon([0n, token, 0n])) as bigint)
      commitmentsPadded.push(0n)
    }
  }

  // Build auth tree
  const authTree = buildAuthTree(authLeaves, authDepth, hash2)
  const authRoot = authTree.root
  const authPaths = receivers.map((_, i) => authTree.proof(i))

  // 新合约：存款叶子 depositLeaf = Poseidon(authRoot, depositorSecretHash)
  // 可退款用存款人真实 secretHash；不可退款用 FAKE 常量（canRefund=0 时电路强制等于 FAKE）
  const canRefund = refundable ? 1n : 0n
  const depositorSecretHashBig = refundable
    ? BigInt(depositorSecretHash ?? '0')
    : FAKE_DEPOSITOR_SECRET_HASH
  const depositLeaf = hash2(authRoot, depositorSecretHashBig)

  // Deposit path provided by caller (fetched from /gravarc/deposit-path)
  const siblings = depositPath.siblings.map(BigInt)
  const leafIndex = depositPath.nextIndex

  // Deposit tree zero values (must match circomlibjs Poseidon)
  const zeros: bigint[] = [0n]
  for (let l = 0; l < TREE_DEPTH; l++) zeros.push(hash2(zeros[l], zeros[l]))

  // oldRoot: walk from the empty leaf at leafIndex
  let oldRootNode = 0n
  for (let l = 0; l < TREE_DEPTH; l++) {
    const bit = (leafIndex >> l) & 1
    const sib = bit === 1 ? siblings[l] : zeros[l]
    oldRootNode = bit === 0 ? hash2(oldRootNode, sib) : hash2(sib, oldRootNode)
  }
  const oldRoot = oldRootNode

  // newDepositRoot after inserting depositLeaf (newFS is local scratch, not a circuit input)
  const newFS = [...siblings]
  let node = depositLeaf
  for (let l = 0; l < TREE_DEPTH; l++) {
    if ((leafIndex >> l) & 1) {
      node = hash2(newFS[l], node)
    } else {
      newFS[l] = node
      node = hash2(node, zeros[l])
    }
  }
  const newDepositRoot = node

  // Deposit path for withdraw message (path to newDepositRoot)
  const depositPathIndices: number[] = []
  const depositPathElements: bigint[] = []
  for (let l = 0; l < TREE_DEPTH; l++) {
    const bit = (leafIndex >> l) & 1
    depositPathIndices.push(bit)
    depositPathElements.push(bit === 0 ? zeros[l] : siblings[l])
  }

  // Generate ZK proof via snarkjs — dynamic import keeps it out of the initial bundle
  const { groth16 } = await import('snarkjs')
  const [wasmBuf, zkeyBuf] = await Promise.all([
    fetchCircuit(wasmUrl, onStatus),
    fetchCircuit(zkeyUrl, onStatus),
  ])
  onStatus?.('Generating ZK proof in browser… (private inputs never leave your device)')

  const input = {
    newDepositRoot: newDepositRoot.toString(),
    oldRoot: oldRoot.toString(),
    depositLeaf: depositLeaf.toString(),
    leafIndex: leafIndex.toString(),
    totalAmount: totalAmount.toString(),
    token: token.toString(),
    oldFilledSubtrees: siblings.map(x => x.toString()),
    commitments: commitmentsPadded.map(c => c.toString()),
    amounts: amountsPadded.map(a => a.toString()),
    depositorSecretHash: depositorSecretHashBig.toString(),
    canRefund: canRefund.toString(),
  }

  const t0 = performance.now()
  const { proof } = await groth16.fullProve(
    input,
    new Uint8Array(wasmBuf) as unknown as string,
    { type: 'mem', data: new Uint8Array(zkeyBuf) } as unknown as string,
  )
  console.log(`[deposit proof] fullProve took ${((performance.now() - t0) / 1000).toFixed(2)}s`)

  const pA = proof.pi_a.slice(0, 2) as [string, string]
  const pB = proof.pi_b.slice(0, 2) as [[string, string], [string, string]]
  const pC = proof.pi_c.slice(0, 2) as [string, string]

  return {
    proof: {
      pA,
      pB: [[pB[0][1], pB[0][0]], [pB[1][1], pB[1][0]]],
      pC,
    },
    tier,
    newDepositRoot: toHex64(newDepositRoot),
    oldDepositRoot: toHex64(oldRoot),
    authRoot: toHex64(authRoot),
    depositLeaf: toHex64(depositLeaf),
    depositorSecretHash: toHex64(depositorSecretHashBig),
    canRefund: refundable,
    totalAmount,
    leafIndex,
    receivers: receivers.map((r, i) => ({
      address: r.address,
      nullifier: toHex64(nullifiers[i]),
      amount: r.amount.toString(),
      encPubkey: r.encPubkey,
      authPathElements: authPaths[i].pathElements.map(toHex64),
      authPathIndices: authPaths[i].pathIndices,
    })),
    depositPathElements: depositPathElements.map(toHex64),
    depositPathIndices,
    refundSlots: [
      ...receivers.map((r, i) => ({
        nullifier: toHex64(nullifiers[i]),
        secretHash: r.secretHash,
        withdrawAmount: r.amount.toString(),
      })),
      ...paddedSlots.map(s => ({
        nullifier: toHex64(s.nullifier),
        secretHash: toHex64(s.secretHash),
        withdrawAmount: s.withdrawAmount.toString(),
      })),
    ],
  }
}
