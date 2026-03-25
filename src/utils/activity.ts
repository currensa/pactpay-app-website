import { ActivityLog } from '@/apis/orgnization.api'

export function formatActivityDescription(log: ActivityLog): string {
  const p = log.payload as any
  switch (log.eventType) {
    case 'member.joined': {
      const source = p?.after?.source
      if (source === 'invite') return 'Invited to organization'
      if (source === 'apply') return 'Applied to join organization'
      if (source === 'approve') return 'Join request approved'
      return 'Joined organization'
    }
    case 'member.removed':
      return 'Removed from organization'
    case 'member.rejected':
      return 'Join request rejected'
    case 'member.status_changed': {
      const from = p?.before?.status ?? '?'
      const to = p?.after?.status ?? '?'
      return `Status changed: ${from} → ${to}`
    }
    case 'member.role_changed': {
      const parts: string[] = []
      if (p?.added?.length) parts.push(`Added: ${(p.added as string[]).join(', ')}`)
      if (p?.removed?.length) parts.push(`Removed: ${(p.removed as string[]).join(', ')}`)
      return parts.length ? `Role updated — ${parts.join('; ')}` : 'Role updated'
    }
    case 'payout_intent.updated': {
      const before = p?.before?.amount
      const after = p?.after?.amount
      if (before) return `Service Fee updated from ${before} to ${after}`
      return `Service Fee set to ${after}`
    }
    case 'member.wallet_submitted':
      return p?.isNew ? 'Wallet address submitted' : 'Wallet address updated'
    default:
      return log.eventType
  }
}

export function formatActivityTime(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`
}
