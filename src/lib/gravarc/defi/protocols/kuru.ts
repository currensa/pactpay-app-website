import { encodeFunctionData, zeroAddress } from 'viem'
import { ERC20_ABI } from '@/lib/gravarc/gravarcAbi'
import { quoteKuruRoute } from '../quotes'
import type {
  DefiBuildRequest,
  DefiHelpContracts,
  DefiProtocolAdapter,
  DefiQuoteRequest
} from '@/lib/gravarc/defi/types'

const MONAD_TESTNET_CHAIN_ID = 10143
const QUOTE_TTL_MS = 60_000

type KuruHelpContracts = {
  market: `0x${string}`
  vault: `0x${string}`
  marginAccount: `0x${string}`
}

type KuruRoute = {
  chainId: number
  router: `0x${string}`
  market: `0x${string}`
  vault: `0x${string}`
  baseToken: `0x${string}`
  quoteToken: `0x${string}`
  tokenIn: `0x${string}`
  tokenOut: `0x${string}`
  amountIn: string
  amountOut: string
  isBuy: boolean
  blockNumber: string
}

const KURU_ROUTER_ABI = [
  {
    name: 'anyToAnySwap',
    type: 'function',
    inputs: [
      { name: 'marketAddresses', type: 'address[]' },
      { name: 'isBuy', type: 'bool[]' },
      { name: 'nativeSend', type: 'bool[]' },
      { name: 'debitToken', type: 'address' },
      { name: 'creditToken', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable'
  }
] as const

function normalizedAddress(value: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('Invalid EVM address')
  return value.toLowerCase() as `0x${string}`
}

function helpContracts(request: DefiQuoteRequest | DefiBuildRequest): KuruHelpContracts {
  const helpers = request.protocol['help-contracts']
  if (!helpers) throw new Error('Kuru helper contracts are not configured')
  const required = ['market', 'vault', 'marginAccount'] as const
  for (const key of required) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(helpers[key])) {
      throw new Error(`Invalid Kuru ${key} address`)
    }
  }
  normalizedAddress(request.protocol.address)
  return helpers as DefiHelpContracts & KuruHelpContracts
}

function validateTokens(request: DefiQuoteRequest | DefiBuildRequest): void {
  if (request.chainId !== MONAD_TESTNET_CHAIN_ID || request.family !== 'evm') {
    throw new Error('Kuru is currently supported only on Monad Testnet')
  }
  if (request.inputToken.toLowerCase() === zeroAddress || request.outputToken.toLowerCase() === zeroAddress) {
    throw new Error('Kuru currently supports ERC-20 tokens only')
  }
  if (request.inputToken.toLowerCase() === request.outputToken.toLowerCase()) {
    throw new Error('Kuru input and output tokens must differ')
  }
  if (request.amountIn <= 0n) throw new Error('Kuru input amount must be positive')
}

function routePayload(value: unknown): KuruRoute {
  if (!value || typeof value !== 'object') throw new Error('Kuru quote route is missing')
  const route = value as Partial<KuruRoute>
  if (
    !Number.isSafeInteger(route.chainId) ||
    typeof route.router !== 'string' ||
    typeof route.market !== 'string' ||
    typeof route.vault !== 'string' ||
    typeof route.baseToken !== 'string' ||
    typeof route.quoteToken !== 'string' ||
    typeof route.tokenIn !== 'string' ||
    typeof route.tokenOut !== 'string' ||
    typeof route.amountIn !== 'string' ||
    typeof route.amountOut !== 'string' ||
    typeof route.isBuy !== 'boolean' ||
    typeof route.blockNumber !== 'string'
  )
    throw new Error('Invalid Kuru quote route')
  normalizedAddress(route.router)
  normalizedAddress(route.market)
  normalizedAddress(route.vault)
  normalizedAddress(route.baseToken)
  normalizedAddress(route.quoteToken)
  normalizedAddress(route.tokenIn)
  normalizedAddress(route.tokenOut)
  if (
    !/^[1-9][0-9]*$/.test(route.amountIn) ||
    !/^[1-9][0-9]*$/.test(route.amountOut) ||
    !/^[0-9]+$/.test(route.blockNumber)
  )
    throw new Error('Invalid Kuru quote values')
  return route as KuruRoute
}

function validateRoute(route: KuruRoute, request: DefiQuoteRequest | DefiBuildRequest): void {
  const helpers = helpContracts(request)
  if (route.chainId !== request.chainId) throw new Error('Kuru quote chain mismatch')
  if (route.router.toLowerCase() !== request.protocol.address.toLowerCase()) {
    throw new Error('Kuru quote Router mismatch')
  }
  if (route.market.toLowerCase() !== helpers.market.toLowerCase()) {
    throw new Error('Kuru quote market mismatch')
  }
  if (route.vault.toLowerCase() !== helpers.vault.toLowerCase()) {
    throw new Error('Kuru quote vault mismatch')
  }
  if (route.tokenIn.toLowerCase() !== request.inputToken.toLowerCase()) {
    throw new Error('Kuru quote input token mismatch')
  }
  if (route.tokenOut.toLowerCase() !== request.outputToken.toLowerCase()) {
    throw new Error('Kuru quote output token mismatch')
  }
  const directionMatches = route.isBuy
    ? route.tokenIn.toLowerCase() === route.quoteToken.toLowerCase() &&
      route.tokenOut.toLowerCase() === route.baseToken.toLowerCase()
    : route.tokenIn.toLowerCase() === route.baseToken.toLowerCase() &&
      route.tokenOut.toLowerCase() === route.quoteToken.toLowerCase()
  if (!directionMatches) throw new Error('Kuru quote direction mismatch')
  if (BigInt(route.amountIn) !== request.amountIn) throw new Error('Kuru quote input amount mismatch')
}

export const kuruAdapter: DefiProtocolAdapter = {
  type: 'kuru',
  family: 'evm',
  supportsNativeAssets: false,
  supportsPrivateRedeposit: true,

  async quote(request) {
    helpContracts(request)
    validateTokens(request)
    const route = routePayload(await quoteKuruRoute(request))
    validateRoute(route, request)
    const estimatedOutput = BigInt(route.amountOut)
    const minimumOutput = (estimatedOutput * (10_000n - request.slippageBips)) / 10_000n
    if (estimatedOutput <= 0n || minimumOutput <= 0n) throw new Error('Kuru returned an empty quote')
    return {
      protocolType: this.type,
      amountIn: request.amountIn,
      estimatedOutput,
      minimumOutput,
      expiresAt: Date.now() + QUOTE_TTL_MS,
      routeLabel: 'Direct Kuru market',
      payload: route
    }
  },

  buildSwapPlan(request) {
    const helpers = helpContracts(request)
    validateTokens(request)
    if (request.quote.protocolType !== this.type || request.quote.amountIn !== request.amountIn) {
      throw new Error('The Kuru quote does not match this operation')
    }
    if (Date.now() > request.quote.expiresAt) throw new Error('The Kuru quote expired; request a fresh quote')
    const route = routePayload(request.quote.payload)
    validateRoute(route, request)

    const minimumOutput =
      request.requiredOutput !== undefined && request.requiredOutput > request.quote.minimumOutput
        ? request.requiredOutput
        : request.quote.minimumOutput
    if (minimumOutput <= 0n || minimumOutput > request.quote.estimatedOutput) {
      throw new Error('Invalid Kuru minimum output')
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
            abi: KURU_ROUTER_ABI,
            functionName: 'anyToAnySwap',
            args: [
              [helpers.market],
              [route.isBuy],
              [false],
              request.inputToken,
              request.outputToken,
              request.amountIn,
              minimumOutput
            ]
          })
        },
        {
          target: request.inputToken,
          value: 0n,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [request.protocol.address, 0n]
          })
        }
      ],
      preview: [
        { target: request.inputToken, label: 'Authorize the Kuru Router' },
        { target: request.protocol.address, label: `Swap ${request.quote.routeLabel}` },
        { target: request.inputToken, label: 'Clear the Kuru Router allowance' }
      ]
    }
  }
}
