import assert from 'node:assert/strict'
import { isFullyRefunded, privateDepositBalances, sameDepositLeaf } from '../src/lib/gravarc/privateDepositBalances.ts'

const slots = [{ withdrawAmount: '100' }, { withdrawAmount: '50' }, { withdrawAmount: '0' }]
assert.deepEqual(
  privateDepositBalances(slots, [{ claimed: 40n, refunded: false }, { claimed: 50n, refunded: false }, { claimed: 0n, refunded: false }]),
  { total: 150n, claimed: 90n, remaining: 60n, refunded: 0n },
)
assert.deepEqual(
  privateDepositBalances(slots, [{ claimed: 40n, refunded: true }, { claimed: 50n, refunded: true }, { claimed: 0n, refunded: true }]),
  { total: 150n, claimed: 90n, remaining: 0n, refunded: 60n },
)
// A refundable v2 mapping names real receivers only, while its chain state
// covers the full tier, including zero-value padding.
assert.deepEqual(
  privateDepositBalances(slots, [{ claimed: 0n, refunded: false }, { claimed: 0n, refunded: false }, { claimed: 0n, refunded: false }]),
  { total: 150n, claimed: 0n, remaining: 150n, refunded: 0n },
)
assert.throws(() => privateDepositBalances(slots.slice(0, 2), [{ claimed: 0n, refunded: false }, { claimed: 0n, refunded: false }, { claimed: 0n, refunded: false }]), /Incomplete/)
assert.throws(() => privateDepositBalances(slots, []), /Incomplete/)
assert.throws(() => privateDepositBalances(slots, [{ claimed: 101n, refunded: false }, { claimed: 0n, refunded: false }, { claimed: 0n, refunded: false }]), /Invalid/)
assert.equal(sameDepositLeaf('0x80', '128'), true)
assert.equal(sameDepositLeaf('0x' + (2n ** 200n).toString(16), (2n ** 200n).toString()), true)
assert.equal(sameDepositLeaf('0x80', '129'), false)
assert.equal(sameDepositLeaf('not-a-leaf', '128'), false)
assert.equal(isFullyRefunded(2, [{ refunded: true }, { refunded: true }]), true)
assert.equal(isFullyRefunded(2, [{ refunded: true }, { refunded: false }]), false)
assert.equal(isFullyRefunded(2, [{ refunded: true }]), false)
assert.equal(isFullyRefunded(0, []), false)
console.log('Private deposit balance tests passed')
