import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { buildPoseidon } from 'circomlibjs'

// Capture the circuit witness at the proof boundary; never produce a proof or
// fetch artifacts. Each Node test file runs in its own process.
const mockProof = `export const groth16 = { fullProve: async input => {
  globalThis.__capturedWitnesses.push(input)
  return { proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'] } }
} }`
const mockCircuits = `export async function fetchCircuitBundle() {
  return { wasm: new Uint8Array([1]), zkey: new Uint8Array([1]) }
}`
const mockApi = `export const BACKEND = 'http://fixture.invalid'
export async function apiFetch() {
  return { ok: true, json: async () => globalThis.__depositPathFixture }
}`
const asModule = source => `data:text/javascript,${encodeURIComponent(source)}`
const coreLib = new URL('../../pact-privacy-web/lib/', import.meta.url)
const orgPoseidon = new URL('../src/lib/gravarc/poseidon.ts', import.meta.url)

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'snarkjs') return { url: asModule(mockProof), shortCircuit: true }
    if (specifier === '@/lib/api') return { url: asModule(mockApi), shortCircuit: true }
    if (specifier === '@/lib/circuitCache' || specifier === './circuitCache') {
      return { url: asModule(mockCircuits), shortCircuit: true }
    }
    if (specifier === '@/lib/poseidon') return { url: new URL('poseidon.ts', coreLib).href, shortCircuit: true }
    if (specifier === '@/lib/gravarc/poseidon') return { url: orgPoseidon.href, shortCircuit: true }
    if (specifier.startsWith('.') && !specifier.endsWith('.ts') && context.parentURL?.endsWith('.ts')) {
      const source = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(source))) return { url: source.href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  }
})

const coreDeposit = await import(new URL('depositProofBrowser.ts', coreLib))
const coreWithdraw = await import(new URL('withdrawProofBrowser.ts', coreLib))
const coreRefund = await import(new URL('refundProofBrowser.ts', coreLib))
const orgDeposit = await import('../src/lib/gravarc/depositProofBrowser.ts')
const orgWithdraw = await import('../src/lib/gravarc/withdrawProofBrowser.ts')
const orgRefund = await import('../src/lib/gravarc/refundProofBrowser.ts')
const { secretStringToField } = await import('../src/lib/gravarc/poseidon.ts')

const poseidon = await buildPoseidon()
const depositorSecret = 'fixture depositor secret'
const depositorSecretHash = poseidon.F.toObject(poseidon([await secretStringToField(depositorSecret)]))
const receivers = Array.from({ length: 8 }, (_, index) => ({
  address: `0x${(index + 1).toString(16).padStart(40, '0')}`,
  secretHash: String(index + 101),
  encPubkey: (index + 201).toString(16).padStart(64, '0'),
  amount: BigInt((index + 1) * 1000)
}))
globalThis.__depositPathFixture = { nextIndex: 0, siblings: Array(20).fill('0') }
globalThis.__capturedWitnesses = []
const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
assert.equal(cryptoDescriptor?.configurable, true)
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: { subtle: globalThis.crypto.subtle, getRandomValues: bytes => bytes.fill(7) }
})

async function capture(operation) {
  globalThis.__capturedWitnesses.length = 0
  const result = await operation()
  assert.equal(globalThis.__capturedWitnesses.length, 1)
  return { result, witness: globalThis.__capturedWitnesses[0] }
}

try {
  for (const refundable of [false, true]) {
    const core = await capture(() =>
      coreDeposit.generateDepositProof(receivers, 9n, 'eip155:11155111', undefined, {
        supportRefund: refundable,
        depositorSecretHash: depositorSecretHash.toString()
      })
    )
    const org = await capture(() =>
      orgDeposit.generateDepositProof(
        receivers,
        9n,
        globalThis.__depositPathFixture,
        refundable,
        depositorSecretHash.toString()
      )
    )
    assert.deepEqual(org.witness, core.witness, `deposit witness differs for refundable=${refundable}`)
    assert.equal(org.result.depositLeaf, core.result.depositLeaf)
    assert.equal(org.result.newDepositRoot, core.result.newDepositRoot)

    const receiver = core.result.receivers[0]
    const withdrawInfo = {
      ...receiver,
      amount: receiver.amount,
      token: '9',
      authRoot: core.result.authRoot,
      depositorSecretHash: core.result.depositorSecretHash,
      leafIndex: core.result.leafIndex,
      depositPathElements: core.result.depositPathElements,
      depositPathIndices: core.result.depositPathIndices,
      tier: core.result.tier
    }
    const coreClaim = await capture(() =>
      coreWithdraw.generateWithdrawProof(withdrawInfo, 'fixture receiver secret', receiver.address, 0n, 100n, 2n, 300n)
    )
    const orgClaim = await capture(() =>
      orgWithdraw.generateWithdrawProof(withdrawInfo, 'fixture receiver secret', receiver.address, 0n, 100n, 2n, 300n)
    )
    assert.deepEqual(orgClaim.witness, coreClaim.witness, 'withdraw witness differs')
    const router = `0x${'ab'.repeat(20)}`
    const commitment = `0x${'cd'.repeat(32)}`
    const coreDefi = await capture(() =>
      coreWithdraw.generateWithdrawProof(
        withdrawInfo,
        'fixture receiver secret',
        commitment,
        300n,
        100n,
        2n,
        300n,
        router
      )
    )
    const orgDefi = await capture(() =>
      orgWithdraw.generateWithdrawProof(
        withdrawInfo,
        'fixture receiver secret',
        commitment,
        300n,
        100n,
        2n,
        300n,
        router
      )
    )
    assert.deepEqual(orgDefi.witness, coreDefi.witness, 'DeFi withdrawal witness differs')
    await assert.rejects(
      orgWithdraw.generateWithdrawProof(
        { ...withdrawInfo, depositPathElements: [] },
        'fixture receiver secret',
        receiver.address,
        0n
      ),
      /fresh deposit membership path/
    )

    if (refundable) {
      const claimed = [100n, ...Array(7).fill(0n)]
      const coreContent = {
        token: '9',
        tier: 8,
        authRoot: core.result.authRoot,
        depositLeaf: core.result.depositLeaf,
        depositorSecretHash: core.result.depositorSecretHash,
        depositPathElements: core.result.depositPathElements,
        depositPathIndices: core.result.depositPathIndices,
        refundEntries: core.result.refundEntries
      }
      const coreReturn = await capture(() =>
        coreRefund.generateRefundProof(coreContent, depositorSecret, claimed, 36n, receiver.address, receiver.address)
      )
      const orgReturn = await capture(() =>
        orgRefund.generateRefundProof({
          slots: org.result.refundSlots,
          depositSecret: depositorSecret,
          token: '9',
          tier: 8,
          leafIndex: 0,
          depositPathElements: org.result.depositPathElements,
          depositPathIndices: org.result.depositPathIndices,
          totalClaimed: 100n,
          fee: 36n,
          relayer: receiver.address,
          refunder: receiver.address
        })
      )
      assert.deepEqual(orgReturn.witness, coreReturn.witness, 'refund witness differs')
      await assert.rejects(
        orgRefund.generateRefundProof({
          slots: org.result.refundSlots,
          depositSecret: depositorSecret,
          token: '9',
          tier: 8,
          leafIndex: 0,
          depositPathElements: [],
          depositPathIndices: org.result.depositPathIndices,
          totalClaimed: 100n,
          fee: 36n,
          relayer: receiver.address,
          refunder: receiver.address
        }),
        /Invalid deposit path length/
      )
    }
  }
} finally {
  Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
}
