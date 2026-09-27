export function privateWithdrawBalance(total: bigint, claimed: bigint, refunded: boolean) {
  if (total <= 0n || claimed < 0n || claimed > total) throw new Error('Invalid on-chain withdrawal state')
  return { total, claimed, remaining: refunded ? 0n : total - claimed, refunded }
}

export function validatePrivateWithdrawAmount(amount: bigint, remaining: bigint): void {
  if (amount <= 0n || amount > remaining) {
    throw new Error('Withdrawal amount must be positive and no more than the live remainder')
  }
}
