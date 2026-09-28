import { encodeFunctionData, zeroAddress } from 'viem'
import { ERC20_ABI } from '@/lib/gravarc/gravarcAbi'
import { quoteUniswapV3Route } from '../quotes'
import type {
  DefiBuildRequest,
  DefiHelpContracts,
  DefiProtocolAdapter,
  DefiQuoteRequest
} from '@/lib/gravarc/defi/types'

const QUOTE_TTL_MS = 60_000
const TRANSACTION_TTL_SECONDS = 30 * 60

type UniswapV3HelpContracts = {
  factory: `0x${string}`
  quoterV2: `0x${string}`
  swapRouter02: `0x${string}`
  weth9: `0x${string}`
}

type UniswapV3Route = {
  chainId: number
  tokenIn: `0x${string}`
  tokenOut: `0x${string}`
  amountIn: string
  amountOut: string
  fee: number
  pool: `0x${string}`
}

const SWAP_ROUTER_02_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable'
  },
  {
    name: 'multicall',
    type: 'function',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'data', type: 'bytes[]' }
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable'
  }
] as const

function normalizedAddress(value: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('Invalid EVM address')
  return value.toLowerCase() as `0x${string}`
}

function helpContracts(request: DefiQuoteRequest | DefiBuildRequest): UniswapV3HelpContracts {
  const helpers = request.protocol['help-contracts']
  if (!helpers) throw new Error('Uniswap V3 helper contracts are not configured')
  const required = ['factory', 'quoterV2', 'swapRouter02', 'weth9'] as const
  for (const key of required) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(helpers[key])) {
      throw new Error(`Invalid Uniswap V3 ${key} address`)
    }
  }
  if (helpers.swapRouter02.toLowerCase() !== request.protocol.address.toLowerCase()) {
    throw new Error('Uniswap V3 primary address does not match SwapRouter02')
  }
  return helpers as DefiHelpContracts & UniswapV3HelpContracts
}

function validateTokens(request: DefiQuoteRequest | DefiBuildRequest): void {
  if (request.family !== 'evm') throw new Error('Uniswap V3 is supported only on EVM chains')
  if (request.inputToken.toLowerCase() === zeroAddress || request.outputToken.toLowerCase() === zeroAddress) {
    throw new Error('Uniswap V3 currently supports ERC-20 tokens only; wrap ETH into WETH first')
  }
  if (request.inputToken.toLowerCase() === request.outputToken.toLowerCase()) {
    throw new Error('Uniswap V3 input and output tokens must differ')
  }
  if (request.amountIn <= 0n) throw new Error('Uniswap V3 input amount must be positive')
}

function routePayload(value: unknown): UniswapV3Route {
  if (!value || typeof value !== 'object') throw new Error('Uniswap V3 quote route is missing')
  const route = value as Partial<UniswapV3Route>
  if (
    !Number.isSafeInteger(route.chainId) ||
    typeof route.tokenIn !== 'string' ||
    typeof route.tokenOut !== 'string' ||
    typeof route.amountIn !== 'string' ||
    typeof route.amountOut !== 'string' ||
    typeof route.fee !== 'number' ||
    !Number.isInteger(route.fee) ||
    typeof route.pool !== 'string'
  )
    throw new Error('Invalid Uniswap V3 quote route')
  normalizedAddress(route.tokenIn)
  normalizedAddress(route.tokenOut)
  normalizedAddress(route.pool)
  if (![100, 500, 3000, 10000].includes(route.fee)) throw new Error('Unsupported Uniswap V3 fee tier')
  if (!/^[1-9][0-9]*$/.test(route.amountIn) || !/^[1-9][0-9]*$/.test(route.amountOut)) {
    throw new Error('Invalid Uniswap V3 quote amounts')
  }
  return route as UniswapV3Route
}

function validateRoute(route: UniswapV3Route, request: DefiQuoteRequest | DefiBuildRequest): void {
  if (route.chainId !== request.chainId) throw new Error('Uniswap V3 quote chain mismatch')
  if (route.tokenIn.toLowerCase() !== request.inputToken.toLowerCase()) {
    throw new Error('Uniswap V3 quote input token mismatch')
  }
  if (route.tokenOut.toLowerCase() !== request.outputToken.toLowerCase()) {
    throw new Error('Uniswap V3 quote output token mismatch')
  }
  if (BigInt(route.amountIn) !== request.amountIn) throw new Error('Uniswap V3 quote input amount mismatch')
}

function feeLabel(fee: number): string {
  return `${fee / 10_000}%`
}

export const uniswapV3Adapter: DefiProtocolAdapter = {
  type: 'uniswap-v3',
  family: 'evm',
  supportsNativeAssets: false,
  supportsPrivateRedeposit: true,

  async quote(request) {
    helpContracts(request)
    validateTokens(request)
    const route = routePayload(await quoteUniswapV3Route(request))
    validateRoute(route, request)
    const estimatedOutput = BigInt(route.amountOut)
    const minimumOutput = (estimatedOutput * (10_000n - request.slippageBips)) / 10_000n
    if (minimumOutput <= 0n) throw new Error('Uniswap V3 returned an empty quote')
    return {
      protocolType: this.type,
      amountIn: request.amountIn,
      estimatedOutput,
      minimumOutput,
      expiresAt: Date.now() + QUOTE_TTL_MS,
      routeLabel: `Direct pool · ${feeLabel(route.fee)} fee`,
      payload: route
    }
  },

  buildSwapPlan(request) {
    const helpers = helpContracts(request)
    validateTokens(request)
    if (request.quote.protocolType !== this.type || request.quote.amountIn !== request.amountIn) {
      throw new Error('The Uniswap V3 quote does not match this operation')
    }
    if (Date.now() > request.quote.expiresAt) throw new Error('The Uniswap V3 quote expired; request a fresh quote')
    const route = routePayload(request.quote.payload)
    validateRoute(route, request)

    const amountOutMinimum =
      request.requiredOutput !== undefined && request.requiredOutput > request.quote.minimumOutput
        ? request.requiredOutput
        : request.quote.minimumOutput
    if (amountOutMinimum <= 0n || amountOutMinimum > request.quote.estimatedOutput) {
      throw new Error('Invalid Uniswap V3 minimum output')
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + TRANSACTION_TTL_SECONDS)
    const swap = encodeFunctionData({
      abi: SWAP_ROUTER_02_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: request.inputToken,
          tokenOut: request.outputToken,
          fee: route.fee,
          recipient: request.destination,
          amountIn: request.amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n
        }
      ]
    })

    return {
      outputLocation: 'recipient',
      calls: [
        {
          target: request.inputToken,
          value: 0n,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [helpers.swapRouter02, request.amountIn]
          })
        },
        {
          target: helpers.swapRouter02,
          value: 0n,
          data: encodeFunctionData({
            abi: SWAP_ROUTER_02_ABI,
            functionName: 'multicall',
            args: [deadline, [swap]]
          })
        },
        {
          target: request.inputToken,
          value: 0n,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [helpers.swapRouter02, 0n]
          })
        }
      ],
      preview: [
        { target: request.inputToken, label: 'Authorize Uniswap V3' },
        { target: helpers.swapRouter02, label: `Swap ${request.quote.routeLabel}` },
        { target: request.inputToken, label: 'Clear the Uniswap V3 allowance' }
      ]
    }
  }
}
