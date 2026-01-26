import apis from '@/apis';
import { Organization, OrganizationMember } from '@/apis/orgnization.api';
import { create } from 'zustand';

interface OrganizationState {
  // organization: Organization | null
  organizations: { organization: Organization; member: OrganizationMember }[]
  // setOrganization: (organization: Organization) => void
  getOrganizations: () => Promise<{ organization: Organization; member: OrganizationMember }[]>
}

const useOrganizationStore = create<OrganizationState>((set) => ({
  // organization: null,
  organizations: [],
  // setOrganization: (organization: Organization | null) => set({ organization }),
  getOrganizations: async () => {
    const organizations = await apis.organization.getOrganizations()
    set({ organizations })
    return  organizations
  }
}))

export default useOrganizationStore