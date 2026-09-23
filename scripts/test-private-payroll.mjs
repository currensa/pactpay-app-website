import assert from 'node:assert/strict'
import nacl from 'tweetnacl'
import { naclDecryptWithKeyPair, naclEncrypt } from '../src/lib/gravarc/naclCrypto.ts'

const hex = bytes => Buffer.from(bytes).toString('hex')
const creator = nacl.box.keyPair()
const other = nacl.box.keyPair()
const plan = JSON.stringify({ version: 1, allocations: [{ memberId: 'member-1', amount: '1000' }] })
const ciphertext = naclEncrypt(plan, hex(creator.publicKey))

assert.equal(naclDecryptWithKeyPair(ciphertext, creator), plan)
assert.throws(() => naclDecryptWithKeyPair(ciphertext, other), /Decryption failed/)
assert.equal(ciphertext.includes(plan), false)
console.log('Private payroll encryption tests passed')
