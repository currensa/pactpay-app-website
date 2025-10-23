// Simplified Authentication Context with RainbowKit and SIWE
import type { AvailableCompaniesResponse, Organization, UserInfo } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { siweAuthService } from '@/lib/siwe-auth';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';

interface AuthContextType {
  // User state
  user: UserInfo | null;
  currentOrganization: Organization | null;
  organizations: Organization[];

  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | undefined;

  // Auth methods
  login: () => Promise<void>;
  logout: () => void;
  getAvailableCompanies: () => Promise<AvailableCompaniesResponse>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'pp_auth_token';
const WALLET_ADDRESS_KEY = 'pp_wallet_address';
const CURRENT_ORGANIZATION_KEY = 'pp_current_organization';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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

        try {
          // Get user info and check if token is valid
          const userInfo = await apiClient.getCurrentUser();

          // Check if wallet address matches
          if (userInfo.walletAddress.toLowerCase() === storedWalletAddress.toLowerCase()) {
            setUser(userInfo);
            setIsAuthenticated(true);

            // Load organizations and current organization
            await loadOrganizations();
          } else {
            // Wallet mismatch, clear auth
            clearAuth();
          }
        } catch (error) {
          // Token invalid or API error, clear auth
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
    localStorage.removeItem(CURRENT_ORGANIZATION_KEY);
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

      // Check if user has currentOrganization from me endpoint
      if (user?.currentOrganization) {
        // Find the organization that matches the current one from user info
        const currentOrg = orgsResponse.data.find(org => org.id === user.currentOrganization!.id);
        if (currentOrg) {
          setCurrentOrganization(currentOrg);
          localStorage.setItem(CURRENT_ORGANIZATION_KEY, currentOrg.id);
        } else {
          setCurrentOrganization(null);
        }
      } else {
        // No current organization from backend, try to restore from localStorage
        const storedOrgId = localStorage.getItem(CURRENT_ORGANIZATION_KEY);
        if (storedOrgId) {
          const storedOrg = orgsResponse.data.find(org => org.id === storedOrgId);
          if (storedOrg) {
            setCurrentOrganization(storedOrg);
          } else {
            setCurrentOrganization(null);
            localStorage.removeItem(CURRENT_ORGANIZATION_KEY);
          }
        } else {
          setCurrentOrganization(null);
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
      setCurrentOrganization(null);
    }
  };

  const login = async () => {
    if (!walletAddress || !isConnected) throw new Error('Please connect your wallet first');
    if (!chainId) throw new Error('Unable to detect chain ID');

    setIsLoading(true);

    try {
      // Step 1: Get nonce from backend
      const { nonce } = await apiClient.getNonce(walletAddress);

      // Step 2: Create SIWE message
      const siweMessage = siweAuthService.createSiweMessage(walletAddress, nonce, chainId);

      // Step 3: Format message and sign it
      const message = siweMessage.prepareMessage();
      const signature = await signMessageAsync({ message });

      // Step 4: Verify signature and get JWT token
      const authResponse = await apiClient.login(walletAddress, signature, message);

      // Step 5: Store token and wallet address
      localStorage.setItem(AUTH_TOKEN_KEY, authResponse.accessToken);
      localStorage.setItem(WALLET_ADDRESS_KEY, walletAddress.toLowerCase());
      apiClient.setAccessToken(authResponse.accessToken);

      // Step 6: Set authenticated state
      // Convert auth response user to UserInfo format
      const userInfo: UserInfo = {
        id: authResponse.user.id,
        walletAddress: authResponse.user.address,
        email: undefined,
        currentOrganization: undefined,
        needsCompanySelection: authResponse.user.needsCompanySelection
      };
      setUser(userInfo);
      setIsAuthenticated(true);

      // Step 7: Load organizations (this will determine if user needs to select organization)
      await loadOrganizations();

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

  // Get available companies (for first-time selection after login)
  const getAvailableCompanies = async (): Promise<AvailableCompaniesResponse> => {
    try {
      const response = await apiClient.getAvailableCompanies();
      return response;
    } catch (error) {
      console.error('Failed to get available companies:', error);
      throw error;
    }
  };

  // Select organization (unified method for both first-time selection and switching)
  const switchOrganization = async (organizationId: string) => {
    setIsLoading(true);
    try {
      // Use select-organization API to get new token
      const response = await apiClient.switchOrganization(organizationId);

      // Update token
      localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
      apiClient.setAccessToken(response.accessToken);

      // Remember the selected organization
      localStorage.setItem(CURRENT_ORGANIZATION_KEY, organizationId);

      // Refresh user info and organizations
      await refreshUser();
      await loadOrganizations();

    } catch (error) {
      console.error('Failed to select organization:', error);
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
        getAvailableCompanies,
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
