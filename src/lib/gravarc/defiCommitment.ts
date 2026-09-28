import { keccak256, encodeAbiParameters, concat } from 'viem'

export type DefiCall = {
  target: `0x${string}`
  value: bigint
  data: `0x${string}`
}

/** Replicates the on-chain commitment formula in PactPrivacyDefiRouter.defiRouting:
 *  commitment = address(uint160(uint256(keccak256(abi.encodePacked(defiFee, callsHash)))))
 *  where callsHash = keccak256(abi.encodePacked(hashes))
 *  and each hash = keccak256(abi.encode(c.target, c.value, c.data))
 */
export function computeDefiCommitment(defiFee: bigint, calls: DefiCall[]): `0x${string}` {
  const callHashes = calls.map(c =>
    keccak256(
      encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }, { type: 'bytes' }], [c.target, c.value, c.data])
    )
  )
  const callsHash =
    calls.length > 0
      ? keccak256(concat(callHashes))
      : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`)

  const commitment = keccak256(encodeAbiParameters([{ type: 'uint256' }, { type: 'bytes32' }], [defiFee, callsHash]))
  // Take last 20 bytes → address
  return `0x${commitment.slice(-40)}` as `0x${string}`
}
