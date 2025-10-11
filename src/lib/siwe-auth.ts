// SIWE (Sign-In with Ethereum) Authentication Service
import { SiweMessage } from 'siwe';
import { apiClient } from './api-client';

export interface SiweAuthService {
  getNonce: (walletAddress: string) => Promise<{ nonce: string; message: string }>;
  verifySignature: (walletAddress: string, signature: string, message: string) => Promise<{
    accessToken: string;
    user: {
      id: string;
      walletAddress: string;
      hasOrganization: boolean;
    };
  }>;
  createSiweMessage: (address: string, nonce: string, chainId: number) => SiweMessage;
}

class SiweAuthServiceImpl implements SiweAuthService {
  /**
   * Get nonce from backend for SIWE authentication
   */
  async getNonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    try {
      const response = await apiClient.getNonce(walletAddress);
      return response;
    } catch (error) {
      console.error('Failed to get nonce:', error);
      throw new Error('Failed to get authentication nonce');
    }
  }

  /**
   * Verify signature and login
   */
  async verifySignature(
    walletAddress: string, 
    signature: string, 
    message: string
  ): Promise<{
    accessToken: string;
    user: {
      id: string;
      walletAddress: string;
      hasOrganization: boolean;
    };
  }> {
    try {
      const response = await apiClient.login(walletAddress, signature, message);
      return response;
    } catch (error) {
      console.error('Failed to verify signature:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Create SIWE message for signing
   */
  createSiweMessage(address: string, nonce: string, chainId: number): SiweMessage {
    const domain = window.location.host;
    const origin = window.location.origin;

    return new SiweMessage({
      domain,
      address,
      statement: 'Sign in to Safe Payroll with your Ethereum account.',
      uri: origin,
      version: '1',
      chainId,
      nonce,
    });
  }

  /**
   * Format SIWE message for display
   */
  formatMessageForSigning(siweMessage: SiweMessage): string {
    return siweMessage.prepareMessage();
  }
}

export const siweAuthService = new SiweAuthServiceImpl();

