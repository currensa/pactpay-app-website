type Member = { memberId: string; address: string }
type Allocation = Member & { amount: bigint }

export function reviewedPayrollPlanIsCurrent(
  reviewedCiphertext: string | null,
  currentCiphertext: string | null,
  allocations: Allocation[] | null,
  members: Member[],
): boolean {
  if (!reviewedCiphertext || reviewedCiphertext !== currentCiphertext ||
    !allocations || allocations.length !== members.length) return false

  const byId = new Map(members.map(member => [member.memberId, member.address.toLowerCase()]))
  return byId.size === members.length && allocations.every(allocation =>
    byId.get(allocation.memberId) === allocation.address.toLowerCase())
}
