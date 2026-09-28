import apis from '@/apis'
import type { PrivacyPayrollItem } from '@/apis/transaction.api'
import type { NetworkConfigResponse } from '@/apis/chain-asset.api'
import { verifyDepositMembershipPath } from '@/lib/gravarc/depositMembershipPath'
import { generateDepositProof, type ReceiverInput } from '@/lib/gravarc/depositProofBrowser'
import { getDefiAdapter } from '@/lib/gravarc/defi/registry'
import { protocolType, type DefiProtocolConfig, type DefiQuote } from '@/lib/gravarc/defi/types'
import { PACT_PRIVACY_DEFI_ROUTER_ABI, PURE_ROUTER_ABI } from '@/lib/gravarc/defiAbi'
import { computeDefiCommitment, type DefiCall } from '@/lib/gravarc/defiCommitment'
import { ERC20_ABI, GRAVARC_ABI } from '@/lib/gravarc/gravarcAbi'
import { privateWithdrawBalance, validatePrivateWithdrawAmount } from '@/lib/gravarc/privateWithdrawBalance'
import { unlockPrivacyPayrollItem } from '@/lib/gravarc/privacyWithdraw'
import {
  assertRedepositReceipt,
  attachRedepositHash,
  deliverRedeposit,
  discardRejectedRedeposit,
  prepareRedeposit,
  waitForIndexedDelivery,
  type PreparedRedeposit
} from '@/lib/gravarc/defi/preparedRedeposit'
import { computeNullifierHash, generateWithdrawProof } from '@/lib/gravarc/withdrawProofBrowser'
import type { Provider } from '@reown/appkit/react'
import { createPublicClient, createWalletClient, custom, encodeFunctionData, getAddress, type Hex } from 'viem'

const MATERIAL_QUOTE_CHANGE_BIPS = 50n

function quoteChangeBips(previous: bigint, next: bigint): bigint {
  if (previous <= 0n) return 10_000n
  return ((previous > next ? previous - next : next - previous) * 10_000n) / previous
}

function requireContract(value: string): Hex {
  return getAddress(value)
}

export interface DirectDefiParams {
  item: PrivacyPayrollItem
  network: NetworkConfigResponse
  protocol: DefiProtocolConfig
  outputToken: Hex
  amountIn: bigint
  slippageBips: bigint
  destination: Hex
  displayedQuote: DefiQuote
  keyPair: { secretKey: Uint8Array }
  walletProvider: Provider
  account: Hex
  confirmQuoteChange: (fresh: DefiQuote) => boolean | Promise<boolean>
  redeposit?: { receivers: ReceiverInput[]; excessRecipient: Hex }
  onStatus?: (message: string) => void
}

export interface DirectDefiResult {
  txHash: Hex
  deliveryPending: boolean
}

/** Core-equivalent direct swap of one owned allocation; no server or relayer fee. */
export async function routePrivateAllocation(params: DirectDefiParams): Promise<DirectDefiResult> {
  const { item, network, walletProvider, keyPair, onStatus } = params
  if (!network.capabilities.defi || network.family !== 'evm' || item.batch.caipChainId !== network.caipChainId) {
    throw new Error('This allocation has no configured EVM DeFi route')
  }
  const configuredProtocol = network.protocols.find(
    protocol =>
      protocol.address.toLowerCase() === params.protocol.address.toLowerCase() && protocol.type === params.protocol.type
  )
  if (!configuredProtocol) throw new Error('The route is no longer configured for this network')
  if (params.slippageBips < 0n || params.slippageBips >= 10_000n) throw new Error('Invalid slippage bound')
  const inputToken = requireContract(item.tokenAddress || item.batch.tokenAddress)
  const outputToken = requireContract(params.outputToken)
  const destination = params.redeposit
    ? requireContract(network.contracts.pureRouter)
    : requireContract(params.destination)
  const account = requireContract(params.account)
  const gravArc = requireContract(network.contracts.gravArc)
  const pureRouter = requireContract(network.contracts.pureRouter)
  const defiRouter = requireContract(network.contracts.defiRouter)
  if (
    network.tokens.some(token => token.address.toLowerCase() === inputToken.toLowerCase()) === false ||
    network.tokens.some(token => token.address.toLowerCase() === outputToken.toLowerCase()) === false
  ) {
    throw new Error('The input or output token is no longer configured')
  }
  const input = network.tokens.find(token => token.address.toLowerCase() === inputToken.toLowerCase())!
  const output = network.tokens.find(token => token.address.toLowerCase() === outputToken.toLowerCase())!
  const adapter = getDefiAdapter(configuredProtocol as DefiProtocolConfig)
  if (
    params.displayedQuote.amountIn !== params.amountIn ||
    params.displayedQuote.protocolType !== protocolType(configuredProtocol as DefiProtocolConfig)
  ) {
    throw new Error('The displayed quote does not match this operation')
  }
  if (
    !adapter.supportsNativeAssets &&
    (inputToken === '0x0000000000000000000000000000000000000000' ||
      outputToken === '0x0000000000000000000000000000000000000000')
  ) {
    throw new Error('This route requires ERC-20 input and output tokens')
  }
  const walletChain = await walletProvider.request<string>({ method: 'eth_chainId' })
  if (Number.parseInt(walletChain, 16) !== network.chainId) throw new Error('Switch the wallet to the selected network')
  const chain = {
    id: network.chainId,
    name: network.chainName,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: { default: { http: network.rpcUrls }, public: { http: network.rpcUrls } }
  } as const
  const publicClient = createPublicClient({ chain, transport: custom(walletProvider) })
  const walletClient = createWalletClient({ account, chain, transport: custom(walletProvider) })

  onStatus?.('Unlocking your allocation…')
  const { info, rawSecret } = unlockPrivacyPayrollItem(item, keyPair, account)
  const wd = item.withdrawData!
  if (wd.gravArcAddress?.toLowerCase() !== gravArc.toLowerCase())
    throw new Error('Allocation contract does not match network configuration')
  const nullifierHash = await computeNullifierHash(info.nullifier)
  onStatus?.('Checking the live claim and deposit path…')
  const [[claimed, nextNonce], refunded, path] = await Promise.all([
    publicClient.readContract({
      address: gravArc,
      abi: GRAVARC_ABI,
      functionName: 'nullifierHashes',
      args: [nullifierHash]
    }),
    publicClient.readContract({
      address: gravArc,
      abi: GRAVARC_ABI,
      functionName: 'refundedNullifierHashes',
      args: [nullifierHash]
    }),
    apis.transaction.getDepositMembershipPath(network.caipChainId, info.leafIndex)
  ])
  const { remaining } = privateWithdrawBalance(BigInt(info.amount), claimed, refunded)
  validatePrivateWithdrawAmount(params.amountIn, remaining)
  const membership = await verifyDepositMembershipPath(
    path,
    info.leafIndex,
    info.authRoot,
    info.depositorSecretHash,
    wd.privacyDepositLeaf ?? undefined
  )
  const freshInfo = {
    ...info,
    depositPathElements: membership.pathElements,
    depositPathIndices: membership.pathIndices
  }

  onStatus?.('Refreshing the swap quote…')
  const quoteRequest = {
    chainId: network.chainId,
    family: network.family,
    walletProvider,
    protocol: configuredProtocol as DefiProtocolConfig,
    inputToken,
    outputToken,
    amountIn: params.amountIn,
    inputDecimals: input.decimals,
    outputDecimals: output.decimals,
    slippageBips: params.slippageBips
  } as const
  const freshQuote = await adapter.quote(quoteRequest)
  if (
    freshQuote.amountIn !== params.amountIn ||
    freshQuote.estimatedOutput <= 0n ||
    freshQuote.minimumOutput <= 0n ||
    freshQuote.expiresAt <= Date.now()
  ) {
    throw new Error('Fresh quote is invalid or expired')
  }
  if (
    params.displayedQuote.expiresAt <= Date.now() ||
    params.displayedQuote.routeLabel !== freshQuote.routeLabel ||
    quoteChangeBips(params.displayedQuote.estimatedOutput, freshQuote.estimatedOutput) >= MATERIAL_QUOTE_CHANGE_BIPS ||
    quoteChangeBips(params.displayedQuote.minimumOutput, freshQuote.minimumOutput) >= MATERIAL_QUOTE_CHANGE_BIPS
  ) {
    if (!(await params.confirmQuoteChange(freshQuote))) throw new Error('Operation cancelled after the quote changed')
  }
  let redepositProof: Awaited<ReturnType<typeof generateDepositProof>> | null = null
  let prepared: PreparedRedeposit | null = null
  if (params.redeposit) {
    if (
      !adapter.supportsPrivateRedeposit ||
      params.redeposit.receivers.length < 1 ||
      params.redeposit.receivers.length > 128
    )
      throw new Error('This route cannot re-deposit the selected receivers')
    const total = params.redeposit.receivers.reduce((sum, receiver) => sum + receiver.amount, 0n)
    if (total <= 0n || total > freshQuote.estimatedOutput) throw new Error('Re-deposit total exceeds the fresh quote')
    if (configuredProtocol.outputBehavior === 'fixed' && total !== freshQuote.estimatedOutput) {
      throw new Error('Fixed-output re-deposit allocations must equal the fresh quote')
    }
    onStatus?.('Checking the current deposit insertion path…')
    const [depositPath, nextIndex] = await Promise.all([
      apis.transaction.getDepositPath(network.caipChainId),
      publicClient.readContract({ address: gravArc, abi: GRAVARC_ABI, functionName: 'nextIndex' })
    ])
    if (depositPath.nextIndex !== Number(nextIndex)) throw new Error('Deposit scanner is behind the chain; retry later')
    onStatus?.('Proving the new private deposit…')
    redepositProof = await generateDepositProof(
      params.redeposit.receivers,
      BigInt(outputToken),
      depositPath,
      false,
      null,
      onStatus
    )
  }
  const swapPlan = adapter.buildSwapPlan({
    ...quoteRequest,
    quote: freshQuote,
    pureRouter,
    destination,
    requiredOutput:
      redepositProof && configuredProtocol.outputBehavior === 'variable' ? redepositProof.totalAmount : undefined
  })
  const calls: DefiCall[] = [...swapPlan.calls]
  if (redepositProof) {
    calls.push({
      target: outputToken,
      value: 0n,
      data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [gravArc, redepositProof.totalAmount] })
    })
    const { pA, pB, pC } = redepositProof.proof
    calls.push({
      target: gravArc,
      value: 0n,
      data: encodeFunctionData({
        abi: GRAVARC_ABI,
        functionName: 'deposit',
        args: [
          {
            pA: [BigInt(pA[0]), BigInt(pA[1])],
            pB: [
              [BigInt(pB[0][0]), BigInt(pB[0][1])],
              [BigInt(pB[1][0]), BigInt(pB[1][1])]
            ],
            pC: [BigInt(pC[0]), BigInt(pC[1])],
            newRoot: BigInt(redepositProof.newDepositRoot),
            depositLeaf: BigInt(redepositProof.depositLeaf),
            totalAmount: redepositProof.totalAmount,
            token: outputToken,
            tier: redepositProof.tier
          }
        ]
      })
    })
    if (configuredProtocol.outputBehavior === 'variable') {
      calls.push({
        target: pureRouter,
        value: 0n,
        data: encodeFunctionData({
          abi: PURE_ROUTER_ABI,
          functionName: 'sweepRemaining',
          args: [outputToken, requireContract(params.redeposit!.excessRecipient)]
        })
      })
    }
  } else if (swapPlan.outputLocation === 'pure-router') {
    if (configuredProtocol.outputBehavior === 'variable') {
      calls.push({
        target: pureRouter,
        value: 0n,
        data: encodeFunctionData({
          abi: PURE_ROUTER_ABI,
          functionName: 'sweepRemaining',
          args: [outputToken, destination]
        })
      })
    } else {
      calls.push({
        target: outputToken,
        value: 0n,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [destination, freshQuote.estimatedOutput]
        })
      })
    }
  }
  const commitment = computeDefiCommitment(0n, calls)
  onStatus?.('Generating the private withdrawal proof…')
  const proof = await generateWithdrawProof(
    freshInfo,
    rawSecret,
    commitment,
    params.amountIn,
    claimed,
    nextNonce,
    params.amountIn,
    defiRouter,
    onStatus
  )
  const b = (value: string) => BigInt(value)
  const { pA, pB, pC } = proof.proof
  if (redepositProof) {
    onStatus?.('Saving encrypted receiver delivery before signing…')
    prepared = prepareRedeposit(account, network.caipChainId, redepositProof, params.redeposit!.receivers)
  }
  onStatus?.('Sending the DeFi transaction…')
  let txHash: Hex
  try {
    txHash = await walletClient.writeContract({
      address: defiRouter,
      abi: PACT_PRIVACY_DEFI_ROUTER_ABI,
      functionName: 'defiRouting',
      args: [
        {
          pA: [b(pA[0]), b(pA[1])],
          pB: [
            [b(pB[0][0]), b(pB[0][1])],
            [b(pB[1][0]), b(pB[1][1])]
          ],
          pC: [b(pC[0]), b(pC[1])],
          nullifierHash: proof.nullifierHash,
          recipient: commitment,
          claimedAmount: proof.claimedAmount,
          token: proof.token,
          tier: proof.tier,
          depositRoot: proof.depositRoot,
          expectedAmount: proof.expectedAmount,
          fee: proof.fee,
          relayer: proof.relayer,
          nonce: proof.nonce
        },
        { defiFee: 0n, defiCalls: calls }
      ],
      chain
    })
  } catch (error) {
    if (
      prepared &&
      ((error as { name?: string }).name === 'UserRejectedRequestError' || (error as { code?: number }).code === 4001)
    )
      discardRejectedRedeposit(prepared)
    throw error
  }
  if (prepared) prepared = attachRedepositHash(prepared, txHash)
  onStatus?.('Transaction submitted. Waiting for on-chain confirmation…')
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') throw new Error('DeFi transaction reverted')
  if (!prepared) return { txHash, deliveryPending: false }
  const leafIndex = assertRedepositReceipt(prepared, receipt, gravArc, defiRouter)
  try {
    onStatus?.('Transaction confirmed. Waiting for encrypted delivery…')
    await waitForIndexedDelivery(
      () => deliverRedeposit(prepared, leafIndex),
      () => onStatus?.('Transaction confirmed. Waiting for deposit indexing and encrypted delivery…')
    )
    return { txHash, deliveryPending: false }
  } catch {
    return { txHash, deliveryPending: true }
  }
}
