// Hook for Safe SDK operations
import Safe from '@safe-global/protocol-kit';
import SafeTransaction from 'node_modules/@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction';
import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';

export function useSafeSDK() {
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isProposing, setIsProposing] = useState(false);

  const createAndProposeTransaction = async (transactionData: {
    safeAddress: string;
    chainId: number;
    rawTransactions: Array<{
      to: string;
      value: string;
      data: string;
    }>;
  }): Promise<{
    safeTransaction: SafeTransaction['data'];
    safeTxHash: string;
    signature: string;
  }> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available. Please reconnect your wallet.');
    }

    if (!window.ethereum) {
      throw new Error('No Ethereum provider found. Please install a Web3 wallet.');
    }

    // Check if wallet is connected to the correct network
    if (chain && chain.id !== transactionData.chainId) {
      throw new Error(
        `Network mismatch! Your wallet is connected to ${chain.name} (Chain ID: ${chain.id}), ` +
        `but the Safe wallet is deployed on Chain ID: ${transactionData.chainId}. ` +
        `Please switch your wallet to the correct network.`
      );
    }

    setIsProposing(true);

    try {
      // Use the connected wallet address
      const signerAddress = address;

      console.log('Initializing Safe SDK with:', {
        safeAddress: transactionData.safeAddress,
        signerAddress,
        chainId: transactionData.chainId,
        currentChain: chain?.name,
        currentChainId: chain?.id,
      });

      const currentChainId = chain?.id;

      if (!currentChainId) {
        throw new Error('Unable to detect current network. Please ensure your wallet is connected.');
      }

      // Verify network matches
      if (currentChainId !== transactionData.chainId) {
        const chainNames: Record<number, string> = {
          1: 'Ethereum Mainnet',
          11155111: 'Sepolia Testnet',
          137: 'Polygon',
          100: 'Gnosis Chain',
        };

        throw new Error(
          `Network mismatch!\n\n` +
          `Your wallet is connected to: ${chain.name} (Chain ID: ${currentChainId})\n` +
          `But this Safe requires: ${chainNames[transactionData.chainId] || 'Unknown'} (Chain ID: ${transactionData.chainId})\n\n` +
          `Please switch your wallet to the correct network and try again.`
        );
      }

      console.log('✅ Network verification passed');
      console.log('Attempting to initialize Safe Protocol Kit...');

      // Use the transport from walletClient as the provider
      // This is more reliable than window.ethereum and integrates better with Wagmi
      const provider = walletClient.transport;

      // Initialize Safe Protocol Kit with Wagmi's transport as provider
      // The transport acts as an EIP-1193 compatible provider
      const protocolKit = await Safe.init({
        provider: provider,
        signer: signerAddress,
        safeAddress: transactionData.safeAddress,
      });
      console.log('✅ Safe Protocol Kit initialized successfully');

      // Verify Safe information
      const safeInfo = await protocolKit.getAddress();
      const owners = await protocolKit.getOwners();
      const threshold = await protocolKit.getThreshold();

      console.log('Safe Information:', {
        address: safeInfo,
        owners,
        threshold,
        currentSigner: signerAddress,
        isOwner: owners.includes(signerAddress),
      });

      // Check if current user is an owner
      if (!owners.includes(signerAddress)) {
        throw new Error(
          `You are not an owner of this Safe wallet!\n\n` +
          `Safe address: ${transactionData.safeAddress}\n` +
          `Your address: ${signerAddress}\n` +
          `Safe owners: ${owners.join(', ')}\n\n` +
          `Only Safe owners can create transactions.`
        );
      }
      // Create Safe transaction
      console.log('Creating Safe transaction');
      const safeTransaction = await protocolKit.createTransaction({
        transactions: transactionData.rawTransactions,
      });

      // Get transaction hash
      console.log('Getting transaction hash');
      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);

      // Sign transaction
      console.log('Signing transaction');
      const senderSignature = await protocolKit.signHash(safeTxHash);

      console.log('Sender signature:', senderSignature.data);


      return {
        safeTxHash,
        safeTransaction: safeTransaction.data,
        signature: senderSignature.data,
      };
    } catch (error: any) {
      console.error('Failed to propose transaction:', error);

      // Provide more specific error messages
      if (error.message?.includes('SafeProxy contract is not deployed')) {
        throw new Error(
          `Safe wallet not found on this network! ` +
          `Please ensure:\n` +
          `1. The Safe address (${transactionData.safeAddress}) is correct\n` +
          `2. Your wallet is connected to the correct network (Chain ID: ${transactionData.chainId})\n` +
          `3. The Safe wallet exists on this network`
        );
      } else if (error.message?.includes('Network mismatch')) {
        throw error; // Re-throw our custom network error
      } else if (error.message?.includes('not an owner')) {
        throw new Error(
          `You are not an owner of this Safe wallet. ` +
          `Only Safe owners can propose transactions.`
        );
      }

      throw new Error(error.message || 'Failed to propose transaction to Safe');
    } finally {
      setIsProposing(false);
    }
  };

  return {
    createAndProposeTransaction,
    isProposing,
  };
}


