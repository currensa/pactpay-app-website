import type { DefiAllocation, PrivacyPayrollItem } from '@/apis/transaction.api'
import type { NetworkConfigResponse } from '@/apis/chain-asset.api'
import { PayrollItemStatus, PayrollTransactionStatus } from '@/enums/transaction'

/** Re-use the existing client-only allocation proof/claim flow without inventing a payroll row. */
export function defiAllocationItem(allocation: DefiAllocation, network: NetworkConfigResponse): PrivacyPayrollItem {
  const id = `defi:${allocation.caipChainId}:${allocation.leafIndex}`
  return {
    id,
    batchId: id,
    memberId: '',
    amount: '0',
    tokenAddress: allocation.token,
    recipient: allocation.recipient,
    fee: null,
    status: PayrollItemStatus.CLAIMABLE,
    txHash: null,
    createdAt: '',
    updatedAt: '',
    organizationName: null,
    transactionName: `DeFi re-deposit #${allocation.leafIndex}`,
    transactionType: 'privacy_deposit',
    source: 'defi',
    withdrawData: {
      caipChainId: allocation.caipChainId,
      gravArcAddress: network.contracts.gravArc,
      leafIndex: allocation.leafIndex,
      tier: allocation.tier,
      privacyDepositLeaf: allocation.depositLeaf,
      content: allocation.content,
      encryptedSecret: allocation.encryptedSecret,
      secretHash: null
    },
    batch: {
      id,
      caipChainId: allocation.caipChainId,
      tokenAddress: allocation.token,
      transactionStatus: PayrollTransactionStatus.COMPLETE,
      depositTxHash: null,
      payPeriod: ''
    }
  }
}
