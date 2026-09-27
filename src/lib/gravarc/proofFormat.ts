export type ContractProof = {
  pA: [string, string]
  pB: [[string, string], [string, string]]
  pC: [string, string]
}

/** snarkjs G2 coordinates are reversed for the Solidity verifier ABI. */
export function toContractProof(proof: {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
}): ContractProof {
  if (proof.pi_a.length < 2 || proof.pi_b.length < 2 ||
    proof.pi_b[0].length < 2 || proof.pi_b[1].length < 2 || proof.pi_c.length < 2) {
    throw new Error('Incomplete Groth16 proof')
  }
  return {
    pA: [proof.pi_a[0], proof.pi_a[1]],
    pB: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
    pC: [proof.pi_c[0], proof.pi_c[1]],
  }
}
