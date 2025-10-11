// Hook for payroll proposal process
import { apiClient } from '@/lib/api-client';
import Safe from '@safe-global/protocol-kit';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

export function usePayrollProposal() {
  const { isConnected, address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
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
      // Step 1: Backend creates Safe transaction and returns safeTxHash
      console.log('📋 Step 1: Creating Safe transaction on backend for payroll:', payrollId);
      toast.loading('Creating Safe transaction...', { id: 'propose' });

      const txData = await apiClient.createPayrollTransaction(payrollId);

      // Debug: Log the full response to help troubleshoot
      console.log('🔍 Full API response:', txData);

      console.log('✅ Safe transaction created:', {
        safeTxHash: txData.safeTxHash,
        safeAddress: txData.safeAddress,
        chainId: txData.chainId,
        nonce: txData.nonce,
        threshold: txData.threshold,
      });

      // Check if wallet is connected to the correct network
      if (chain && chain.id !== txData.chainId) {
        throw new Error(
          `Network mismatch! Your wallet is connected to ${chain.name} (Chain ID: ${chain.id}), ` +
          `but the Safe wallet is deployed on Chain ID: ${txData.chainId}. ` +
          `Please switch your wallet to the correct network.`
        );
      }

      // Step 2: User signs the safeTxHash with their wallet
      console.log('🔐 Step 2: Requesting user signature...');
      toast.loading('Please sign the transaction in your wallet...', { id: 'propose' });

      // Use RainbowKit's walletClient instead of window.ethereum
      if (!walletClient) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Get signer from walletClient
      const signer = await walletClient.getAddresses();
      if (signer.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const signerAddress = signer[0];

      // Sign the safeTxHash using walletClient
      const signature = await walletClient.signMessage({
        message: { raw: txData.safeTxHash as `0x${string}` },
        account: signerAddress,
      });

      console.log('✅ User signed transaction:', {
        signerAddress,
        signature: signature.slice(0, 10) + '...',
      });

      // Step 3: Create Safe transaction using Safe SDK (as per design.md)
      console.log('🔧 Step 3: Creating Safe transaction with SDK...');
      toast.loading('Creating Safe transaction...', { id: 'propose' });

      // Debug: Log the full response to understand the structure
      console.log('🔍 Full txData response:', txData);
      console.log('🔍 transactionData:', txData.transactionData);

      // Check if transactionData exists and has required fields
      if (!txData.transactionData || !txData.transactionData.transactions) {
        throw new Error('Invalid transaction data received from backend');
      }

      // Get provider from wagmi publicClient (as per design.md)
      const provider = publicClient?.transport?.value || publicClient;
      if (!provider) {
        throw new Error('No provider available');
      }

      // Initialize Safe SDK
      const safe = await Safe.init({
        provider,
        safeAddress: txData.safeAddress
      });

      // Create Safe transaction
      const safeTransaction = await safe.createTransaction({
        transactions: txData.transactionData.transactions,
      });

      // Use Safe SDK generated data as base, then ensure all required fields are present
      const safeTransactionData = {
        ...safeTransaction.data,
        safeAddress: txData.safeAddress,
        chainId: txData.chainId,
        transactions: txData.transactionData.transactions,
        nonce: txData.nonce,
        safeTxHash: txData.safeTxHash,
        threshold: txData.threshold,
        owners: txData.transactionData.owners,
      };

      // Debug: Log the complete safeTransactionData structure
      console.log('🔍 Complete safeTransactionData:', safeTransactionData);

      // Step 4: Backend verifies signature and proposes to Safe Transaction Service
      console.log('📤 Step 4: Submitting signature to backend...');
      toast.loading('Submitting signature and proposing transaction...', { id: 'propose' });

      const result = await apiClient.submitPayrollSignature(payrollId, {
        safeTxHash: txData.safeTxHash,
        signature,
        signerAddress,
        safeTransactionData,
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

