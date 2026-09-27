import assert from 'node:assert/strict'
import { pacedRpcRead } from '../src/lib/gravarc/pacedRpcRead.ts'

const started = []
const reads = [0, 1, 2].map(index => pacedRpcRead('eip155:10143', async () => {
  started.push(Date.now())
  return index
}))
assert.deepEqual(await Promise.all(reads), [0, 1, 2])
assert.ok(started[1] - started[0] >= 100)
assert.ok(started[2] - started[1] >= 100)
