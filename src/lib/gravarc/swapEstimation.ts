export type SwapEstimate = {
  estimatedOutput: bigint
}

/**
 * Estimates the output amount of a swap.
 * MockSwap's fixed 1:1 token-unit output, scaled by token decimals.
 *
 * @param amountIn  — raw wei of the input token
 * @param inputDecimals  — decimals of the input token
 * @param outputDecimals — decimals of the output token
 * @returns estimatedOutput in raw wei of the output token
 */
export async function estimateSwapOutput(_params: {
  protocol: `0x${string}`
  tokenIn: `0x${string}`
  amountIn: bigint
  inputDecimals: number
  tokenOut: `0x${string}`
  outputDecimals: number
}): Promise<SwapEstimate> {
  // 1:1 in token units: scale by the decimal difference.
  const { amountIn, inputDecimals, outputDecimals } = _params
  let output: bigint
  if (outputDecimals >= inputDecimals) {
    output = amountIn * 10n ** BigInt(outputDecimals - inputDecimals)
  } else {
    output = amountIn / 10n ** BigInt(inputDecimals - outputDecimals)
  }
  return { estimatedOutput: output }
}
