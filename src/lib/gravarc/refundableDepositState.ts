import apis from '@/apis'
import type { TransactionPlan } from '@/apis/transaction.api'
import { GRAVARC_ABI } from './gravarcAbi'
import { verifyDepositMembershipPath } from './depositMembershipPath'
import { isFullyRefunded, privateDepositBalances, sameDepositLeaf } from './privateDepositBalances'
import { loadDepositorRefundPayload } from './refundPrivacyDeposit'
import { computeNullifierHash } from './withdrawProofBrowser'
import { pacedRpcRead } from './pacedRpcRead'
import useChainAssetStore from '@/stores/chain-asset'
import { createPublicClient, http, type Hex } from 'viem'
import type { BoxKeyPair } from 'tweetnacl'

export async function readRefundableDepositState(plan: TransactionPlan, keyPair: BoxKeyPair, address: string) {
  if (plan.transactionType !== 'privacy_deposit' || !plan.privacyRefundable ||
    plan.createdBy !== localStorage.getItem('userId') || !plan.depositTxHash ||
    plan.privacyLeafIndex == null || !plan.privacyDepositLeaf || plan.privacyTier == null) {
    throw new Error('Confirmed refundable deposit is unavailable')
  }
  const profile = await apis.auth.getMyGravArcUserInfo()
  if (!profile || profile.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Connect the deposit creator’s bound wallet')
  }
  const payload = await loadDepositorRefundPayload(plan.id, keyPair)
  if (payload.leafIndex !== plan.privacyLeafIndex || payload.tier !== plan.privacyTier ||
    !sameDepositLeaf(payload.depositLeaf, plan.privacyDepositLeaf) ||
    payload.token.toLowerCase() !== plan.tokenAddress?.toLowerCase()) {
    throw new Error('Depositor recovery data does not match this deposit')
  }
  const path = await apis.transaction.getDepositMembershipPath(plan.caipChainId, payload.leafIndex)
  await verifyDepositMembershipPath(path, payload.leafIndex, payload.authRoot, payload.depositorSecretHash, payload.depositLeaf)
  const store = useChainAssetStore.getState()
  const network = store.getNetwork(plan.caipChainId) ?? (await store.fetchNetworks()).find(item => item.caipChainId === plan.caipChainId)
  if (!network?.rpcUrls[0] || !network.contracts.gravArc) throw new Error('Deposit network is unavailable')
  const client = createPublicClient({ transport: http(network.rpcUrls[0]) })
  const states: Array<{ claimed: bigint; refunded: boolean }> = []
  for (const slot of payload.slots) {
    const hash = await computeNullifierHash(slot.nullifier)
    const claimed = BigInt(slot.withdrawAmount) === 0n ? 0n :
      (await pacedRpcRead(plan.caipChainId, () => client.readContract({
        address: network.contracts.gravArc as Hex, abi: GRAVARC_ABI,
        functionName: 'nullifierHashes', args: [hash],
      })))[0]
    const refunded = await pacedRpcRead(plan.caipChainId, () => client.readContract({
      address: network.contracts.gravArc as Hex, abi: GRAVARC_ABI,
      functionName: 'refundedNullifierHashes', args: [hash],
    }))
    states.push({ claimed, refunded })
  }
  privateDepositBalances(payload.slots, states)
  return { payload, states, fullyRefunded: isFullyRefunded(payload.tier, states) }
}
