import assert from 'node:assert/strict'
import { PrivacyUnlockCache } from '../src/lib/gravarc/privacyUnlockCache.ts'

const cache = new PrivacyUnlockCache()
const keyPair = { publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) }
const alice = 'alice:eip155:0x123'
const bob = 'bob:eip155:0x123'
assert.equal(cache.rememberKey, false)
cache.cache(alice, keyPair)
assert.equal(cache.get(alice), null)
cache.setRememberKey(true)
cache.cache(alice, keyPair)
assert.equal(cache.get(alice), keyPair)
assert.equal(cache.get(bob), null)
assert.equal(cache.get('alice:eip155:0x456'), null)
cache.forgetKeyPair()
assert.equal(cache.get(alice), null)
cache.cache(alice, keyPair)
cache.setRememberKey(false)
assert.equal(cache.get(alice), null)
cache.setRememberKey(true)
cache.cache(alice, keyPair)
cache.clear()
assert.equal(cache.rememberKey, false)
assert.equal(cache.get(alice), null)
