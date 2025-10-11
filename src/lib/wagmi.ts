// Wagmi and RainbowKit Configuration
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import type { Account, Chain, Client, Transport } from 'viem';
import { http } from 'wagmi';
import { mainnet, polygon, sepolia } from 'wagmi/chains';

// Configure Wagmi and RainbowKit
export const config = getDefaultConfig({
  appName: 'Safe Payroll',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia, polygon],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
  },
  ssr: false,
});

// Convert Wagmi WalletClient to ethers Signer
export function walletClientToSigner(walletClient: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

