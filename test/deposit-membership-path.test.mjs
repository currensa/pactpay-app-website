import assert from 'node:assert/strict'
import { buildPoseidon } from 'circomlibjs'
import { verifyDepositMembershipPath } from '../src/lib/gravarc/depositMembershipPath.ts'

const poseidon = await buildPoseidon()
const hash2 = (a, b) => poseidon.F.toObject(poseidon([a, b]))
const authRoot = 123n
const depositorSecretHash = 456n
const depositLeaf = hash2(authRoot, depositorSecretHash)
let root = depositLeaf
for (let level = 0; level < 20; level++) root = hash2(root, 0n)
const path = {
  leafIndex: 0,
  depositRoot: root.toString(),
  siblings: Array(20).fill('0'),
  pathIndices: Array(20).fill(0),
}

assert.deepEqual(
  await verifyDepositMembershipPath(path, 0, authRoot.toString(), depositorSecretHash.toString(), depositLeaf.toString()),
  { pathElements: path.siblings, pathIndices: path.pathIndices },
)
await assert.rejects(verifyDepositMembershipPath({ ...path, leafIndex: 1 }, 0, '123', '456'), /invalid/)
await assert.rejects(verifyDepositMembershipPath({ ...path, pathIndices: [1, ...path.pathIndices.slice(1)] }, 0, '123', '456'), /invalid/)
await assert.rejects(verifyDepositMembershipPath({ ...path, siblings: [] }, 0, '123', '456'), /invalid/)
await assert.rejects(verifyDepositMembershipPath(path, 0, '123', '456', '999'), /deposit commitment/)
await assert.rejects(verifyDepositMembershipPath({ ...path, depositRoot: '999' }, 0, '123', '456'), /inconsistent/)
console.log('Deposit membership path tests passed')
