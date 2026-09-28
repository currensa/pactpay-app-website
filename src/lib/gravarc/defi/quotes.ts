import { createPublicClient, custom, zeroAddress } from 'viem'
import { pacedRpcRead } from '../pacedRpcRead'
import type { DefiQuoteRequest } from './types'

const factoryAbi = [
  {
    name: 'getPool',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view'
  }
] as const
const quoterAbi = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' }
        ]
      }
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' }
    ],
    stateMutability: 'nonpayable'
  }
] as const
const kuruRouterAbi = [
  {
    name: 'verifiedMarket',
    type: 'function',
    inputs: [{ name: 'market', type: 'address' }],
    outputs: [
      { name: 'pricePrecision', type: 'uint32' },
      { name: 'sizePrecision', type: 'uint96' },
      { name: 'baseAssetAddress', type: 'address' },
      { name: 'baseAssetDecimals', type: 'uint256' },
      { name: 'quoteAssetAddress', type: 'address' },
      { name: 'quoteAssetDecimals', type: 'uint256' },
      { name: 'tickSize', type: 'uint32' },
      { name: 'minSize', type: 'uint96' },
      { name: 'maxSize', type: 'uint96' },
      { name: 'takerFeeBps', type: 'uint256' },
      { name: 'makerFeeBps', type: 'uint256' }
    ],
    stateMutability: 'view'
  }
] as const
const kuruMarketAbi = [
  {
    name: 'getVaultParams',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'kuruAmmVault', type: 'address' },
      { name: 'vaultBestBid', type: 'uint256' },
      { name: 'bidPartiallyFilledSize', type: 'uint96' },
      { name: 'vaultBestAsk', type: 'uint256' },
      { name: 'askPartiallyFilledSize', type: 'uint96' },
      { name: 'vaultBidOrderSize', type: 'uint96' },
      { name: 'vaultAskOrderSize', type: 'uint96' },
      { name: 'spread', type: 'uint96' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'placeAndExecuteMarketBuy',
    type: 'function',
    inputs: [
      { name: 'quoteAmount', type: 'uint96' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'isMargin', type: 'bool' },
      { name: 'isFillOrKill', type: 'bool' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable'
  },
  {
    name: 'placeAndExecuteMarketSell',
    type: 'function',
    inputs: [
      { name: 'size', type: 'uint96' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'isMargin', type: 'bool' },
      { name: 'isFillOrKill', type: 'bool' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable'
  }
] as const

function address(value: string | undefined): `0x${string}` {
  if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('DeFi route address is not configured')
  return value.toLowerCase() as `0x${string}`
}
function clientFor(request: DefiQuoteRequest) {
  if (request.family !== 'evm') throw new Error('EVM wallet is required for DeFi quotes')
  return createPublicClient({ transport: custom(request.walletProvider) })
}
const paced = <T>(request: DefiQuoteRequest, call: () => Promise<T>) => pacedRpcRead(`eip155:${request.chainId}`, call)

/** Core's Sepolia pool selection and QuoterV2 simulation, run against reviewed network JSON. */
export async function quoteUniswapV3Route(request: DefiQuoteRequest) {
  if (request.chainId !== 11155111 || request.amountIn <= 0n) throw new Error('Unsupported Uniswap V3 quote')
  const factory = address(request.protocol['help-contracts']?.factory)
  const quoter = address(request.protocol['help-contracts']?.quoterV2)
  const client = clientFor(request)
  const candidates = await Promise.all(
    ([100, 500, 3000, 10000] as const).map(async fee => {
      const pool = await paced(request, () =>
        client.readContract({
          address: factory,
          abi: factoryAbi,
          functionName: 'getPool',
          args: [request.inputToken, request.outputToken, fee]
        })
      )
      if (pool.toLowerCase() === zeroAddress) return null
      try {
        const { result } = await paced(request, () =>
          client.simulateContract({
            address: quoter,
            abi: quoterAbi,
            functionName: 'quoteExactInputSingle',
            args: [
              {
                tokenIn: request.inputToken,
                tokenOut: request.outputToken,
                amountIn: request.amountIn,
                fee,
                sqrtPriceLimitX96: 0n
              }
            ]
          })
        )
        return result[0] > 0n ? { fee, pool, amountOut: result[0] } : null
      } catch {
        return null
      }
    })
  )
  const best = candidates
    .filter(candidate => candidate !== null)
    .sort((left, right) => (left.amountOut === right.amountOut ? 0 : left.amountOut > right.amountOut ? -1 : 1))[0]
  if (!best) throw new Error('No usable direct Uniswap V3 pool is available for this pair')
  return {
    chainId: request.chainId,
    tokenIn: request.inputToken.toLowerCase(),
    tokenOut: request.outputToken.toLowerCase(),
    amountIn: request.amountIn.toString(),
    amountOut: best.amountOut.toString(),
    fee: best.fee,
    pool: best.pool.toLowerCase()
  }
}

/** Core's Monad market verification and fill-or-kill simulation. */
export async function quoteKuruRoute(request: DefiQuoteRequest) {
  if (request.chainId !== 10143 || request.amountIn <= 0n) throw new Error('Unsupported Kuru quote')
  const router = address(request.protocol.address)
  const market = address(request.protocol['help-contracts']?.market)
  const vault = address(request.protocol['help-contracts']?.vault)
  const client = clientFor(request)
  const blockNumber = await paced(request, () => client.getBlockNumber())
  const marketParams = await paced(request, () =>
    client.readContract({
      address: router,
      abi: kuruRouterAbi,
      functionName: 'verifiedMarket',
      args: [market],
      blockNumber
    })
  )
  const vaultParams = await paced(request, () =>
    client.readContract({ address: market, abi: kuruMarketAbi, functionName: 'getVaultParams', blockNumber })
  )
  const [pricePrecision, sizePrecision, baseToken, baseDecimals, quoteToken, quoteDecimals] = marketParams
  if (pricePrecision === 0 || sizePrecision === 0n || vaultParams[0].toLowerCase() !== vault) {
    throw new Error('Configured Kuru market or vault is invalid')
  }
  const tokenIn = request.inputToken.toLowerCase()
  const tokenOut = request.outputToken.toLowerCase()
  const isBuy = tokenIn === quoteToken.toLowerCase() && tokenOut === baseToken.toLowerCase()
  const isSell = tokenIn === baseToken.toLowerCase() && tokenOut === quoteToken.toLowerCase()
  if (!isBuy && !isSell) throw new Error('The pair is not supported by the configured Kuru market')
  const encodedAmount = isBuy
    ? (request.amountIn * BigInt(pricePrecision)) / 10n ** quoteDecimals
    : (request.amountIn * sizePrecision) / 10n ** baseDecimals
  if (encodedAmount <= 0n || encodedAmount > (1n << 96n) - 1n)
    throw new Error('Kuru market amount is outside its precision')
  const { result: amountOut } = await paced(request, () =>
    client.simulateContract({
      account: zeroAddress,
      address: market,
      abi: kuruMarketAbi,
      functionName: isBuy ? 'placeAndExecuteMarketBuy' : 'placeAndExecuteMarketSell',
      args: [encodedAmount, 0n, false, true],
      blockNumber
    })
  )
  if (amountOut <= 0n) throw new Error('Kuru returned an empty quote')
  return {
    chainId: request.chainId,
    router,
    market,
    vault,
    baseToken: baseToken.toLowerCase(),
    quoteToken: quoteToken.toLowerCase(),
    tokenIn,
    tokenOut,
    amountIn: request.amountIn.toString(),
    amountOut: amountOut.toString(),
    isBuy,
    blockNumber: blockNumber.toString()
  }
}
