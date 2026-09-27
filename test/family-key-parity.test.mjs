import assert from 'node:assert/strict'
import { deriveNaclKeyPair, secretboxEncryptWithKey, secretboxDecryptWithKey } from '../src/lib/gravarc/naclCrypto.ts'

// Captured from Core's EVM deriveNaclKeyPair with the fixed signature below.
const signature = `0x${'42'.repeat(65)}`
const wallet = {
  signTypedData: async payload => {
    assert.deepEqual(payload, {
      domain: { name: 'GravArc', version: '1' },
      types: { EncryptionKey: [{ name: 'password', type: 'string' }] },
      primaryType: 'EncryptionKey',
      message: { password: 'fixture-only-password' },
    })
    return signature
  },
}

const password = 'fixture-only-password'
const key = await deriveNaclKeyPair(password, wallet)
assert.equal(Buffer.from(key.publicKey).toString('hex'), '5a7db95be34d33a4cb1a564bc2f4f4e1c510cb1d807dd3a9a345f932ff246b27')
assert.equal(secretboxDecryptWithKey(secretboxEncryptWithKey('fixture-only-secret', key.secretKey), key.secretKey), 'fixture-only-secret')
console.log('Core/Organization EVM key parity tests passed')
