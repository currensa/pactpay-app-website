import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildPoseidon } from 'circomlibjs'
import { createDepositorStatusPayload, verifyClaimStatusEntries } from '../src/lib/gravarc/depositorClaimStatus.ts'

const poseidon = await buildPoseidon()
const hash = values => poseidon.F.toObject(poseidon(values))
const toHex = value => `0x${value.toString(16).padStart(64, '0')}`
const token = '9'
const member = { memberId: 'member-a', address: `0x${'11'.repeat(20)}`, secretHash: '17' }
const allocation = { memberId: member.memberId, address: member.address, amount: '100' }
const nullifier = '23'

function proof(refundable) {
  const realLeaf = hash([100n, 9n, hash([17n, 23n])])
  const padded = refundable ? hash([0n, 9n, hash([31n, 37n])]) : hash([0n, 9n, 0n])
  let layer = [realLeaf, ...Array(7).fill(padded)]
  const path = []
  while (layer.length > 1) {
    path.push(toHex(layer[1]))
    const next = []
    for (let index = 0; index < layer.length; index += 2) next.push(hash([layer[index], layer[index + 1]]))
    layer = next
  }
  const authRoot = layer[0]
  const depositorSecretHash = refundable ? 41n : BigInt('1'.repeat(64))
  return {
    tier: 8, leafIndex: 2, authRoot: toHex(authRoot), depositLeaf: toHex(hash([authRoot, depositorSecretHash])),
    depositorSecretHash: toHex(depositorSecretHash),
    receivers: [{ address: member.address, amount: '100', authPathElements: path, authPathIndices: [0, 0, 0] }],
    refundSlots: [{ nullifier, secretHash: member.secretHash, withdrawAmount: '100' },
      ...Array.from({ length: 7 }, () => ({ nullifier: '37', secretHash: '31', withdrawAmount: '0' }))],
  }
}

for (const refundable of [false, true]) {
  test(`depositor mapping verifies for ${refundable ? 'refundable' : 'non-refundable'} deposit`, async () => {
    const payload = await createDepositorStatusPayload('batch-1', [member], proof(refundable), token, refundable)
    assert.equal(payload.entries[0].length, refundable ? 1 : 3)
    if (!refundable) assert.equal(payload.entries[0][1], toHex(hash([23n])))
    assert.equal('nullifier' in payload.entries[0], false)
    assert.equal('slots' in payload, refundable)
    if (!refundable) assert.equal(JSON.stringify(payload).includes(`"nullifier":"${nullifier}"`), false)
    await assert.doesNotReject(verifyClaimStatusEntries(payload, [allocation]))
    await assert.rejects(verifyClaimStatusEntries(payload, [{ ...allocation, memberId: 'other' }]), /encrypted plan/)
    if (!refundable) {
      await assert.rejects(verifyClaimStatusEntries({ ...payload, entries: [[payload.entries[0][0], payload.entries[0][1], toHex(1n)]] }, [allocation]), /leaves/)
    }
    if (refundable) {
      await assert.doesNotReject(verifyClaimStatusEntries({ ...payload, entries: [[payload.entries[0][0], toHex(hash([23n]))]] }, [allocation]))
      await assert.rejects(verifyClaimStatusEntries({ ...payload, entries: [[payload.entries[0][0], toHex(5n)]] }, [allocation]), /refund slots/)
    }
  })
}

test('tier-128 depositor ciphertext stays within the existing API limit', () => {
  const entries = Array.from({ length: 128 }, () => ['m'.repeat(36)])
  const slots = Array.from({ length: 128 }, () => ({
    nullifier: toHex(1n), secretHash: toHex(2n), withdrawAmount: '9'.repeat(78),
  }))
  const payload = { version: 2, batchId: 'b'.repeat(40), leafIndex: 1, token: `0x${'a'.repeat(40)}`,
    tier: 128, authRoot: toHex(1n), depositLeaf: toHex(2n), depositorSecretHash: toHex(3n), entries, slots }
  // NaCl box emits hex ciphertext plus an ephemeral key and nonce.
  assert.ok(JSON.stringify(payload).length * 2 + 146 < 100_000)
})
