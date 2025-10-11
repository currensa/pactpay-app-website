// Authentication & SIWE Implementation
import { BrowserProvider } from 'ethers';
import { authStorage, userStorage, organizationMemberStorage } from './storage';
import { User, AuthState } from '../types';
import { generateId } from './utils';

export async function connectWallet(): Promise<{ address: string; chainId: number; provider: BrowserProvider }> {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask or another Web3 wallet');
  }

  const provider = new BrowserProvider(window.ethereum);
  
  // Request account access
  const accounts = await provider.send('eth_requestAccounts', []);
  const address = accounts[0];
  
  // Get chain ID
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  
  return { address, chainId, provider };
}

export async function signInWithEthereum(
  address: string,
  chainId: number,
  provider: BrowserProvider
): Promise<AuthState> {
  // Create simplified SIWE-style message
  const nonce = generateNonce();
  const message = `Sign in to Safe Payroll

Domain: ${window.location.host}
Address: ${address}
URI: ${window.location.origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

  // Sign the message
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);

  // In production, signature verification would be done on the backend
  // For this demo, we'll just check that we got a signature
  if (!signature) {
    throw new Error('Signature verification failed');
  }

  // Get or create user
  let user = userStorage.getByWallet(address);
  
  if (!user) {
    user = {
      id: generateId(),
      walletAddress: address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    userStorage.create(user);
  }

  // Check if user has organizations
  const memberships = organizationMemberStorage.getByUser(user.id);
  const currentOrganizationId = user.lastOrganizationId || (memberships.length > 0 ? memberships[0].organizationId : null);

  // Generate JWT (simplified for frontend)
  const accessToken = generateAccessToken(user.id, address, currentOrganizationId || undefined);

  const authState: AuthState = {
    isAuthenticated: true,
    user,
    currentOrganizationId,
    accessToken,
  };

  // Save auth state
  authStorage.set(authState);

  return authState;
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function generateAccessToken(userId: string, walletAddress: string, currentOrganizationId?: string): string {
  // Simplified JWT for frontend (in production, this would be done on backend with proper signing)
  const payload = {
    userId,
    walletAddress,
    currentOrganizationId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };
  
  return btoa(JSON.stringify(payload));
}

export function parseAccessToken(token: string) {
  try {
    return JSON.parse(atob(token));
  } catch (error) {
    return null;
  }
}

export function getAuthState(): AuthState {
  return authStorage.get();
}

export function updateAuthOrganization(organizationId: string): AuthState {
  const auth = authStorage.get();
  
  if (!auth.user) {
    throw new Error('No authenticated user');
  }

  // Update user's last organization
  userStorage.update(auth.user.id, { lastOrganizationId: organizationId });

  // Generate new token with updated organization
  const newToken = generateAccessToken(auth.user.id, auth.user.walletAddress, organizationId);

  const newAuth: AuthState = {
    ...auth,
    currentOrganizationId: organizationId,
    accessToken: newToken,
  };

  authStorage.set(newAuth);
  return newAuth;
}

export function logout(): void {
  authStorage.clear();
}

export function isAuthenticated(): boolean {
  const auth = authStorage.get();
  return auth.isAuthenticated && !!auth.user;
}

export function requireAuth(): User {
  const auth = authStorage.get();
  if (!auth.isAuthenticated || !auth.user) {
    throw new Error('Not authenticated');
  }
  return auth.user;
}

export function requireOrganization(): string {
  const auth = authStorage.get();
  if (!auth.currentOrganizationId) {
    throw new Error('No organization selected');
  }
  return auth.currentOrganizationId;
}
