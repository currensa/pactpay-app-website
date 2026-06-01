import type { TokenAmount } from '@/apis/statistics.api'
import useChainAssetStore from '@/stores/chain-asset'
import { formatUnits } from 'ethers'
import type { LucideIcon } from 'lucide-react'

export function getTokenAmountFontClass(maxLen: number) {
  if (maxLen <= 7) return 'text-[28px] leading-[40px]'
  if (maxLen <= 10) return 'text-[22px] leading-[32px]'
  if (maxLen <= 13) return 'text-[18px] leading-[28px]'
  if (maxLen <= 16) return 'text-[16px] leading-[24px]'
  return 'text-[14px] leading-[22px]'
}

export function formatTokenAmountItem(item: TokenAmount): string {
  const chainAssetStore = useChainAssetStore.getState()
  const decimals = chainAssetStore.getTokenDecimals(item.caipChainId, item.tokenAddress)
  try {
    return parseFloat(formatUnits(BigInt(item.amount), decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 })
  } catch {
    return '0'
  }
}

interface TokenAmountStatCardProps {
  title: string
  items: TokenAmount[]
  icon: LucideIcon
  dropdownKey: string
  openDropdown: string | null
  onOpenDropdown: (key: string | null) => void
  selectedIdx: number
  onSelectedIdxChange: (idx: number) => void
  valueFontClass: string
}

export function TokenAmountStatCard({
  title,
  items,
  icon: Icon,
  dropdownKey,
  openDropdown,
  onOpenDropdown,
  selectedIdx,
  onSelectedIdxChange,
  valueFontClass,
}: TokenAmountStatCardProps) {
  const idx = Math.min(selectedIdx, Math.max(0, items.length - 1))
  const current = items[idx]

  const chainAssetStore = useChainAssetStore.getState()

  const formatAmount = (item: TokenAmount) => formatTokenAmountItem(item)

  const getSymbol = (item: TokenAmount) =>
    chainAssetStore.getTokenSymbol(item.caipChainId, item.tokenAddress) || item.tokenAddress.slice(0, 6).toUpperCase()

  const getIconUrl = (item: TokenAmount) =>
    chainAssetStore.getChainAssetByToken(item.caipChainId, item.tokenAddress)?.asset.iconUrl ?? null

  const getChainName = (item: TokenAmount) =>
    chainAssetStore.getChain(item.caipChainId)?.name || item.caipChainId

  const iconUrl = current ? getIconUrl(current) : null
  const isOpen = openDropdown === dropdownKey

  return (
    <div className="relative flex min-w-0 flex-1 items-start justify-between rounded-[24px] bg-white p-[18px] md:p-[24px]">
      <div className="flex flex-col gap-[6px]">
        <span className="text-[14px] leading-[22px] text-[#1c1c26]">{title}</span>
        <div className="flex flex-wrap items-end gap-[6px]">
          {iconUrl && (
            <img src={iconUrl} alt="" className="w-[22px] h-[22px] rounded-full self-end mb-[6px] shrink-0" />
          )}
          <span className={`font-medium text-[#1c1c26] ${valueFontClass}`}>
            {current ? formatAmount(current) : '0'}
          </span>
          {items.length > 0 && (
            <button
              onClick={() => onOpenDropdown(isOpen ? null : dropdownKey)}
              className="flex items-center gap-[2px] hover:opacity-70 transition-opacity"
            >
              <span className="flex flex-col items-start text-left leading-none">
                <span className="text-[14px] leading-[18px] text-[#1c1c26] whitespace-nowrap">
                  {current ? getSymbol(current) : ''}
                </span>
                <span className="max-w-[92px] truncate text-[10px] leading-[12px] text-[#8d8d93]">
                  {current ? getChainName(current) : ''}
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="#1c1c26" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-[#f5f5f5] md:h-[52px] md:w-[52px]">
        <Icon size={26} className="text-[#1c1c26]" />
      </div>
      {isOpen && items.length >= 1 && (
        <div className="absolute left-[18px] top-[82px] z-50 min-w-[184px] rounded-[20px] bg-white py-[8px] shadow-[0px_12px_26px_0px_rgba(0,0,0,0.08)] md:left-[24px] md:top-[88px]">
          {items.map((item, i) => {
            const sym = getSymbol(item)
            const chainName = getChainName(item)
            return (
              <button
                key={i}
                onClick={() => { onSelectedIdxChange(i); onOpenDropdown(null) }}
                className="flex items-center justify-between gap-[10px] w-full px-[16px] py-[8px] hover:bg-[#f5f5f5] transition-colors"
              >
                <span className="min-w-0 flex flex-col items-start text-left">
                  <span className="text-[13px] leading-[18px] text-[#1c1c26]">{sym}</span>
                  <span className="w-full truncate text-[11px] leading-[14px] text-[#8d8d93]">{chainName}</span>
                </span>
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
