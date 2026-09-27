import assert from 'node:assert/strict'
import { depositAction } from '../src/lib/confirm-sync/depositAction.ts'

const ready = { transactionStatus: 'ready', depositTxHash: null }
assert.equal(depositAction(ready, null, false), 'execute')
assert.equal(depositAction(ready, {}, false), 'recover')
assert.equal(depositAction(ready, { txHash: `0x${'ab'.repeat(32)}` }, false), 'pending')
assert.equal(depositAction(ready, null, true), 'pending')
assert.equal(depositAction({ ...ready, depositTxHash: `0x${'ab'.repeat(32)}` }, null, false), 'disabled')
assert.equal(depositAction({ ...ready, transactionStatus: 'complete' }, null, false), 'disabled')
assert.equal(depositAction({ ...ready, transactionStatus: 'complete' }, {}, false), 'disabled')
assert.equal(depositAction({ ...ready, transactionStatus: 'refunded' }, {}, false), 'disabled')
