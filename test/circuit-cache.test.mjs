import assert from 'node:assert/strict'
import { fetchCircuitBundle } from '../src/lib/gravarc/circuitCache.ts'

const bytes = new TextEncoder().encode('verified test artifact')
const hash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex')
const artifacts = {}
for (const circuit of ['deposit', 'withdraw', 'refund']) for (const tier of [8, 16, 32, 64, 128]) {
  artifacts[`${circuit}_${tier}.wasm`] = { path: `${circuit}_${tier}_js/${circuit}_${tier}.wasm`, size: bytes.length, sha256: hash }
  artifacts[`${circuit}_${tier}.zkey`] = { path: `${circuit}_${tier}_final.zkey`, size: bytes.length, sha256: hash }
}
const manifest = { schemaVersion: 1, bundleVersion: 'a'.repeat(64), artifacts }
const originalFetch = globalThis.fetch
const originalIndexedDB = globalThis.indexedDB
let downloads = 0
let corrupt = false
globalThis.fetch = async url => {
  if (String(url).endsWith('/manifest.json')) return Response.json(manifest)
  downloads += 1
  return new Response(corrupt ? new Uint8Array([1, 2, 3]) : bytes)
}

try {
  globalThis.indexedDB = { open: () => { throw new Error('browser storage denied') } }
  const first = await fetchCircuitBundle('deposit', 8)
  assert.equal(first.bundleVersion, manifest.bundleVersion)
  assert.equal(first.wasm.byteLength, bytes.length)
  assert.equal(downloads, 2)
  await fetchCircuitBundle('deposit', 8)
  assert.equal(downloads, 2, 'verified memory cache was not reused')

  corrupt = true
  await assert.rejects(() => fetchCircuitBundle('deposit', 16), /shorter than manifest size/)
  corrupt = false
  manifest.artifacts['deposit_16.wasm'].path = '../invalid.wasm'
  await assert.rejects(() => fetchCircuitBundle('deposit', 16), /Invalid circuit artifact/)
  await assert.rejects(() => fetchCircuitBundle('deposit', 1), /Unsupported circuit tier/)
  console.log('Circuit cache tests passed')
} finally {
  globalThis.fetch = originalFetch
  globalThis.indexedDB = originalIndexedDB
}
