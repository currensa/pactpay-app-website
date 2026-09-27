export function depositAction(
  plan: { transactionStatus: string; depositTxHash: string | null },
  prepared: { txHash?: string } | null,
  confirmedLocally: boolean,
): 'execute' | 'recover' | 'pending' | 'disabled' {
  if (plan.transactionStatus === 'refunded' || plan.transactionStatus === 'complete' || plan.depositTxHash) return 'disabled'
  if (prepared?.txHash || confirmedLocally) return 'pending'
  if (prepared) return 'recover'
  if (plan.transactionStatus === 'ready' && !plan.depositTxHash && !confirmedLocally) return 'execute'
  return 'disabled'
}
