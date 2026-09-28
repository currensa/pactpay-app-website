import { encodeFunctionData } from 'viem'
import { ERC20_ABI } from '@/lib/gravarc/gravarcAbi'
import { SWAP_ABI } from '@/lib/gravarc/defiAbi'
import { estimateSwapOutput } from '@/lib/gravarc/swapEstimation'
import type { DefiProtocolAdapter } from '@/lib/gravarc/defi/types'

export const mockSwapAdapter: DefiProtocolAdapter = {
  type: 'mock-swap',
  family: 'evm',
  supportsNativeAssets: false,
  supportsPrivateRedeposit: true,

  async quote(request) {
    const result = await estimateSwapOutput({
      protocol: request.protocol.address,
      tokenIn: request.inputToken,
      amountIn: request.amountIn,
      inputDecimals: request.inputDecimals,
      tokenOut: request.outputToken,
      outputDecimals: request.outputDecimals
    })
    return {
      protocolType: this.type,
      amountIn: request.amountIn,
      estimatedOutput: result.estimatedOutput,
      minimumOutput: result.estimatedOutput,
      expiresAt: Date.now() + 60_000,
      routeLabel: request.protocol.name
    }
  },

  buildSwapPlan(request) {
    if (request.quote.protocolType !== this.type || request.quote.amountIn !== request.amountIn) {
      throw new Error('The swap quote does not match this operation')
    }
    return {
      outputLocation: 'pure-router',
      calls: [
        {
          target: request.inputToken,
          value: 0n,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [request.protocol.address, request.amountIn]
          })
        },
        {
          target: request.protocol.address,
          value: 0n,
          data: encodeFunctionData({
            abi: SWAP_ABI,
            functionName: 'swap',
            args: [request.inputToken, request.amountIn, request.outputToken, request.pureRouter]
          })
        }
      ],
      preview: [
        { target: request.inputToken, label: `Approve ${request.protocol.name}` },
        { target: request.protocol.address, label: `Swap through ${request.protocol.name}` }
      ]
    }
  }
}
