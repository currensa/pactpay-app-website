import { kuruAdapter } from './protocols/kuru'
import { mockSwapAdapter } from './protocols/mockSwap'
import { uniswapV3Adapter } from './protocols/uniswapV3'
import { protocolType, type DefiProtocolAdapter, type DefiProtocolConfig } from './types'

const adapters: Record<string, DefiProtocolAdapter> = {
  [kuruAdapter.type]: kuruAdapter,
  [mockSwapAdapter.type]: mockSwapAdapter,
  [uniswapV3Adapter.type]: uniswapV3Adapter
}

export function getDefiAdapter(protocol: DefiProtocolConfig): DefiProtocolAdapter {
  const adapter = adapters[protocolType(protocol)]
  if (!adapter || adapter.family !== 'evm') throw new Error('Unsupported EVM DeFi protocol')
  return adapter
}
