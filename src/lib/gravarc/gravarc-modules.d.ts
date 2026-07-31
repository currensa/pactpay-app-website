declare module 'snarkjs' {
  export const groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasm: string | Uint8Array,
      zkey: string | { type: 'mem'; data: Uint8Array },
    ): Promise<{ proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] }; publicSignals: string[] }>
    verify(vKey: unknown, publicSignals: string[], proof: unknown): Promise<boolean>
  }
}

declare module 'circomlibjs' {
  export interface Poseidon {
    (inputs: Array<bigint | number | string>): { toString(): string }
    F: {
      toObject(e: unknown): bigint
      e: bigint
    }
  }
  export function buildPoseidon(): Promise<Poseidon>
}
