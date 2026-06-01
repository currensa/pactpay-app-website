import type { Hex } from 'viem'

export function normalizeTransactionHash(tx: unknown): Hex {
  if (typeof tx === 'string' && tx.startsWith('0x')) return tx as Hex

  if (tx && typeof tx === 'object') {
    const hash = Reflect.get(tx, 'hash')
    if (typeof hash === 'string' && hash.startsWith('0x')) return hash as Hex
  }

  throw new Error(`Unsupported transaction hash payload: ${String(tx)}`)
}
