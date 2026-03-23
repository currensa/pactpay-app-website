import { OrgPayrollConfig, Organization, OrganizationMember } from '@/apis/orgnization.api'
import useOrganizationStore from '@/stores/organization'
import { IconLoader2, IconPlus, IconUsers } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

interface OrgResponseItem {
  organization: Organization
  member: OrganizationMember
  payrollConfig: OrgPayrollConfig | null
  lastPayout: string | null
  memberCount: number
}

function hasAdminRole(member: OrganizationMember) {
  return member.roles.some(r => r.role !== 'Member')
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getNetworkLabel(caipChainId: string) {
  const map: Record<string, string> = {
    'eip155:1': 'Ethereum',
    'eip155:137': 'Polygon',
    'eip155:56': 'BNB Chain',
    'eip155:11155111': 'Sepolia',
    'eip155:80001': 'Mumbai',
  }
  return map[caipChainId] ?? caipChainId
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
  const organizations = useOrganizationStore(s => s.organizations) as OrgResponseItem[]
  const getOrganizations = useOrganizationStore(s => s.getOrganizations)
  const [loading, setLoading] = useState(!organizations.length)

  useEffect(() => {
    if (organizations.length) return
    getOrganizations().finally(() => setLoading(false))
  }, [])

  const adminOrgs = organizations.filter(item => hasAdminRole(item.member))

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
        <p className="text-sm text-[#77777d]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col px-4 py-8 lg:px-[60px] lg:py-[40px]">
      {/* Header row */}
      <div className="mb-8 flex items-start justify-between">
        <h1 className="max-w-[480px] text-[28px] font-bold leading-[42px] text-[#1c1c26]">
          Select Organization
        </h1>
        <button
          type="button"
          onClick={onEnterAsMember}
          className="flex shrink-0 items-center gap-[6px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[16px] py-[8px] text-[14px] font-semibold text-[#1c1c26] transition-all hover:border-[#5e85ee] hover:text-[#5e85ee]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          Member Dashboard
        </button>
      </div>

      {/* Horizontal scrollable card list */}
      <div className="min-h-0 flex-1 overflow-x-auto pb-2">
        <div className="flex gap-[16px]" style={{ minWidth: 'max-content' }}>
          {adminOrgs.map(item => {
            const network = item.payrollConfig
              ? getNetworkLabel(item.payrollConfig.caipChainId)
              : null
            const lastPayout = item.lastPayout ? formatDate(item.lastPayout) : null
            const memberCount = item.memberCount ?? null

            return (
              <button
                key={item.organization.orgId}
                type="button"
                onClick={() => onSelectAdminOrg?.(item.organization.orgId, item.member)}
                className="flex w-[240px] shrink-0 flex-col gap-[20px] rounded-[24px] border border-[rgba(0,0,0,0.12)] bg-white p-[20px] text-left transition-all hover:border-[#5e85ee] hover:shadow-md"
              >
                {/* Org name */}
                <p className="text-[16px] font-bold leading-[24px] text-[#1c1c26] line-clamp-2">
                  {item.organization.orgName}
                </p>

                {/* Meta info */}
                <div className="flex flex-col gap-[10px]">
                  {network && (
                    <div className="flex items-center gap-[6px]">
                      <span className="inline-flex rounded-[8px] bg-[rgba(94,133,238,0.1)] px-[10px] py-[3px] text-[12px] font-medium text-[#5e85ee]">
                        {network}
                      </span>
                    </div>
                  )}

                  {lastPayout && (
                    <div className="flex flex-col gap-[2px]">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-[#8d8d93]">
                        Last Payout
                      </span>
                      <span className="text-[13px] font-medium text-[#1c1c26]">
                        {lastPayout}
                      </span>
                    </div>
                  )}

                  {memberCount != null && (
                    <div className="flex items-center gap-[6px] text-[13px] text-[#606067]">
                      <IconUsers className="size-[14px] shrink-0 text-[#8d8d93]" />
                      <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}

          {/* Create New Organization card */}
          <button
            type="button"
            onClick={onCreateNew}
            className="flex w-[240px] shrink-0 flex-col items-center justify-center gap-[10px] rounded-[24px] border border-dashed border-[rgba(0,0,0,0.18)] bg-[#fafafa] p-[20px] text-left transition-all hover:border-[#5e85ee] hover:bg-[rgba(94,133,238,0.04)]"
          >
            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(94,133,238,0.12)]">
              <IconPlus className="size-[20px] text-[#5e85ee]" />
            </div>
            <span className="text-[14px] font-semibold text-[#5e85ee]">
              Create New Organization
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
