// One browser tab may check several deposits at once. Pace reads per chain so
// public testnet RPCs are not flooded by a tier's nullifier checks.
const nextReadAt = new Map<string, number>()
const READ_SPACING_MS = 125 // At most eight reads/second from this tab and chain.

export async function pacedRpcRead<T>(caipChainId: string, read: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const start = Math.max(now, nextReadAt.get(caipChainId) ?? now)
  nextReadAt.set(caipChainId, start + READ_SPACING_MS)
  if (start > now) await new Promise(resolve => setTimeout(resolve, start - now))
  return read()
}
