import assert from 'node:assert/strict'
import { toContractProof } from '../src/lib/gravarc/proofFormat.ts'

assert.deepEqual(toContractProof({
  pi_a: ['1', '2', '1'],
  pi_b: [['3', '4'], ['5', '6'], ['1', '0']],
  pi_c: ['7', '8', '1'],
}), {
  pA: ['1', '2'],
  pB: [['4', '3'], ['6', '5']],
  pC: ['7', '8'],
})
assert.throws(() => toContractProof({ pi_a: ['1'], pi_b: [['2', '3']], pi_c: ['4'] }), /Incomplete/)
console.log('Proof format tests passed')
