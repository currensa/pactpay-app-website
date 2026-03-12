import apis from '@/apis';
import { Organization, OrganizationMember } from '@/apis/orgnization.api';
import useChainAssetStore from '@/stores/chain-asset';
import { create } from 'zustand';

export type UserOrgItem = { organization: Organization; member: OrganizationMember }

interface OrganizationState {
  organizations: UserOrgItem[]
  currentOrgId: string | null
  currentMember: OrganizationMember | null
  payrollTokenSymbol: string | null
  getOrganizations: () => Promise<UserOrgItem[]>
  setCurrentOrg: (orgId: string, member: OrganizationMember) => void
  fetchPayrollTokenSymbol: () => Promise<string | null>
  reset: () => void
}

const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: [],
  currentOrgId: localStorage.getItem('organizationId'),
  currentMember: null,
  payrollTokenSymbol: null,
  getOrganizations: async () => {
    const organizations = await apis.organization.getOrganizations()
    set({ organizations })
    return organizations
  },
  setCurrentOrg: (orgId: string, member: OrganizationMember) => {
    localStorage.setItem('organizationId', orgId)
    set({ currentOrgId: orgId, currentMember: member })
  },
  fetchPayrollTokenSymbol: async () => {
    const chainAssetStore = useChainAssetStore.getState()
    const [payrollConfig] = await Promise.all([
      apis.organization.getOrgPayrollConfig(),
      chainAssetStore.fetchChainAssets(),
    ])
    if (!payrollConfig) {
      set({ payrollTokenSymbol: null })
      return null
    }
    const symbol = chainAssetStore.getTokenSymbol(payrollConfig.caipChainId, payrollConfig.token)
    set({ payrollTokenSymbol: symbol })
    return symbol
  },
  reset: () => {
    localStorage.removeItem('organizationId')
    set({ organizations: [], currentOrgId: null, currentMember: null, payrollTokenSymbol: null })
  },
}))

export default useOrganizationStore
