export function privateDepositBalances(
  slots: readonly { withdrawAmount: string }[],
  states: readonly { claimed: bigint; refunded: boolean }[],
) {
  if (slots.length !== states.length) throw new Error('Incomplete on-chain deposit state')
  let total = 0n
  let claimed = 0n
  let remaining = 0n
  let refunded = 0n
  for (let index = 0; index < slots.length; index++) {
    const amount = BigInt(slots[index].withdrawAmount)
    const state = states[index]
    if (amount < 0n || state.claimed < 0n || state.claimed > amount) {
      throw new Error('Invalid on-chain deposit state')
    }
    total += amount
    claimed += state.claimed
    if (state.refunded) refunded += amount - state.claimed
    else remaining += amount - state.claimed
  }
  return { total, claimed, remaining, refunded }
}

export function sameDepositLeaf(left: string, right: string): boolean {
  try { return BigInt(left) === BigInt(right) }
  catch { return false }
}

export function isFullyRefunded(slotCount: number, states: readonly { refunded: boolean }[]): boolean {
  return slotCount > 0 && states.length === slotCount && states.every(state => state.refunded)
}
