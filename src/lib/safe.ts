// Simplified Safe Integration (avoiding dependency issues)
import { BrowserProvider, Contract } from 'ethers';
import { TokenBalance } from '../types';

// Safe Transaction Service URLs
const SAFE_SERVICE_URLS: Record<number, string> = {
  1: 'https://safe-transaction-mainnet.safe.global',
  5: 'https://safe-transaction-goerli.safe.global',
  11155111: 'https://safe-transaction-sepolia.safe.global',
  137: 'https://safe-transaction-polygon.safe.global',
};

// Minimal Safe ABI for reading info
const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
];

export function getSafeServiceUrl(chainId: number): string {
  const url = SAFE_SERVICE_URLS[chainId];
  if (!url) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return url;
}

export async function getSafeInfo(
  safeAddress: string,
  chainId: number,
  provider: BrowserProvider
) {
  try {
    const safeContract = new Contract(safeAddress, SAFE_ABI, provider);
    
    const [owners, threshold, nonce] = await Promise.all([
      safeContract.getOwners(),
      safeContract.getThreshold(),
      safeContract.nonce(),
    ]);

    return {
      address: safeAddress,
      chainId,
      owners: owners as string[],
      threshold: Number(threshold),
      nonce: Number(nonce),
    };
  } catch (error) {
    console.error('Error getting Safe info:', error);
    throw new Error('Failed to get Safe information. Please check the address and network.');
  }
}

export async function verifyOwner(
  safeAddress: string,
  ownerAddress: string,
  chainId: number,
  provider: BrowserProvider
): Promise<boolean> {
  try {
    const info = await getSafeInfo(safeAddress, chainId, provider);
    return info.owners.some(
      (owner) => owner.toLowerCase() === ownerAddress.toLowerCase()
    );
  } catch (error) {
    return false;
  }
}

export async function getSafeBalances(
  safeAddress: string,
  chainId: number,
  provider: BrowserProvider
): Promise<TokenBalance[]> {
  try {
    // Get ETH balance
    const balance = await provider.getBalance(safeAddress);
    
    // For demo purposes, return ETH balance
    // In production, you'd query the Safe Transaction Service API or use multicall
    return [
      {
        tokenAddress: '0x0000000000000000000000000000000000000000',
        tokenSymbol: chainId === 1 ? 'ETH' : chainId === 11155111 ? 'SepoliaETH' : 'ETH',
        tokenName: chainId === 1 ? 'Ethereum' : chainId === 11155111 ? 'Sepolia Ether' : 'Ethereum',
        decimals: 18,
        balance: balance.toString(),
      },
    ];
  } catch (error) {
    console.error('Error getting Safe balances:', error);
    return [];
  }
}

export async function proposeTransaction(
  safeAddress: string,
  transactions: Array<{ to: string; value: string; data: string }>,
  chainId: number,
  provider: BrowserProvider
): Promise<{ safeTxHash: string; safeAppUrl: string }> {
  try {
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    
    // For demo purposes, generate a mock transaction hash
    // In production, you would use Safe SDK to properly create and propose the transaction
    const safeTxHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
    
    // Generate Safe App URL
    const safeAppUrl = `https://app.safe.global/transactions/queue?safe=${getChainPrefix(chainId)}:${safeAddress}`;

    console.log('Demo mode: Transaction would be proposed to Safe with:', {
      safeAddress,
      transactions,
      chainId,
      signerAddress,
    });

    return { safeTxHash, safeAppUrl };
  } catch (error) {
    console.error('Error proposing transaction:', error);
    throw new Error('Failed to propose transaction to Safe');
  }
}

export async function getTransactionStatus(
  safeAddress: string,
  safeTxHash: string,
  chainId: number
): Promise<{
  status: string;
  confirmations: number;
  confirmationsRequired: number;
  signatures: Array<{ owner: string; signature: string; submissionDate: string }>;
  ethereumTxHash?: string;
}> {
  try {
    // For demo purposes, return mock status
    // In production, query the Safe Transaction Service API
    return {
      status: 'AWAITING_SIGNATURES',
      confirmations: 1,
      confirmationsRequired: 2,
      signatures: [
        {
          owner: '0x0000000000000000000000000000000000000000',
          signature: '0x',
          submissionDate: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw new Error('Failed to get transaction status');
  }
}

export async function getPendingTransactions(
  safeAddress: string,
  chainId: number
): Promise<any[]> {
  try {
    // For demo purposes, return empty array
    // In production, query the Safe Transaction Service API
    return [];
  } catch (error) {
    console.error('Error getting pending transactions:', error);
    return [];
  }
}

function getChainPrefix(chainId: number): string {
  const prefixes: Record<number, string> = {
    1: 'eth',
    5: 'gor',
    11155111: 'sep',
    137: 'matic',
  };
  return prefixes[chainId] || `chain-${chainId}`;
}

// Helper to encode multi-send transaction
export function encodeMultiSendData(
  transactions: Array<{ to: string; value: string; data: string }>
): string {
  return JSON.stringify(transactions);
}
