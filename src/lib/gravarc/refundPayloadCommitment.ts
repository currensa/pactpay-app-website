import { buildPoseidon } from 'circomlibjs'

export async function verifyRefundPayloadCommitment(payload: {
  token: string
  tier: number
  authRoot: string
  depositorSecretHash: string
  depositLeaf: string
  slots: readonly { nullifier: string; secretHash: string; withdrawAmount: string }[]
}): Promise<void> {
  if (![8, 16, 32, 64, 128].includes(payload.tier) || payload.slots.length !== payload.tier) {
    throw new Error('Invalid depositor recovery slots')
  }
  const poseidon = await buildPoseidon()
  const hash = (values: bigint[]) => poseidon.F.toObject(poseidon(values)) as bigint
  let layer = payload.slots.map(slot => {
    const commitment = hash([BigInt(slot.secretHash), BigInt(slot.nullifier)])
    return hash([BigInt(slot.withdrawAmount), BigInt(payload.token), commitment])
  })
  while (layer.length > 1) {
    const next: bigint[] = []
    for (let index = 0; index < layer.length; index += 2) next.push(hash([layer[index], layer[index + 1]]))
    layer = next
  }
  if (layer[0] !== BigInt(payload.authRoot) ||
    hash([layer[0], BigInt(payload.depositorSecretHash)]) !== BigInt(payload.depositLeaf)) {
    throw new Error('Depositor recovery slots do not match the deposit commitment')
  }
}
