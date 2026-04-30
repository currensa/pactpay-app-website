import { ChainAssetResponse } from '@/apis/chain-asset.api'
import { Check, ChevronDown } from 'lucide-react'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

type ChainAssetItem = ChainAssetResponse['data'][number]

interface PaymentConfigFieldsProps {
  chainAssets: ChainAssetItem[]
  selectedChainId: string
  selectedToken: string
  onSelectedChainIdChange: (value: string) => void
  onSelectedTokenChange: (value: string) => void
  chainLabel?: string
  tokenLabel?: string
  chainPlaceholder?: string
  tokenPlaceholder?: string
  tokenDisabledPlaceholder?: string
  dropdownPlacement?: 'top' | 'bottom'
  networkLabelExtra?: ReactNode
  footerHint?: ReactNode
  className?: string
}

export function PaymentConfigFields({
  chainAssets,
  selectedChainId,
  selectedToken,
  onSelectedChainIdChange,
  onSelectedTokenChange,
  chainLabel = 'Chain *',
  tokenLabel = 'Pay token type *',
  chainPlaceholder = 'Select a chain',
  tokenPlaceholder = 'Select a token',
  tokenDisabledPlaceholder = 'Select a chain first',
  dropdownPlacement = 'bottom',
  networkLabelExtra,
  footerHint,
  className = '',
}: PaymentConfigFieldsProps) {
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false)
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)
  const tokenDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(e.target as Node)) setChainDropdownOpen(false)
      if (tokenDropdownRef.current && !tokenDropdownRef.current.contains(e.target as Node)) setTokenDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const stableAssets = useMemo(
    () => chainAssets.filter(item => item.asset.isStable),
    [chainAssets]
  )

  const chains = useMemo(
    () => Array.from(new Map(stableAssets.map(item => [item.chain.caipChainId, item.chain])).values()),
    [stableAssets]
  )

  const selectedChain = chains.find(chain => chain.caipChainId === selectedChainId)
  const assetsForChain = stableAssets.filter(item => item.chain.caipChainId === selectedChainId)
  const selectedAsset = assetsForChain.find(
    asset => (asset.contractAddress || asset.asset.symbol) === selectedToken
  )

  const dropdownPositionClass = dropdownPlacement === 'top'
    ? 'bottom-full mb-[4px]'
    : 'top-full mt-[4px]'

  return (
    <div className={`flex flex-col gap-[16px] ${className}`}>
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{chainLabel}</p>
          {networkLabelExtra}
        </div>
        <div className="relative" ref={chainDropdownRef}>
          <button
            onClick={() => { setChainDropdownOpen(v => !v); setTokenDropdownOpen(false) }}
            className="w-full rounded-[12px] bg-[#f5f5f5] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26]"
          >
            <div className="flex items-center justify-between gap-[12px]">
              {selectedChain ? (
                <div className="flex items-center gap-[8px]">
                  {selectedChain.iconUrl && (
                    <img src={selectedChain.iconUrl} alt={selectedChain.name} className="h-[18px] w-[18px] rounded-full shrink-0" />
                  )}
                  <span>{selectedChain.name}</span>
                </div>
              ) : (
                <span className="text-[#bbbbbe]">{chainPlaceholder}</span>
              )}
              <ChevronDown className={`h-[16px] w-[16px] shrink-0 text-[#606067] transition-transform ${chainDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {chainDropdownOpen && chains.length > 0 && (
            <div className={`absolute left-0 z-20 w-full overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg ${dropdownPositionClass}`}>
              {chains.map(chain => (
                <button
                  key={chain.caipChainId}
                  onClick={() => {
                    onSelectedChainIdChange(chain.caipChainId)
                    onSelectedTokenChange('')
                    setChainDropdownOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
                >
                  <div className="flex items-center gap-[8px]">
                    {chain.iconUrl && (
                      <img src={chain.iconUrl} alt={chain.name} className="h-[18px] w-[18px] rounded-full shrink-0" />
                    )}
                    <span>{chain.name}</span>
                  </div>
                  {selectedChainId === chain.caipChainId && (
                    <Check className="h-[14px] w-[14px] shrink-0 text-[#5e85ee]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{tokenLabel}</p>
        <div className="relative" ref={tokenDropdownRef}>
          <button
            onClick={() => { if (selectedChainId) { setTokenDropdownOpen(v => !v); setChainDropdownOpen(false) } }}
            className={`w-full rounded-[12px] bg-[#f5f5f5] px-[14px] py-[10px] text-[13px] leading-[20px] ${!selectedChainId ? 'cursor-not-allowed opacity-50' : 'text-[#1c1c26]'}`}
          >
            <div className="flex items-center justify-between gap-[12px]">
              {selectedAsset ? (
                <div className="flex items-center gap-[8px]">
                  {selectedAsset.asset.iconUrl && (
                    <img src={selectedAsset.asset.iconUrl} alt={selectedAsset.asset.symbol} className="h-[18px] w-[18px] rounded-full shrink-0" />
                  )}
                  <span>{selectedAsset.asset.symbol}</span>
                </div>
              ) : (
                <span className="text-[#bbbbbe]">{selectedChainId ? tokenPlaceholder : tokenDisabledPlaceholder}</span>
              )}
              <ChevronDown className={`h-[16px] w-[16px] shrink-0 text-[#606067] transition-transform ${tokenDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {tokenDropdownOpen && assetsForChain.length > 0 && (
            <div className={`absolute left-0 z-20 w-full overflow-hidden rounded-[16px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg ${dropdownPositionClass}`}>
              {assetsForChain.map(item => {
                const tokenValue = item.contractAddress || item.asset.symbol
                return (
                  <button
                    key={item.id}
                    onClick={() => { onSelectedTokenChange(tokenValue); setTokenDropdownOpen(false) }}
                    className="flex w-full items-center justify-between px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
                  >
                    <div className="flex items-center gap-[8px]">
                      {item.asset.iconUrl && (
                        <img src={item.asset.iconUrl} alt={item.asset.symbol} className="h-[18px] w-[18px] rounded-full shrink-0" />
                      )}
                      <span>{item.asset.symbol}</span>
                      {item.isNative && <span className="text-[11px] text-[#8d8d93]">(Native)</span>}
                    </div>
                    {selectedToken === tokenValue && (
                      <Check className="h-[14px] w-[14px] shrink-0 text-[#5e85ee]" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {footerHint && (
        <p className="text-[12px] leading-[18px] text-[#8d8d93]">
          {footerHint}
        </p>
      )}
    </div>
  )
}
