import assert from 'node:assert/strict'
import { readPayrollWalletBalance } from '../src/lib/gravarc/payrollWalletBalance.ts'

const calls = []
const readNative = async address => { calls.push(['native', address]); return 123n }
const readToken = async (token, address) => { calls.push(['token', token, address]); return 456n }
const wallet = '0x1111111111111111111111111111111111111111'
const token = '0x2222222222222222222222222222222222222222'

assert.equal(await readPayrollWalletBalance({ isNative: true, contractAddress: null }, wallet, readNative, readToken), 123n)
assert.deepEqual(calls.pop(), ['native', wallet])
assert.equal(await readPayrollWalletBalance({ isNative: false, contractAddress: token }, wallet, readNative, readToken), 456n)
assert.deepEqual(calls.pop(), ['token', token, wallet])
await assert.rejects(
  readPayrollWalletBalance({ isNative: false, contractAddress: null }, wallet, readNative, readToken),
  /no contract address/,
)
assert.equal(calls.length, 0)
