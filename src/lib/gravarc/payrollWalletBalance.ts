export async function readPayrollWalletBalance(
  token: { isNative: boolean; contractAddress: string | null },
  address: string,
  readNative: (address: string) => Promise<bigint>,
  readToken: (tokenAddress: string, address: string) => Promise<bigint>,
): Promise<bigint> {
  if (token.isNative) return readNative(address)
  if (!token.contractAddress) throw new Error('Selected ERC-20 has no contract address')
  return readToken(token.contractAddress, address)
}
