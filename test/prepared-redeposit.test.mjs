import assert from 'node:assert/strict'
import { encodeAbiParameters, encodeEventTopics } from 'viem'
import { GRAVARC_ABI } from '../src/lib/gravarc/gravarcAbi.ts'
import { assertRedepositReceipt, attachRedepositHash, discardRejectedRedeposit, loadPreparedRedeposits,
  prepareRedeposit, waitForIndexedDelivery } from '../src/lib/gravarc/defi/preparedRedeposit.ts'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
}
const sender = `0x${'11'.repeat(20)}`
const recipient = `0x${'22'.repeat(20)}`
const gravArc = `0x${'33'.repeat(20)}`
const router = `0x${'44'.repeat(20)}`
const input = { address: recipient, secretHash: `0x${'55'.repeat(32)}`,
  encPubkey: '66'.repeat(32), amount: 100n }
const proof = {
  canRefund: false, leafIndex: 7, depositLeaf: '123', authRoot: '456',
  depositorSecretHash: '789', depositPathElements: [], depositPathIndices: [],
  receivers: [{ address: recipient, encPubkey: input.encPubkey, nullifier: '42',
    amount: '100', authPathElements: [], authPathIndices: [] }],
}
assert.throws(() => prepareRedeposit(sender, 'eip155:11155111', { ...proof, canRefund: true }, [input]), /non-refundable/)
const record = prepareRedeposit(sender, 'eip155:11155111', proof, [input])
assert.equal(loadPreparedRedeposits(sender).length, 1)
assert.equal(record.withdrawMessages[0].address, recipient)
assert.ok(record.withdrawMessages[0].content.includes(':'))
const attached = attachRedepositHash(record, `0x${'aa'.repeat(32)}`)
assert.equal(loadPreparedRedeposits(sender)[0].txHash, attached.txHash)
discardRejectedRedeposit(record)
assert.equal(loadPreparedRedeposits(sender).length, 1)
assert.throws(() => attachRedepositHash(record, `0x${'bb'.repeat(32)}`), /different transaction/)
const rejected = prepareRedeposit(sender, 'eip155:11155111', proof, [input])
discardRejectedRedeposit(rejected)
assert.equal(loadPreparedRedeposits(sender).length, 1)

const depositEvent = GRAVARC_ABI.find(item => item.name === 'Deposit')
const receipt = { status: 'success', from: sender, to: router, logs: [{ address: gravArc,
  topics: encodeEventTopics({ abi: GRAVARC_ABI, eventName: 'Deposit', args: { newRoot: 9n } }),
  data: encodeAbiParameters(depositEvent.inputs.filter(input => !input.indexed),
    [7n, 123n, 100n, recipient, 8]),
}] }
assert.equal(assertRedepositReceipt(attached, receipt, gravArc, router), 7)
assert.throws(() => assertRedepositReceipt(attached, { ...receipt, status: 'reverted' }, gravArc, router), /does not match/)
assert.throws(() => assertRedepositReceipt(attached, { ...receipt, from: recipient }, gravArc, router), /does not match/)
assert.throws(() => assertRedepositReceipt(attached, { ...receipt, to: recipient }, gravArc, router), /does not match/)
assert.throws(() => assertRedepositReceipt({ ...attached, depositLeaf: '124' }, receipt, gravArc, router), /No unique/)
assert.equal(loadPreparedRedeposits(sender)[0].txHash, attached.txHash)

const notIndexed = { response: { status: 409,
  data: { message: 'DeFi re-deposit is not indexed yet; retry delivery' } } }
let attempts = 0
let waiting = 0
await waitForIndexedDelivery(async () => {
  attempts++
  if (attempts < 3) throw notIndexed
}, () => { waiting++ }, 0, 3)
assert.equal(attempts, 3)
assert.equal(waiting, 2)
await assert.rejects(waitForIndexedDelivery(async () => { throw notIndexed }, () => {}, 0, 2),
  error => error === notIndexed)
assert.equal(loadPreparedRedeposits(sender)[0].txHash, attached.txHash)
await assert.rejects(waitForIndexedDelivery(async () => {
  throw { response: { status: 409, data: { message: 'Recipient privacy profile changed' } } }
}, () => { throw new Error('Must not wait for a permanent conflict') }, 0, 3),
  error => error.response?.data?.message === 'Recipient privacy profile changed')
