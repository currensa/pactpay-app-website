import assert from 'node:assert/strict'
import { AbiCoder, concat, getBytes, keccak256, getAddress } from 'ethers'
import { computeDefiCommitment } from '../src/lib/gravarc/defiCommitment.ts'

const coder = AbiCoder.defaultAbiCoder()
const calls = [
  { target: '0x1111111111111111111111111111111111111111', value: 0n, data: '0x1234' },
  { target: '0x2222222222222222222222222222222222222222', value: 7n, data: '0xabcd' }
]
const fee = 19n
const hashes = calls.map(call =>
  keccak256(coder.encode(['address', 'uint256', 'bytes'], [call.target, call.value, call.data]))
)
const callsHash = keccak256(concat(hashes))
const full = keccak256(concat([getBytes(coder.encode(['uint256'], [fee])), getBytes(callsHash)]))
assert.equal(computeDefiCommitment(fee, calls).toLowerCase(), getAddress(`0x${full.slice(-40)}`).toLowerCase())
assert.notEqual(computeDefiCommitment(0n, calls), computeDefiCommitment(fee, calls))
assert.notEqual(computeDefiCommitment(fee, calls.slice().reverse()), computeDefiCommitment(fee, calls))
const emptyCallsHash = `0x${'00'.repeat(32)}`
const emptyCommitment = keccak256(coder.encode(['uint256', 'bytes32'], [0n, emptyCallsHash]))
assert.equal(computeDefiCommitment(0n, []).toLowerCase(), getAddress(`0x${emptyCommitment.slice(-40)}`).toLowerCase())
