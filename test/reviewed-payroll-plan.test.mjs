import assert from 'node:assert/strict'
import { reviewedPayrollPlanIsCurrent } from '../src/lib/gravarc/reviewedPayrollPlan.ts'

const allocations = [
  { memberId: 'member-1', address: `0x${'11'.repeat(20)}`, amount: 1n },
  { memberId: 'member-2', address: `0x${'22'.repeat(20)}`, amount: 2n },
]
const members = allocations.map(({ memberId, address }) => ({ memberId, address }))

assert.equal(reviewedPayrollPlanIsCurrent('encrypted', 'encrypted', allocations, members), true)
assert.equal(reviewedPayrollPlanIsCurrent('encrypted', 'changed', allocations, members), false)
assert.equal(reviewedPayrollPlanIsCurrent('encrypted', null, allocations, members), false)
assert.equal(reviewedPayrollPlanIsCurrent('encrypted', 'encrypted', allocations, members.slice(0, 1)), false)
assert.equal(reviewedPayrollPlanIsCurrent('encrypted', 'encrypted', allocations, [
  members[0], { ...members[1], address: `0x${'33'.repeat(20)}` },
]), false)
assert.equal(reviewedPayrollPlanIsCurrent('encrypted', 'encrypted', allocations, [members[0], members[0]]), false)
