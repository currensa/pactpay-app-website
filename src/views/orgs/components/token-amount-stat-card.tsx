import type { TokenAmount } from '@/apis/statistics.api'
import useChainAssetStore from '@/stores/chain-asset'
import { formatUnits } from 'ethers'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

interface TokenAmountStatCardProps {
  title: string
  items: TokenAmount[]
  icon: LucideIcon
  dropdownKey: string
  openDropdown: string | null
  onOpenDropdown: (key: string | null) => void
}

export function TokenAmountStatCard({
  title,
  items,
  icon: Icon,
  dropdownKey,
  openDropdown,
  onOpenDropdown,
}: TokenAmountStatCardProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const idx = Math.min(selectedIdx, Math.max(0, items.length - 1))
  const current = items[idx]

  const chainAssetStore = useChainAssetStore.getState()

  const formatAmount = (item: TokenAmount) => {
    const decimals = chainAssetStore.getTokenDecimals(item.caipChainId, item.tokenAddress)
    try {
      return parseFloat(formatUnits(BigInt(item.amount), decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 })
    } catch {
      return '0'
    }
  }

  const getSymbol = (item: TokenAmount) =>
    chainAssetStore.getTokenSymbol(item.caipChainId, item.tokenAddress) || item.tokenAddress.slice(0, 6).toUpperCase()

  const getIconUrl = (item: TokenAmount) =>
    chainAssetStore.getChainAssetByToken(item.caipChainId, item.tokenAddress)?.asset.iconUrl ?? null

  const iconUrl = current ? getIconUrl(current) : null
  const isOpen = openDropdown === dropdownKey

  return (
    <div className="flex flex-1 items-start justify-between bg-white rounded-[24px] p-[24px] relative">
      <div className="flex flex-col gap-[6px]">
        <span className="text-[14px] leading-[22px] text-[#1c1c26]">{title}</span>
        <div className="flex items-baseline gap-[6px]">
          {iconUrl && (
            <img src={iconUrl} alt="" className="w-[22px] h-[22px] rounded-full self-end mb-[6px] shrink-0" />
          )}
          <span className="text-[28px] font-medium leading-[40px] text-[#1c1c26]">
            {current ? formatAmount(current) : '0'}
          </span>
          {items.length > 0 && (
            <button
              onClick={() => onOpenDropdown(isOpen ? null : dropdownKey)}
              className="flex items-center gap-[2px] text-[14px] leading-[22px] text-[#1c1c26] hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              {current ? getSymbol(current) : ''}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="#1c1c26" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center w-[52px] h-[52px] bg-[#f5f5f5] rounded-[14px] shrink-0">
        <Icon size={26} className="text-[#1c1c26]" />
      </div>
      {isOpen && items.length >= 1 && (
        <div className="absolute left-[24px] top-[88px] z-50 bg-white rounded-[20px] shadow-[0px_12px_26px_0px_rgba(0,0,0,0.08)] py-[16px] min-w-[140px]">
          {items.map((item, i) => {
            const sym = getSymbol(item)
            return (
              <button
                key={i}
                onClick={() => { setSelectedIdx(i); onOpenDropdown(null) }}
                className="flex items-center justify-between w-full px-[20px] py-[8px] text-[14px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
              >
                {sym}
                {i === idx && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="#1c1c26" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
