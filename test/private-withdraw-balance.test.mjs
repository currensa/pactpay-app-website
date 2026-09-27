import assert from 'node:assert/strict'
import { privateWithdrawBalance, validatePrivateWithdrawAmount } from '../src/lib/gravarc/privateWithdrawBalance.ts'

assert.deepEqual(privateWithdrawBalance(100n, 0n, false), { total: 100n, claimed: 0n, remaining: 100n, refunded: false })
assert.deepEqual(privateWithdrawBalance(100n, 40n, false), { total: 100n, claimed: 40n, remaining: 60n, refunded: false })
assert.deepEqual(privateWithdrawBalance(100n, 100n, false), { total: 100n, claimed: 100n, remaining: 0n, refunded: false })
assert.deepEqual(privateWithdrawBalance(100n, 40n, true), { total: 100n, claimed: 40n, remaining: 0n, refunded: true })
assert.throws(() => privateWithdrawBalance(100n, 101n, false), /Invalid on-chain/)
assert.throws(() => privateWithdrawBalance(100n, -1n, false), /Invalid on-chain/)
assert.doesNotThrow(() => validatePrivateWithdrawAmount(60n, 60n))
assert.doesNotThrow(() => validatePrivateWithdrawAmount(20n, 60n))
assert.throws(() => validatePrivateWithdrawAmount(0n, 60n), /positive/)
assert.throws(() => validatePrivateWithdrawAmount(61n, 60n), /live remainder/)
console.log('Private withdrawal balance tests passed')
