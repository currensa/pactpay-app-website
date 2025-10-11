// Real Authentication Context with RainbowKit and SIWE
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { apiClient } from '../lib/api-client';
import { siweAuthService } from '../lib/siwe-auth';
import type { UserInfo, OrganizationListResponse } from '../lib/api-client';

interface AuthContextType {
  // User state
  user: UserInfo | null;
  currentOrganization: OrganizationListResponse['data'][0] | null;
  organizations: OrganizationListResponse['data'];
  
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | undefined;
  
  // Auth methods
  login: () => Promise<void>;
  logout: () => void;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'safe_payroll_auth_token';
const WALLET_ADDRESS_KEY = 'safe_payroll_wallet_address';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationListResponse['data'][0] | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListResponse['data']>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Wagmi hooks
  const { address: walletAddress, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  // Load stored token on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedWalletAddress = localStorage.getItem(WALLET_ADDRESS_KEY);
      
      if (storedToken && storedWalletAddress) {
        apiClient.setAccessToken(storedToken);
        
        // Verify token is still valid
        try {
          const userInfo = await apiClient.getCurrentUser();
          
          // Check if wallet address matches
          if (userInfo.walletAddress.toLowerCase() === storedWalletAddress.toLowerCase()) {
            setUser(userInfo);
            setIsAuthenticated(true);
            
            if (userInfo.currentOrganization) {
              await loadOrganizations();
            }
          } else {
            // Wallet mismatch, clear auth
            clearAuth();
          }
        } catch (error) {
          // Token invalid, clear auth
          console.error('Token validation failed:', error);
          clearAuth();
        }
      }
      
      setIsLoading(false);
    };

    loadStoredAuth();
  }, []);

  // Monitor wallet connection changes
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      // Wallet disconnected but user is authenticated
      // Clear authentication
      logout();
    }
  }, [isConnected, isAuthenticated]);

  // Monitor wallet address changes
  useEffect(() => {
    const storedWalletAddress = localStorage.getItem(WALLET_ADDRESS_KEY);
    
    if (isConnected && walletAddress && storedWalletAddress) {
      // Check if wallet address changed
      if (walletAddress.toLowerCase() !== storedWalletAddress.toLowerCase()) {
        // Different wallet connected, logout
        console.log('Wallet address changed, logging out...');
        logout();
      }
    }
  }, [walletAddress, isConnected]);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    apiClient.setAccessToken(null);
    setUser(null);
    setCurrentOrganization(null);
    setOrganizations([]);
    setIsAuthenticated(false);
  }, []);

  const loadOrganizations = async () => {
    try {
      const orgsResponse = await apiClient.getOrganizations();
      setOrganizations(orgsResponse.data);
      
      // Set current organization
      const currentOrg = orgsResponse.data.find(org => org.isCurrent);
      setCurrentOrganization(currentOrg || null);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const login = async () => {
    if (!walletAddress || !isConnected) {
      throw new Error('Please connect your wallet first');
    }

    if (!chainId) {
      throw new Error('Unable to detect chain ID');
    }

    setIsLoading(true);

    try {
      // Step 1: Get nonce from backend
      const { nonce } = await siweAuthService.getNonce(walletAddress);

      // Step 2: Create SIWE message
      const siweMessage = siweAuthService.createSiweMessage(
        walletAddress,
        nonce,
        chainId
      );

      // Step 3: Format message and sign it
      const message = siweMessage.prepareMessage();
      const signature = await signMessageAsync({ message });

      // Step 4: Verify signature and get JWT token
      const authResponse = await siweAuthService.verifySignature(
        walletAddress,
        signature,
        message
      );

      // Step 5: Store token and wallet address
      localStorage.setItem(AUTH_TOKEN_KEY, authResponse.accessToken);
      localStorage.setItem(WALLET_ADDRESS_KEY, walletAddress.toLowerCase());
      apiClient.setAccessToken(authResponse.accessToken);

      // Step 6: Get user info
      const userInfo = await apiClient.getCurrentUser();
      setUser(userInfo);
      setIsAuthenticated(true);

      // Step 7: Load organizations if user has any
      if (authResponse.user.hasOrganization) {
        await loadOrganizations();
      }

    } catch (error: any) {
      console.error('Login failed:', error);
      clearAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    clearAuth();
    disconnect();
  }, [clearAuth, disconnect]);

  const switchOrganization = async (organizationId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.switchOrganization(organizationId);
      
      // Update token
      localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
      apiClient.setAccessToken(response.accessToken);

      // Refresh user and organizations
      await refreshUser();
      await loadOrganizations();
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userInfo = await apiClient.getCurrentUser();
      setUser(userInfo);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      clearAuth();
    }
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrganization,
        organizations,
        isAuthenticated,
        isLoading,
        walletAddress,
        login,
        logout,
        switchOrganization,
        refreshUser,
        refreshOrganizations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

