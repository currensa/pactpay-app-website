'use client'

import type { buildPoseidon as BuildPoseidon } from 'circomlibjs'

// Lazily-built Poseidon instance — same parameters as the ZK circuits (BN254, circomlibjs).
type PoseidonFn = Awaited<ReturnType<typeof BuildPoseidon>>
let _poseidon: PoseidonFn | null = null

async function getPoseidon(): Promise<PoseidonFn> {
  if (_poseidon) return _poseidon
  const { buildPoseidon } = await import('circomlibjs')
  _poseidon = await buildPoseidon()
  return _poseidon
}

export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const p = await getPoseidon()
  return p.F.toObject(p(inputs))
}

const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

/** Deterministically maps an arbitrary string to a BN254 field element via SHA-256. */
export async function secretStringToField(secret: string): Promise<bigint> {
  const bytes = new TextEncoder().encode(secret)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  let n = 0n
  for (const byte of new Uint8Array(buf)) n = (n << 8n) | BigInt(byte)
  return n % BN254_PRIME
}
