// 左上角组织切换器
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import useOrganizationStore from '@/stores/organization'
import { IconArrowsLeftRight } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false)

  const { organizations, currentOrgId, setCurrentOrg, getOrganizations } = useOrganizationStore()

  useEffect(() => {
    if (organizations.length === 0) {
      getOrganizations()
    }
  }, [])

  // 只显示有管理权限（Owner / Admin / Operator）的组织
  const adminOrgs = organizations.filter(({ member }) =>
    member.roles.some(r => ['Owner', 'Admin', 'Operator'].includes(r.role))
  )

  const handleSwitch = (orgId: string, member: typeof organizations[0]['member']) => {
    setOpen(false)
    if (orgId === currentOrgId) return
    setCurrentOrg(orgId, member)
    window.location.href = '/orgs/dashboard'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white transition-colors hover:bg-[#f5f5f5]"
          title="Switch Organization"
        >
          <IconArrowsLeftRight className="h-[20px] w-[20px] text-[#1c1c26]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-[272px] rounded-[20px] border border-[rgba(0,0,0,0.08)] p-[4px] shadow-[0px_12px_26px_0px_rgba(0,0,0,0.08)]"
      >
        {adminOrgs.length === 0 ? (
          <p className="px-[18px] py-[12px] text-[13px] text-[#8d8d93]">No admin organizations</p>
        ) : (
          <div className="flex flex-col">
            {adminOrgs.map(({ organization, member }, index) => {
              const isActive = organization.orgId === currentOrgId
              const desc = organization.desc
                ? organization.desc.length > 25
                  ? organization.desc.slice(0, 25) + '…'
                  : organization.desc
                : null

              return (
                <div key={organization.orgId}>
                  {index > 0 && <div className="mx-[4px] h-px bg-[rgba(0,0,0,0.08)]" />}
                  <button
                    onClick={() => handleSwitch(organization.orgId, member)}
                    className={cn(
                      'flex w-full items-center gap-[10px] rounded-[14px] px-[16px] py-[10px] text-left transition-colors',
                      isActive ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
                    )}
                  >
                    {/* Logo */}
                    {organization.logoUrl ? (
                      <img
                        src={organization.logoUrl}
                        alt=""
                        className="h-[36px] w-[36px] shrink-0 rounded-[10px] object-cover"
                      />
                    ) : (
                      <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f5] text-[14px] font-bold text-[#8d8d93]">
                        {organization.orgName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex min-w-0 flex-col gap-[1px]">
                      <span className="truncate font-bold text-[15px] leading-[22px] text-[#1c1c26]">
                        {organization.orgName}
                      </span>
                      {desc && (
                        <span className="text-[12px] leading-[18px] text-[#606067]">{desc}</span>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
