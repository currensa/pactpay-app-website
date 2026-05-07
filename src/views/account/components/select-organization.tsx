import { OrgPayrollConfig, Organization, OrganizationMember } from '@/apis/orgnization.api'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { IconCalendarEvent, IconLoader2, IconPlus, IconUsers } from '@tabler/icons-react'
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
  const getTokenSymbol = useChainAssetStore(s => s.getTokenSymbol)
  const getTokenIconUrl = useChainAssetStore(s => s.getTokenIconUrl)
  const fetchChainAssets = useChainAssetStore(s => s.fetchChainAssets)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChainAssets()
      .then(() => {
        if (organizations.length) return
        return getOrganizations()
      })
      .finally(() => setLoading(false))
  }, [])

  const adminOrgs = organizations.filter(item => hasAdminRole(item.member))

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <IconLoader2 className="h-7 w-7 animate-spin text-[#8d8d93]" />
        <p className="text-[13px] text-[#8d8d93]">Loading organizations…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col px-[32px] py-[32px] lg:px-[60px] lg:py-[40px]">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold leading-[32px] text-[#1c1c26]">
            Select Organization
          </h1>
          <p className="mt-[2px] text-[13px] text-[#8d8d93]">
            Choose an organization to manage
          </p>
        </div>
        <button
          type="button"
          onClick={onEnterAsMember}
          className="flex shrink-0 items-center gap-[6px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] py-[8px] text-[13px] font-semibold text-[#606067] transition-all hover:border-[#5e85ee] hover:text-[#5e85ee]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          Member Dashboard
        </button>
      </div>

      {/* Card grid */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
        <div
          className="grid content-start justify-start gap-[16px]"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 320px))' }}
        >
          {adminOrgs.map(item => {
            const { organization, payrollConfig, lastPayout, memberCount } = item
            const lastPayoutLabel = lastPayout ? formatDate(lastPayout) : null
            const tokenSymbol = payrollConfig
              ? getTokenSymbol(payrollConfig.caipChainId, payrollConfig.token)
              : null
            const tokenIconUrl = payrollConfig
              ? getTokenIconUrl(payrollConfig.caipChainId, payrollConfig.token)
              : null

            return (
              <button
                key={organization.orgId}
                type="button"
                onClick={() => onSelectAdminOrg?.(organization.orgId, item.member)}
                className="group flex min-w-0 w-full flex-col rounded-[24px] border border-[rgba(0,0,0,0.08)] bg-white p-[20px] text-left shadow-[0px_2px_12px_0px_rgba(0,0,0,0.06)] transition-all hover:border-[#5e85ee] hover:shadow-[0px_4px_20px_0px_rgba(94,133,238,0.15)]"
              >
                {/* ── Logo + Name ─────────────────────────────── */}
                <div className="flex items-center gap-[10px]">
                  {organization.logoUrl ? (
                    <img
                      src={organization.logoUrl}
                      alt={organization.orgName}
                      className="h-[40px] w-[40px] shrink-0 rounded-[10px] object-cover"
                    />
                  ) : (
                    <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[10px] bg-[rgba(94,133,238,0.1)] text-[15px] font-bold text-[#5e85ee]">
                      {organization.orgName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate text-[14px] font-bold leading-[20px] text-[#1c1c26]">
                    {organization.orgName || '—'}
                  </p>
                </div>

                {/* ── Divider ─────────────────────────────────── */}
                <div className="my-[14px] h-px w-full bg-[rgba(0,0,0,0.06)]" />

                {/* ── Stats ───────────────────────────────────── */}
                <div className="flex flex-col gap-[12px]">
                  {/* Token */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-[#8d8d93]">
                      Token
                    </span>
                    <div className="flex items-center gap-[5px]">
                      {tokenIconUrl ? (
                        <img src={tokenIconUrl} alt={tokenSymbol ?? ''} className="h-[14px] w-[14px] rounded-full" />
                      ) : (
                        <div className="h-[14px] w-[14px] rounded-full bg-[#e8e8ea]" />
                      )}
                      <span className="text-[13px] font-semibold text-[#1c1c26]">
                        {tokenSymbol ?? <span className="font-normal text-[#8d8d93]">—</span>}
                      </span>
                    </div>
                  </div>

                  {/* Last Payout */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-[#8d8d93]">
                      Last Payout
                    </span>
                    <div className="flex items-center gap-[5px]">
                      {lastPayoutLabel ? (
                        <>
                          <IconCalendarEvent className="h-[13px] w-[13px] shrink-0 text-[#8d8d93]" />
                          <span className="text-[13px] font-semibold text-[#1c1c26]">
                            {lastPayoutLabel}
                          </span>
                        </>
                      ) : (
                        <span className="text-[13px] font-normal text-[#8d8d93]">—</span>
                      )}
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-[#8d8d93]">
                      Members
                    </span>
                    <div className="flex items-center gap-[5px]">
                      <IconUsers className="h-[13px] w-[13px] shrink-0 text-[#8d8d93]" />
                      <span className="text-[13px] font-semibold text-[#1c1c26]">
                        {memberCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Enter CTA ───────────────────────────────── */}
                <div className="mt-[16px] flex w-full items-center justify-center rounded-[10px] bg-[#f5f5f5] py-[8px] text-[12px] font-semibold text-[#606067] transition-colors group-hover:bg-[rgba(94,133,238,0.1)] group-hover:text-[#5e85ee]">
                  Enter
                </div>
              </button>
            )
          })}

          {/* ── Create New card ─────────────────────────────── */}
          <button
            type="button"
            onClick={onCreateNew}
            className="group flex min-w-0 w-full flex-col items-center justify-center gap-[10px] rounded-[24px] border border-dashed border-[rgba(0,0,0,0.15)] bg-white p-[20px] transition-all hover:border-[#5e85ee] hover:bg-[rgba(94,133,238,0.03)]"
          >
            <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[rgba(94,133,238,0.1)] transition-colors group-hover:bg-[rgba(94,133,238,0.18)]">
              <IconPlus className="h-[20px] w-[20px] text-[#5e85ee]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-[#5e85ee]">New Organization</p>
              <p className="mt-[2px] text-[11px] text-[#8d8d93]">Create and manage payroll</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
