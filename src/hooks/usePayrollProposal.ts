// Hook for payroll proposal process
import { apiClient } from '@/lib/api-client';
import Safe from '@safe-global/protocol-kit';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount, useWalletClient } from 'wagmi';

export function usePayrollProposal() {
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isProposing, setIsProposing] = useState(false);

  const proposePayroll = async (payrollId: string): Promise<{
    id: string;
    status: string;
    transaction: {
      safeTxHash: string;
      nonce: number;
      confirmations: number;
      confirmationsRequired: number;
      safeAppUrl: string;
    };
  }> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available. Please reconnect your wallet.');
    }

    setIsProposing(true);

    try {
      // Step 1: Backend returns draft info and raw transaction data
      console.log('📋 Step 1: Getting draft info and raw transaction data for payroll:', payrollId);
      toast.loading('Getting draft information...', { id: 'propose' });

      const draftInfo = await apiClient.getPayrollTransactionData(payrollId);

      // Debug: Log the full response to help troubleshoot
      console.log('🔍 Full API response:', draftInfo);

      console.log('✅ Draft info retrieved:', {
        safeAddress: draftInfo.safeAddress,
        chainId: draftInfo.chainId,
        nonce: draftInfo.nonce,
        threshold: draftInfo.threshold,
        rawTransactionsCount: draftInfo.rawTransactions.length,
      });

      // Check if wallet is connected to the correct network
      if (chain && chain.id !== draftInfo.chainId) {
        throw new Error(
          `Network mismatch! Your wallet is connected to ${chain.name} (Chain ID: ${chain.id}), ` +
          `but the Safe wallet is deployed on Chain ID: ${draftInfo.chainId}. ` +
          `Please switch your wallet to the correct network.`
        );
      }

      // Step 2: Use Safe SDK to create transaction and get hash
      console.log('🔧 Step 2: Creating Safe transaction with SDK...');
      toast.loading('Creating Safe transaction...', { id: 'propose' });

      // Debug: Log the full response to understand the structure
      console.log('🔍 Full draftInfo response:', draftInfo);
      console.log('🔍 rawTransactions:', draftInfo.rawTransactions);

      // Check if rawTransactions exists and has required fields
      if (!draftInfo.rawTransactions || draftInfo.rawTransactions.length === 0) {
        throw new Error('Invalid transaction data received from backend');
      }

      // Use rawTransactions directly (already in array format)
      const transactions = draftInfo.rawTransactions.map(tx => ({
        to: tx.to,
        value: tx.value,
        data: tx.data,
      }));

      // Get provider from connected wallet (RainbowKit best practice)
      if (!walletClient) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Use walletClient.transport as provider for Safe SDK
      const provider = walletClient.transport;
      if (!provider) {
        throw new Error('No wallet provider available');
      }

      // Get signer address for Safe SDK initialization
      const signerAddresses = await walletClient.getAddresses();
      if (signerAddresses.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }
      const signerAddress = signerAddresses[0];

      // Validate signer address format
      if (!signerAddress || !signerAddress.startsWith('0x') || signerAddress.length !== 42) {
        throw new Error('Invalid signer address format');
      }

      // Initialize Safe SDK with wallet provider and signer
      const safe = await Safe.init({
        provider: provider as any, // Type assertion for compatibility
        signer: signerAddress, // Use signer address instead of private key
        safeAddress: draftInfo.safeAddress
      });

      // Create Safe transaction using the new API format
      const safeTransaction = await safe.createTransaction({
        transactions: transactions,
      });

      console.log('safeTransaction', safeTransaction);

      // Get transaction hash
      const safeTxHash = await safe.getTransactionHash(safeTransaction);

      console.log('safeTxHash', safeTxHash);

      // Step 3: User signs the safeTxHash with their wallet using Safe SDK
      console.log('🔐 Step 3: Requesting user signature...');
      toast.loading('Please sign the transaction in your wallet...', { id: 'propose' });

      // Use Safe SDK's signHash method for proper signature format
      const signature = await safe.signHash(safeTxHash);

      console.log('✅ User signed transaction:', {
        signerAddress,
        signature: signature.data.slice(0, 10) + '...',
      });

      // Debug: Log the complete safeTransactionData structure
      console.log('🔍 Complete safeTransactionData:', safeTransaction.data);

      // Step 5: Backend verifies signature and proposes to Safe Transaction Service
      console.log('📤 Step 5: Submitting signature to backend...');
      toast.loading('Submitting signature and proposing transaction...', { id: 'propose' });

      const result = await apiClient.submitPayrollSignature(payrollId, {
        safeTxHash,
        signature: signature.data, // Extract signature data from SafeSignature object
        signerAddress,
        safeTransactionData: safeTransaction.data
      });

      console.log('✅ Transaction proposed successfully:', {
        payrollId: result.id,
        status: result.status,
        confirmations: result.transaction.confirmations,
        confirmationsRequired: result.transaction.confirmationsRequired,
      });

      toast.success('Transaction proposed successfully!', { id: 'propose' });

      return result;
    } catch (error: any) {
      console.error('❌ Failed to propose payroll:', error);

      // Provide user-friendly error messages
      if (error.message?.includes('User rejected')) {
        toast.error('You rejected the signature request', { id: 'propose' });
        throw new Error('You rejected the signature request');
      } else if (error.message?.includes('Network mismatch')) {
        toast.error(error.message, { id: 'propose' });
        throw error;
      } else if (error.message?.includes('not a Safe owner')) {
        toast.error('You are not authorized to propose this transaction', { id: 'propose' });
        throw new Error('You are not a Safe owner');
      } else if (error.message?.includes('Invalid signature')) {
        toast.error('Invalid signature. Please try again.', { id: 'propose' });
        throw new Error('Invalid signature');
      } else {
        const errorMsg = error.message || 'Failed to propose transaction';
        toast.error(errorMsg, { id: 'propose' });
        throw new Error(errorMsg);
      }
    } finally {
      setIsProposing(false);
    }
  };

  return {
    proposePayroll,
    isProposing,
  };
}


