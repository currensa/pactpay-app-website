import { buildPoseidon } from 'circomlibjs'

const TREE_DEPTH = 20

export interface DepositMembershipPath {
  leafIndex: number
  depositRoot: string
  siblings: string[]
  pathIndices: number[]
}

/** Verify a fresh scanner path against the encrypted deposit commitment. */
export async function verifyDepositMembershipPath(
  path: DepositMembershipPath,
  leafIndex: number,
  authRoot: string,
  depositorSecretHash: string,
  expectedDepositLeaf?: string,
): Promise<{ pathElements: string[]; pathIndices: number[] }> {
  if (
    !Number.isSafeInteger(leafIndex) || leafIndex < 0 || leafIndex >= (1 << TREE_DEPTH)
    || path.leafIndex !== leafIndex
    || !Array.isArray(path.siblings) || path.siblings.length !== TREE_DEPTH
    || !Array.isArray(path.pathIndices) || path.pathIndices.length !== TREE_DEPTH
    || path.pathIndices.some((bit, level) => bit !== ((leafIndex >> level) & 1))
  ) {
    throw new Error('Scanner returned an invalid deposit membership path')
  }

  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const hash2 = (a: bigint, b: bigint): bigint => F.toObject(poseidon([a, b])) as bigint
  let root = hash2(BigInt(authRoot), BigInt(depositorSecretHash))
  if (expectedDepositLeaf !== undefined && root !== BigInt(expectedDepositLeaf)) {
    throw new Error('Encrypted deposit leaf does not match the deposit commitment')
  }
  for (let level = 0; level < TREE_DEPTH; level++) {
    const sibling = BigInt(path.siblings[level])
    root = path.pathIndices[level] === 0 ? hash2(root, sibling) : hash2(sibling, root)
  }
  if (root !== BigInt(path.depositRoot)) {
    throw new Error('Scanner returned an inconsistent deposit root')
  }
  return { pathElements: path.siblings, pathIndices: path.pathIndices }
}
