import api from '@/apis'
import { IconChevronDown, IconLoader2 } from '@tabler/icons-react'
import { FormEvent, useEffect, useState } from 'react'

interface Chain {
  id: string
  caipChainId: string
  name: string
  chainId: string
  ecosystem: string
  iconUrl: string
}

interface CreateOrgStep2Props {
  onBack: () => void
  onComplete: () => void
}

export default function CreateOrgStep2({ onBack, onComplete }: CreateOrgStep2Props) {
  const [chains, setChains] = useState<Chain[]>([])
  const [loadingChains, setLoadingChains] = useState(false)
  const [selectedChainId, setSelectedChainId] = useState('')
  const [safeAddress, setSafeAddress] = useState('')
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadChains()
  }, [])

  const loadChains = async () => {
    setLoadingChains(true)
    try {
      const data = await api.chainAsset.getChains()
      setChains(data)
    } catch (error) {
      console.error('Failed to load chains:', error)
    } finally {
      setLoadingChains(false)
    }
  }

  const selectedChain = chains.find(c => c.id === selectedChainId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedChain || !safeAddress.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await api.organization.bindPaymentAccount({
        address: safeAddress.trim(),
        caipChainId: selectedChain.caipChainId
      })
      onComplete()
    } catch (error) {
      console.error('Failed to bind payment account:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-[60px] px-4 py-8 lg:gap-[80px] lg:px-[80px] lg:py-[80px]">
      {/* 标题 */}
      <h1 className="w-full max-w-[480px] text-[28px] font-bold leading-[42px] text-[#1c1c26] lg:text-[32px] lg:leading-[48px]">
        Create Organization
      </h1>

      {/* 进度条 */}
      <div className="relative h-[16px] w-full max-w-[480px]">
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#e5e5e5]" />
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#5e85ee]" />
        <div className="absolute left-0 top-1/2 h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#5e85ee] bg-[#5e85ee]" />
        <div className="absolute right-0 top-1/2 h-[12px] w-[12px] translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#5e85ee] bg-white" />
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[32px]">
        {/* 网络选择 */}
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="network" className="text-[16px] leading-[24px] text-[#1c1c26]">
            Network
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
              disabled={loadingChains}
              className="flex h-[56px] w-full items-center justify-between overflow-hidden rounded-[16px] bg-[#f5f5f5] px-[16px] text-left disabled:opacity-60"
            >
              {loadingChains ? (
                <span className="flex items-center gap-2 text-[16px] leading-[24px] text-[#bbbbbe]">
                  <IconLoader2 className="h-[16px] w-[16px] animate-spin" />
                  Loading networks...
                </span>
              ) : (
                <span
                  className={`text-[16px] leading-[24px] ${selectedChain ? 'text-[#1c1c26]' : 'text-[#bbbbbe]'}`}
                >
                  {selectedChain ? selectedChain.name : 'Select Network'}
                </span>
              )}
              <IconChevronDown className="h-[24px] w-[24px] text-[#1c1c26]" />
            </button>

            {showNetworkDropdown && !loadingChains && (
              <div className="absolute z-10 mt-2 w-full rounded-[16px] border border-[#d9d9db] bg-white shadow-lg">
                {chains.map(chain => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => {
                      setSelectedChainId(chain.id)
                      setShowNetworkDropdown(false)
                    }}
                    className="flex w-full items-center gap-[8px] px-[16px] py-[12px] text-left text-[16px] leading-[24px] text-[#1c1c26] hover:bg-[#f5f5f5] first:rounded-t-[16px] last:rounded-b-[16px]"
                  >
                    {chain.iconUrl && (
                      <img src={chain.iconUrl} alt={chain.name} className="h-[20px] w-[20px] rounded-full" />
                    )}
                    {chain.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Safe 钱包地址 */}
        <div className="flex flex-col gap-[8px]">
          <label htmlFor="safeAddress" className="text-[16px] leading-[24px] text-[#1c1c26]">
            Safe Wallet Address
          </label>
          <div className="flex h-[56px] items-center justify-between overflow-hidden rounded-[16px] bg-[#f5f5f5] px-[16px]">
            <input
              id="safeAddress"
              type="text"
              value={safeAddress}
              onChange={e => setSafeAddress(e.target.value)}
              placeholder="Enter Safe Wallet Address"
              className="flex-1 bg-transparent text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#bbbbbe] focus:outline-none"
            />
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-[12px] sm:flex-row">
          {/* <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
          >
            <IconArrowLeft className="h-[24px] w-[24px]" />
            <span>Back</span>
          </button> */}

          <button
            type="button"
            onClick={onComplete}
            disabled={isSubmitting}
            className="flex items-center justify-center rounded-full border border-[#5e85ee] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#5e85ee] transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            Skip
          </button>

          <button
            type="submit"
            disabled={!selectedChain || !safeAddress.trim() || isSubmitting}
            className="flex flex-1 items-center justify-center rounded-full bg-[#5e85ee] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Binding...' : 'Create Organization'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
