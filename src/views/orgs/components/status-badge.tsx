import { getMemberStatusDisplayName, memberStatus } from '@/enums/org'
import { OrganizationMember } from '@/apis/orgnization.api'

export function StatusBadge({ status, className }: { status: OrganizationMember['status']; className?: string }) {
  if (status === 'active') {
    return (
      <span className={`inline-flex items-center rounded-[8px] bg-[rgba(93,221,34,0.12)] px-[7px] py-[2px] text-[12px] leading-[18px] text-[#5ddd22] whitespace-nowrap ${className ?? ''}`}>
        Active
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center rounded-[8px] bg-[rgba(255,168,0,0.12)] px-[7px] py-[2px] text-[12px] leading-[18px] text-[#ffa800] whitespace-nowrap ${className ?? ''}`}>
      {getMemberStatusDisplayName(status as memberStatus)}
    </span>
  )
}
