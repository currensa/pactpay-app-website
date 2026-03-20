import {
  Organization,
  OrganizationMember
} from '@/apis/orgnization.api'
import useOrganizationStore from '@/stores/organization'
import { IconLoader2, IconPlus, IconUser } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

interface OrganizationResponseItem {
  organization: Organization
  member: OrganizationMember
}

function hasAdminRole(member: OrganizationMember) {
  return member.roles.some(
    r => r.role !== 'Member' && (r.role as string) !== 'Member'
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

interface SelectOrganizationProps {
  onCreateNew?: () => void
  onEnterAsMember?: () => void
  onSelectAdminOrg?: (orgId: string, member: OrganizationMember) => void
}

export default function SelectOrganization({
  onCreateNew,
  onEnterAsMember,
  onSelectAdminOrg,
}: SelectOrganizationProps) {
  const organizations = useOrganizationStore(s => s.organizations)
  const getOrganizations = useOrganizationStore(s => s.getOrganizations)
  const [loading, setLoading] = useState(!organizations.length)

  useEffect(() => {
    if (organizations.length) return
    getOrganizations().finally(() => setLoading(false))
  }, [])

  const adminOrgs = organizations.filter(item => hasAdminRole(item.member))
  const hasMemberOrgs = organizations.some(item => !hasAdminRole(item.member))

  const handleSelect = (item: OrganizationResponseItem) => {
    onSelectAdminOrg?.(item.organization.orgId, item.member)
  }

  const handleCreateNew = () => {
    onCreateNew?.()
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
        <p className="text-sm text-[#77777d]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-[80px] px-4 py-8 lg:px-[60px] lg:py-[40px]">
      <h1 className="shrink-0 max-w-[480px] text-[32px] font-bold leading-[48px] text-[#1c1c26]">
        Select Organization
      </h1>

      <div className="flex min-h-0 flex-1 flex-col gap-[32px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[24px] pb-4">
            {adminOrgs.map(item => {
              const lastPayment = item.member.lastPayment
                ? formatDate(item.member.lastPayment)
                : 'N/A'
              const roles = item.member.roles ?? []
              return (
                <button
                  key={item.organization.orgId}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full flex-col gap-[16px] rounded-[24px] border border-[rgba(0,0,0,0.12)] bg-white p-[24px] text-left transition-all hover:border-[#5e85ee] hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="shrink-0 text-[24px] font-bold leading-[36px] text-[#1c1c26]">
                      {item.organization.orgName}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-[4px] text-[16px] font-normal leading-[24px] text-[#606067]">
                    <p>Last Payment: {lastPayment}</p>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <span>Roles:</span>
                      {roles.length > 0 ? (
                        <span className="flex flex-wrap gap-[6px]">
                          {roles.map(r => (
                            <span
                              key={r.id}
                              className="inline-flex rounded-full bg-[#e8ecf7] px-[12px] py-[4px] text-[14px] font-medium leading-[20px] text-[#5e85ee]"
                            >
                              {r.role}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-[12px]">
          {/* C端入口: enter as member */}
          {(hasMemberOrgs || onEnterAsMember) && (
            <button
              type="button"
              onClick={onEnterAsMember}
              className="flex items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-opacity hover:opacity-90"
            >
              <IconUser className="size-[24px]" />
              Enter as Member
            </button>
          )}

          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center justify-center gap-[8px] rounded-full bg-[#875dff] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90"
          >
            <IconPlus className="size-[24px]" />
            Create New Organization
          </button>
        </div>
      </div>
    </div>
  )
}
