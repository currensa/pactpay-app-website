import assert from 'node:assert/strict'
import { buildPoseidon } from 'circomlibjs'
import { verifyRefundPayloadCommitment } from '../src/lib/gravarc/refundPayloadCommitment.ts'

const poseidon = await buildPoseidon()
const hash = values => poseidon.F.toObject(poseidon(values))
const slots = Array.from({ length: 8 }, (_, index) => ({
  nullifier: String(index + 1), secretHash: String(index + 11), withdrawAmount: index < 2 ? String((index + 1) * 100) : '0',
}))
let layer = slots.map(slot => hash([BigInt(slot.withdrawAmount), 9n, hash([BigInt(slot.secretHash), BigInt(slot.nullifier)])]))
while (layer.length > 1) {
  const next = []
  for (let index = 0; index < layer.length; index += 2) next.push(hash([layer[index], layer[index + 1]]))
  layer = next
}
const payload = { token: '9', tier: 8, authRoot: String(layer[0]), depositorSecretHash: '77',
  depositLeaf: String(hash([layer[0], 77n])), slots }
await assert.doesNotReject(verifyRefundPayloadCommitment(payload))
await assert.rejects(verifyRefundPayloadCommitment({ ...payload, slots: [{ ...slots[0], withdrawAmount: '101' }, ...slots.slice(1)] }), /do not match/)
await assert.rejects(verifyRefundPayloadCommitment({ ...payload, depositLeaf: '1' }), /do not match/)
console.log('Refund payload commitment tests passed')
