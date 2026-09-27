import assert from 'node:assert/strict'
import { payoutIntentMatchesToken } from '../src/lib/gravarc/payrollTokenSelection.ts'

const intent = { caipChainId: 'eip155:11155111', token: '0xAbCd' }
assert.equal(payoutIntentMatchesToken(intent, 'eip155:11155111', '0xabcd'), true)
assert.equal(payoutIntentMatchesToken(intent, 'eip155:10143', '0xabcd'), false)
assert.equal(payoutIntentMatchesToken(intent, 'eip155:11155111', '0x1234'), false)
assert.equal(payoutIntentMatchesToken(null, 'eip155:11155111', '0xabcd'), false)
