import assert from 'node:assert/strict'
import {
  assertPreparedReceipt,
  attachDepositHash,
  discardRejectedDeposit,
  finishPreparedDeposit,
  loadPreparedDeposit,
  prepareDeposit,
  preparedConfirmJob,
} from '../src/lib/confirm-sync/preparedDeposit.ts'
import { GRAVARC_ABI } from '../src/lib/gravarc/gravarcAbi.ts'
import { encodeAbiParameters, encodeEventTopics } from 'viem'

const values = new Map([['userId', 'user-1']])
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
}

const record = {
  version: 1,
  userId: 'user-1',
  orgId: 'org-1',
  batchId: 'batch-1',
  caipChainId: 'eip155:11155111',
  depositorAddress: '0x' + '1'.repeat(40),
  depositLeaf: '123',
  label: 'test',
  withdrawMessages: [{ address: '0x' + '2'.repeat(40), content: 'encrypted', secretHash: 'hash', encPubkey: 'key' }],
  encContent: 'encrypted-refund',
  depositInfo: '{}',
}
const hash = '0x' + 'a'.repeat(64)
const vault = '0x' + '3'.repeat(40)
const depositEvent = GRAVARC_ABI.find(item => item.name === 'Deposit')
const receipt = {
  status: 'success',
  from: record.depositorAddress,
  logs: [{
    address: vault,
    topics: encodeEventTopics({ abi: GRAVARC_ABI, eventName: 'Deposit', args: { newRoot: 9n } }),
    data: encodeAbiParameters(depositEvent.inputs.filter(input => !input.indexed), [0n, 123n, 1n, record.depositorAddress, 8]),
  }],
}
assertPreparedReceipt(record, vault, receipt)
assert.throws(() => assertPreparedReceipt({ ...record, depositLeaf: '124' }, vault, receipt), /does not match/)
assert.throws(() => assertPreparedReceipt(record, '0x' + '4'.repeat(40), receipt), /does not match/)
assert.throws(() => assertPreparedReceipt(record, vault, { ...receipt, from: '0x' + '4'.repeat(40) }), /original depositor/)
assert.throws(() => assertPreparedReceipt(record, vault, { ...receipt, status: 'reverted' }), /successful transaction/)
prepareDeposit(record)
assert.deepEqual(loadPreparedDeposit(record.userId, record.orgId, record.batchId), record)
assert.throws(() => prepareDeposit(record), /pending recovery data/)
const attached = attachDepositHash(record, hash)
assert.equal(preparedConfirmJob(attached).depositTxHash, hash)
assert.throws(() => attachDepositHash(record, '0x' + 'b'.repeat(64)), /different transaction hash/)
discardRejectedDeposit(record)
assert.ok(loadPreparedDeposit(record.userId, record.orgId, record.batchId))
finishPreparedDeposit(record.orgId, record.batchId, '0x' + 'b'.repeat(64))
assert.ok(loadPreparedDeposit(record.userId, record.orgId, record.batchId))
finishPreparedDeposit(record.orgId, record.batchId, hash)
assert.equal(loadPreparedDeposit(record.userId, record.orgId, record.batchId), null)
prepareDeposit(record)
discardRejectedDeposit(record)
assert.equal(loadPreparedDeposit(record.userId, record.orgId, record.batchId), null)
globalThis.localStorage.setItem = () => { throw new Error('storage unavailable') }
assert.throws(() => prepareDeposit(record), /storage unavailable/)
globalThis.localStorage.setItem = () => {}
assert.throws(() => prepareDeposit(record), /Could not verify saved deposit recovery data/)
values.set('pactpay:preparedDeposit:user-1:org-1:batch-1', '{broken')
assert.throws(() => loadPreparedDeposit(record.userId, record.orgId, record.batchId), SyntaxError)
console.log('Prepared deposit recovery tests passed')
