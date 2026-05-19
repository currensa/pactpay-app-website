import apis from '@/apis';
import { Organization, OrganizationMember } from '@/apis/orgnization.api';
import useChainAssetStore from '@/stores/chain-asset';
import { create } from 'zustand';

export type UserOrgItem = {
  organization: Organization
  member: OrganizationMember
  payrollConfig: import('@/apis/orgnization.api').OrgPayrollConfig | null
  lastPayout: string | null
  memberCount: number
}

interface OrganizationState {
  organizations: UserOrgItem[]
  currentOrgId: string | null
  currentMember: OrganizationMember | null
  payrollConfig: import('@/apis/orgnization.api').OrgPayrollConfig | null
  payrollTokenSymbol: string | null
  getOrganizations: () => Promise<UserOrgItem[]>
  setCurrentOrg: (orgId: string, member: OrganizationMember) => void
  fetchPayrollTokenSymbol: () => Promise<string | null>
  reset: () => void
}

function loadCurrentMember(): OrganizationMember | null {
  try {
    const raw = localStorage.getItem('currentMember')
    return raw ? (JSON.parse(raw) as OrganizationMember) : null
  } catch {
    return null
  }
}

const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: [],
  currentOrgId: localStorage.getItem('organizationId'),
  currentMember: loadCurrentMember(),
  payrollConfig: null,
  payrollTokenSymbol: null,
  getOrganizations: async () => {
    const organizations = await apis.organization.getOrganizations()
    set({ organizations })
    return organizations
  },
  setCurrentOrg: (orgId: string, member: OrganizationMember) => {
    localStorage.setItem('organizationId', orgId)
    localStorage.setItem('currentMember', JSON.stringify(member))
    set({
      currentOrgId: orgId,
      currentMember: member,
      payrollConfig: null,
      payrollTokenSymbol: null,
    })
  },
  fetchPayrollTokenSymbol: async () => {
    const chainAssetStore = useChainAssetStore.getState()
    const [payrollConfig] = await Promise.all([
      apis.organization.getOrgPayrollConfig(),
      chainAssetStore.fetchChainAssets(),
    ])
    if (!payrollConfig) {
      set({ payrollConfig: null, payrollTokenSymbol: null })
      return null
    }
    const symbol = chainAssetStore.getTokenSymbol(payrollConfig.caipChainId, payrollConfig.token)
    set({ payrollConfig, payrollTokenSymbol: symbol })
    return symbol
  },
  reset: () => {
    localStorage.removeItem('organizationId')
    localStorage.removeItem('currentMember')
    set({ organizations: [], currentOrgId: null, currentMember: null, payrollConfig: null, payrollTokenSymbol: null })
  },
}))

export default useOrganizationStore
