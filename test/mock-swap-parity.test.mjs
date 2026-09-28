import assert from 'node:assert/strict'
import { estimateSwapOutput } from '../src/lib/gravarc/swapEstimation.ts'

const tokenIn = `0x${'11'.repeat(20)}`
const tokenOut = `0x${'22'.repeat(20)}`
const protocol = `0x${'33'.repeat(20)}`

// Core MockSwap is fixed 1:1 in token units; integer division rounds down.
for (const [amountIn, inputDecimals, outputDecimals, expected] of [
  [1250000n, 6, 18, 1250000000000000000n],
  [1250000000000000000n, 18, 6, 1250000n],
  [1000000000001n, 18, 6, 1n],
  [1n, 18, 6, 0n],
  [42n, 18, 18, 42n]
]) {
  const result = await estimateSwapOutput({ protocol, tokenIn, tokenOut, amountIn, inputDecimals, outputDecimals })
  assert.equal(result.estimatedOutput, expected)
}
