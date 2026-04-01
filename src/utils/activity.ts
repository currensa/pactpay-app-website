import React from 'react'

interface ActivityLogLike {
  eventType: string
  payload: Record<string, unknown> | null
}

export interface ActivityTokenResolver {
  getTokenSymbol: (caipChainId: string, tokenAddress: string) => string | null
  getTokenIconUrl: (caipChainId: string, tokenAddress: string) => string | null
  getChain: (caipChainId: string) => { name: string } | null
}

export function formatActivityDescription(log: ActivityLogLike, resolver?: ActivityTokenResolver): React.ReactNode {
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
      const caipChainId = p?.caipChainId ?? p?.after?.caipChainId ?? p?.before?.caipChainId
      const tokenAddress = p?.tokenAddress ?? p?.after?.tokenAddress ?? p?.before?.tokenAddress

      let tokenNode: React.ReactNode = null
      if (resolver && caipChainId && tokenAddress) {
        const symbol = resolver.getTokenSymbol(caipChainId, tokenAddress)
        const iconUrl = resolver.getTokenIconUrl(caipChainId, tokenAddress)
        const chain = resolver.getChain(caipChainId)
        tokenNode = (
          React.createElement('span', { className: 'inline-flex items-center gap-[4px] ml-[4px]' },
            iconUrl && React.createElement('img', { src: iconUrl, alt: symbol ?? '', className: 'w-[14px] h-[14px] rounded-full inline-block' }),
            symbol && React.createElement('span', null, symbol),
            chain && React.createElement('span', { className: 'text-[#8d8d93]' }, `(${chain.name})`)
          )
        )
      }

      if (before) {
        return React.createElement(React.Fragment, null,
          `Amount updated from ${before} to ${after}`,
          tokenNode
        )
      }
      return React.createElement(React.Fragment, null,
        `Amount set to ${after}`,
        tokenNode
      )
    }
    case 'member.wallet_submitted':
      return p?.isNew ? 'Wallet address submitted' : 'Wallet address updated'
    default:
      return log.eventType
  }
}

export function formatActivityTime(iso: string | null | undefined): string {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`
}
