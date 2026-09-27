import { buildPoseidon } from 'circomlibjs'
import type { DepositProofResult } from './depositProofBrowser'
import { verifyRefundPayloadCommitment } from './refundPayloadCommitment.ts'

/** Proof receiver order. Refundable entries need only a member ID. */
export type ClaimStatusEntry =
  | [memberId: string]
  | [memberId: string, nullifierHash: string]
  | [memberId: string, nullifierHash: string, authLeaf: string]

export type DepositorStatusPayload = {
  version: 2
  batchId: string
  leafIndex: number
  token: string
  tier: number
  authRoot: string
  depositLeaf: string
  depositorSecretHash: string
  entries: ClaimStatusEntry[]
  slots?: { nullifier: string; secretHash: string; withdrawAmount: string }[]
}

const hex = (value: bigint) => `0x${value.toString(16).padStart(64, '0')}`

export async function buildClaimStatusEntries(
  members: readonly { memberId: string; address: string; secretHash: string }[],
  proof: DepositProofResult,
  token: string,
  refundable: boolean,
): Promise<ClaimStatusEntry[]> {
  if (members.length !== proof.receivers.length) throw new Error('Deposit receiver count changed')
  const poseidon = refundable ? null : await buildPoseidon()
  const hash = (values: bigint[]) => poseidon!.F.toObject(poseidon!(values)) as bigint
  return members.map((member, index) => {
    const receiver = proof.receivers[index]
    const slot = proof.refundSlots[index]
    if (!slot || member.address.toLowerCase() !== receiver.address.toLowerCase() ||
      BigInt(slot.withdrawAmount) !== BigInt(receiver.amount) || BigInt(slot.secretHash) !== BigInt(member.secretHash)) {
      throw new Error('Deposit receiver status does not match its proof')
    }
    if (refundable) return [member.memberId]
    const commitment = hash([BigInt(slot.secretHash), BigInt(slot.nullifier)])
    return [member.memberId, hex(hash([BigInt(slot.nullifier)])),
      hex(hash([BigInt(receiver.amount), BigInt(token), commitment]))]
  })
}

export async function createDepositorStatusPayload(
  batchId: string,
  members: readonly { memberId: string; address: string; secretHash: string }[],
  proof: DepositProofResult,
  token: string,
  refundable: boolean,
): Promise<DepositorStatusPayload> {
  return {
    version: 2,
    batchId,
    leafIndex: proof.leafIndex,
    token,
    tier: proof.tier,
    authRoot: proof.authRoot,
    depositLeaf: proof.depositLeaf,
    depositorSecretHash: proof.depositorSecretHash,
    entries: await buildClaimStatusEntries(members, proof, token, refundable),
    ...(refundable ? { slots: proof.refundSlots } : {}),
  }
}

export async function verifyClaimStatusEntries(
  payload: DepositorStatusPayload,
  allocations: readonly { memberId: string; address: string; amount: string }[],
): Promise<void> {
  if (payload.version !== 2 || !Array.isArray(payload.entries) || payload.entries.length !== allocations.length ||
    payload.entries.length < 1 || payload.entries.length > payload.tier || ![8, 16, 32, 64, 128].includes(payload.tier) ||
    (payload.slots !== undefined && (!Array.isArray(payload.slots) || payload.slots.length !== payload.tier))) {
    throw new Error('Depositor claim mapping is unavailable or invalid')
  }
  const poseidon = await buildPoseidon()
  const hash = (values: bigint[]) => poseidon.F.toObject(poseidon(values)) as bigint
  if (hash([BigInt(payload.authRoot), BigInt(payload.depositorSecretHash)]) !== BigInt(payload.depositLeaf)) {
    throw new Error('Depositor claim mapping does not match the deposit')
  }
  const byMember = new Map(allocations.map(allocation => [allocation.memberId, allocation]))
  if (byMember.size !== allocations.length) throw new Error('Duplicate encrypted payroll allocation')
  const seen = new Set<string>()
  const seenHashes = new Set<string>()
  const leaves: bigint[] = []
  for (let entryIndex = 0; entryIndex < payload.entries.length; entryIndex++) {
    const entry = payload.entries[entryIndex]
    if (!Array.isArray(entry) || (payload.slots ? entry.length !== 1 && entry.length !== 2 : entry.length !== 3)) {
      throw new Error('Depositor claim mapping is invalid')
    }
    const [memberId, nullifierHash, authLeaf] = entry
    const allocation = byMember.get(memberId)
    const slot = payload.slots?.[entryIndex]
    const derivedHash = slot ? hex(hash([BigInt(slot.nullifier)])) : nullifierHash
    const normalizedHash = derivedHash?.toLowerCase()
    if (!allocation || seen.has(memberId) ||
      !/^0x[0-9a-fA-F]{64}$/.test(derivedHash ?? '') || seenHashes.has(normalizedHash ?? '') ||
      !/^\d+$/.test(allocation.amount) || BigInt(allocation.amount) <= 0n) {
      throw new Error('Depositor claim mapping does not match the encrypted plan')
    }
    seen.add(memberId)
    seenHashes.add(normalizedHash!)
    if (payload.slots) {
      const refundSlot = payload.slots[entryIndex]
      if ((nullifierHash && BigInt(nullifierHash) !== BigInt(derivedHash!)) ||
        BigInt(refundSlot.withdrawAmount) !== BigInt(allocation.amount)) {
        throw new Error('Depositor claim mapping does not match refund slots')
      }
    } else {
      if (!authLeaf || !/^0x[0-9a-fA-F]{64}$/.test(authLeaf)) throw new Error('Invalid depositor claim leaf')
      leaves.push(BigInt(authLeaf))
    }
  }
  if (payload.slots) await verifyRefundPayloadCommitment({ ...payload, slots: payload.slots })
  else {
    const paddedLeaf = hash([0n, BigInt(payload.token), 0n])
    while (leaves.length < payload.tier) leaves.push(paddedLeaf)
    let layer = leaves
    while (layer.length > 1) {
      const next: bigint[] = []
      for (let index = 0; index < layer.length; index += 2) next.push(hash([layer[index], layer[index + 1]]))
      layer = next
    }
    if (layer[0] !== BigInt(payload.authRoot)) throw new Error('Depositor claim leaves do not match the deposit')
  }
}
