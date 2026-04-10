/**
 * Build a block explorer URL for a transaction hash.
 * Returns null if either explorerUrl or txHash is missing.
 */
export function buildExplorerTransactionUrl(
  explorerUrl: string | null | undefined,
  txHash: string | null | undefined
): string | null {
  const explorerBaseUrl = explorerUrl?.trim()
  if (!explorerBaseUrl || !txHash) return null
  return `${explorerBaseUrl.replace(/\/+$/, '')}/tx/${encodeURIComponent(txHash)}`
}

/**
 * Shorten a transaction hash for display: "0x1234...abcd"
 */
export function formatTransactionHash(txHash: string | null | undefined, full = false): string {
  if (!txHash) return '-'
  if (full || txHash.length <= 12) return txHash
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
}
