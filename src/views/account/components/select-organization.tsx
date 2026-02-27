import api from '@/apis'
import {
  Organization,
  OrganizationMember
} from '@/apis/orgnization.api'
import { IconLoader2, IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface OrganizationResponseItem {
  organization: Organization
  member: OrganizationMember
}

function checkIdentities(member: OrganizationMember) {
  const roles = member.roles.map(r => r.role)
  const isEmployeeOnly =
    roles.every(
      r => (r as string) === 'Employee' || (r as string) === 'Member'
    ) && roles.length > 0
  const hasOtherRoles = roles.some(
    r => (r as string) !== 'Employee' && (r as string) !== 'Member'
  )
  return { isEmployeeOnly, hasOtherRoles }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getNetworkLabel(item: OrganizationResponseItem): string {
  const config = item.organization.paymentAccounts?.[0]?.config
  return config?.network ?? '—'
}

interface SelectOrganizationProps {
  onCreateNew?: () => void
}

export default function SelectOrganization({ onCreateNew }: SelectOrganizationProps) {
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState<OrganizationResponseItem[]>(
    []
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await api.organization.getOrganizations()
      const adminOrgs = (data || []).filter(item =>
        item.member.roles.some(
          r => r.role !== 'Employee' && r.role !== ('Member' as never)
        )
      )
      setOrganizations(adminOrgs)
    } catch (error) {
      console.error('Failed to load organizations:', error)
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  const navigateToOrgDashboard = (item: OrganizationResponseItem) => {
    localStorage.setItem('organizationId', item.organization.orgId)
    navigate('/orgs/dashboard', { replace: true })
  }

  const navigateToEmployeeDashboard = (item: OrganizationResponseItem) => {
    localStorage.setItem('organizationId', item.organization.orgId)
    navigate('/employee/overview', { replace: true })
  }

  useEffect(() => {
    if (organizations.length !== 1 || loading) return
    const item = organizations[0]
    const { isEmployeeOnly, hasOtherRoles } = checkIdentities(item.member)
    if (isEmployeeOnly) navigateToEmployeeDashboard(item)
    else if (hasOtherRoles) navigateToOrgDashboard(item)
  }, [organizations, loading])

  const handleSelect = (item: OrganizationResponseItem) => {
    const { isEmployeeOnly, hasOtherRoles } = checkIdentities(item.member)
    if (isEmployeeOnly) navigateToEmployeeDashboard(item)
    else if (hasOtherRoles) navigateToOrgDashboard(item)
  }

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew()
    } else {
      navigate('/account/organization/create')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
        <p className="text-sm text-[#77777d]">Loading...</p>
      </div>
    )
  }

  if (organizations.length === 1) {
    const { isEmployeeOnly, hasOtherRoles } = checkIdentities(
      organizations[0].member
    )
    if (isEmployeeOnly || hasOtherRoles) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-[#77777d]" />
          <p className="text-sm text-[#77777d]">Redirecting...</p>
        </div>
      )
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-[80px] px-4 py-8 lg:px-[60px] lg:py-[40px]">
      <h1 className="shrink-0 max-w-[480px] text-[32px] font-bold leading-[48px] text-[#1c1c26]">
        Select Organization
      </h1>

      <div className="flex min-h-0 flex-1 flex-col gap-[32px]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[24px] pb-4">
            {organizations.map(item => {
              const networkLabel = getNetworkLabel(item)
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
                    <div className="flex shrink-0 items-center gap-[4px] rounded-full bg-[#f5f5f5] px-[16px] py-[6px]">
                      <div className="size-[20px] shrink-0 rounded-[4.8px] bg-black" />
                      <p className="text-[16px] font-normal leading-[24px] text-[#1c1c26]">
                        {networkLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-[4px] text-[16px] font-normal leading-[24px] text-[#606067]">
                    <p>Last Payment: {lastPayment}</p>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <span>Contractors:</span>
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

        <button
          type="button"
          onClick={handleCreateNew}
          className="flex shrink-0 items-center justify-center gap-[8px] rounded-full bg-[#875dff] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90"
        >
          <IconPlus className="size-[24px]" />
          Create New Organization
        </button>
      </div>
    </div>
  )
}
