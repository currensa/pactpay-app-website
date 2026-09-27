export function payoutIntentMatchesToken(
  intent: { caipChainId: string; token: string } | null | undefined,
  caipChainId: string,
  tokenAddress: string,
): boolean {
  return !!intent && intent.caipChainId === caipChainId &&
    intent.token.toLowerCase() === tokenAddress.toLowerCase()
}
