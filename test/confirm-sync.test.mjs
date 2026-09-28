import assert from 'node:assert/strict'
import { build } from 'esbuild'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
}

const result = await build({
  entryPoints: ['src/lib/confirm-sync/manager.ts'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  write: false,
  plugins: [{
    name: 'stub-confirm-request',
    setup(plugin) {
      plugin.onResolve({ filter: /^\.\/executors$/ }, () => ({ path: 'executors', namespace: 'stub' }))
      plugin.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
        contents: 'export const executeJob = job => globalThis.confirmRequest(job)',
      }))
    },
  }],
})
const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
const first = await import(`${moduleUrl}#first`)
const job = {
  type: 'confirm-privacy-deposit', orgId: 'org', batchId: 'batch',
  depositTxHash: '0x1234', withdrawMessages: [], label: 'test deposit',
}
first.confirmSync.stage(job)
assert.equal(JSON.parse(values.get('pactpay:pendingConfirmations')).length, 1)

// A new manager instance represents the page reloading. The persisted job resumes.
let requests = 0
globalThis.confirmRequest = async () => { requests += 1 }
const reloaded = await import(`${moduleUrl}#reloaded`)
reloaded.confirmSync.resume()
await new Promise(resolve => setTimeout(resolve, 10))
assert.equal(requests, 1)
assert.equal(JSON.parse(values.get('pactpay:pendingConfirmations')).length, 0)

// A failed post-chain callback remains saved and retries to success.
globalThis.confirmRequest = async () => {
  requests += 1
  if (requests === 2) throw new Error('API unavailable')
}
assert.equal(await reloaded.confirmSync.enqueue(job), 'synced')
assert.equal(requests, 3)
assert.equal(JSON.parse(values.get('pactpay:pendingConfirmations')).length, 0)

reloaded.confirmSync.stage(job)
reloaded.confirmSync.discard(job)
assert.equal(JSON.parse(values.get('pactpay:pendingConfirmations')).length, 0)
const delivered = []
globalThis.confirmRequest = async current => { delivered.push(current.type) }
for (const privateJob of [
  { type: 'confirm-withdraw', itemId: 'item-1', txHash: '0x5678', label: 'test withdrawal' },
  { type: 'confirm-refund-gravarc', orgId: 'org', batchId: 'batch', refundTxHash: '0x9abc', label: 'test refund' },
]) {
  reloaded.confirmSync.stage(privateJob)
  const staged = JSON.parse(values.get('pactpay:pendingConfirmations'))
  assert.equal(staged.length, 1)
  assert.equal(staged[0].type, privateJob.type)
  assert.equal(await reloaded.confirmSync.enqueue(privateJob), 'synced')
  assert.equal(JSON.parse(values.get('pactpay:pendingConfirmations')).length, 0)
}
assert.deepEqual(delivered, ['confirm-withdraw', 'confirm-refund-gravarc'])
globalThis.localStorage.setItem = () => { throw new Error('storage unavailable') }
assert.throws(() => reloaded.confirmSync.stage(job), /Could not save/)
console.log('Confirmation recovery tests passed')
