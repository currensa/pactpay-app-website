import type { DefiCall } from '@/lib/gravarc/defiCommitment'
import type { Provider } from '@reown/appkit/react'

export type DefiHelpContracts = Record<string, `0x${string}`>

export type DefiProtocolConfig = {
  name: string
  type?: string
  outputBehavior?: 'fixed' | 'variable'
  address: `0x${string}`
  'help-contracts'?: DefiHelpContracts
}

export type DefiQuote = {
  protocolType: string
  amountIn: bigint
  estimatedOutput: bigint
  minimumOutput: bigint
  expiresAt: number
  routeLabel: string
  payload?: unknown
}

export type DefiQuoteRequest = {
  chainId: number
  family: 'evm' | 'tron'
  walletProvider: Provider
  protocol: DefiProtocolConfig
  inputToken: `0x${string}`
  outputToken: `0x${string}`
  amountIn: bigint
  inputDecimals: number
  outputDecimals: number
  slippageBips: bigint
}

export type DefiBuildRequest = DefiQuoteRequest & {
  quote: DefiQuote
  pureRouter: `0x${string}`
  destination: `0x${string}`
  requiredOutput?: bigint
}

export type DefiSwapPlan = {
  calls: DefiCall[]
  preview: { target: string; label: string }[]
  outputLocation: 'pure-router' | 'recipient'
}

export type DefiProtocolAdapter = {
  type: string
  family: 'evm' | 'tron'
  supportsNativeAssets: boolean
  supportsPrivateRedeposit: boolean
  quote(request: DefiQuoteRequest): Promise<DefiQuote>
  buildSwapPlan(request: DefiBuildRequest): DefiSwapPlan
}

export function protocolType(protocol: DefiProtocolConfig): string {
  return protocol.type ?? 'mock-swap'
}

export function protocolOutputBehavior(protocol: DefiProtocolConfig): 'fixed' | 'variable' {
  return protocol.outputBehavior ?? 'fixed'
}
