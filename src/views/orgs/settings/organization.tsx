import api from '@/apis'
import { ChainAssetResponse } from '@/apis/chain-asset.api'
import { Organization, OrgPayrollConfig } from '@/apis/orgnization.api'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import { Check, ChevronDown, Loader2, Upload, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OrganizationSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fetchChainAssets = useChainAssetStore(s => s.fetchChainAssets)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPayroll, setSavingPayroll] = useState(false)

  // Org form state
  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [nameError, setNameError] = useState(false)

  // Payroll config state
  const [payrollConfig, setPayrollConfig] = useState<OrgPayrollConfig | null>(null)
  const [chainAssets, setChainAssets] = useState<ChainAssetResponse['data']>([])
  const [selectedChainId, setSelectedChainId] = useState('')
  const [selectedToken, setSelectedToken] = useState('')
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false)
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false)
  const chainDropdownRef = useRef<HTMLDivElement>(null)
  const tokenDropdownRef = useRef<HTMLDivElement>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const organizationId = localStorage.getItem('organizationId')

  useEffect(() => {
    if (!organizationId) {
      navigate('/welcome', { replace: true })
      return
    }
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [orgData, payrollData, chainAssetData] = await Promise.all([
        api.organization.getOrganizationDetail(),
        api.organization.getOrgPayrollConfig(),
        fetchChainAssets(),
      ])
      const org: Organization = typeof orgData === 'string' ? JSON.parse(orgData) : orgData
      setOrgName(org.orgName || '')
      setDescription(org.desc || '')
      if (org.logoUrl) { setLogoPreview(org.logoUrl); setLogoUrl(org.logoUrl) }
      setChainAssets(chainAssetData)
      if (payrollData) {
        setPayrollConfig(payrollData)
        setSelectedChainId(payrollData.caipChainId)
        setSelectedToken(payrollData.token)
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load organization data.' })
    } finally {
      setLoading(false)
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(e.target as Node)) setChainDropdownOpen(false)
      if (tokenDropdownRef.current && !tokenDropdownRef.current.contains(e.target as Node)) setTokenDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Error', description: 'Image must be under 2 MB.' })
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please upload a PNG or JPG file.' })
      return
    }
    // 本地预览
    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
    // 上传到 COS
    setLogoUploading(true)
    try {
      const url = await api.storage.uploadFile(file)
      setLogoUrl(url)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload logo. Please try again.' })
      setLogoPreview(null)
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveOrg = async () => {
    if (!orgName.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    try {
      setSaving(true)
      await api.organization.uploadOrganizationDetail({ orgName, desc: description, logoUrl: logoUrl ?? undefined })
      toast({ title: 'Success', description: 'Organization info updated.' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save organization info.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSavePayroll = async () => {
    if (!selectedChainId || !selectedToken) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a chain and token.' })
      return
    }
    try {
      setSavingPayroll(true)
      await api.organization.upsertOrgPayrollConfig({ caipChainId: selectedChainId, token: selectedToken })
      toast({ title: 'Success', description: 'Payment settings updated.' })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save payment settings.' })
    } finally {
      setSavingPayroll(false)
    }
  }

  // Derive unique chains
  const chains = Array.from(
    new Map(chainAssets.map(item => [item.chain.caipChainId, item.chain])).values()
  )
  const selectedChain = chains.find(c => c.caipChainId === selectedChainId)

  // Filter assets by selected chain
  const assetsForChain = chainAssets.filter(item => item.chain.caipChainId === selectedChainId)
    .filter(item => item.asset.isStable)
  const selectedAsset = assetsForChain.find(
    a => (a.contractAddress || a.asset.symbol) === selectedToken
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[13px] text-[#8d8d93]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px]">

      {/* ── Organization Settings ─────────────────────────────────────── */}
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Organization Settings
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">

          {/* Organization Logo */}
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Logo</p>
            <div className="flex items-start gap-[14px]">
              {/* Logo preview */}
              <div
                className="w-[100px] h-[100px] rounded-[14px] overflow-hidden bg-[#1c1c26] shrink-0 flex items-center justify-center cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[28px] font-semibold select-none">
                    {orgName?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              {/* Upload controls */}
              <div className="flex flex-col gap-[8px]">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors w-fit disabled:opacity-60"
                >
                  {logoUploading
                    ? <Loader2 className="h-[14px] w-[14px] animate-spin" />
                    : <Upload className="h-[14px] w-[14px]" />
                  }
                  {logoUploading ? 'Uploading...' : 'Upload New Logo'}
                </button>
                <p className="text-[12px] leading-[18px] text-[#bbbbbe]">
                  Recommended: square image, at least 200×200 px. PNG or JPG.
                </p>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>

          {/* Organization Name */}
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Name *</p>
            <div className="flex flex-col gap-[4px]">
              <input
                value={orgName}
                onChange={e => { setOrgName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
                placeholder="e.g. Engineering Team"
                className="w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
              />
              {nameError && (
                <div className="flex items-center gap-[4px]">
                  <XCircle className="h-[14px] w-[14px] text-[#d92b2b] shrink-0" />
                  <p className="text-[12px] leading-[20px] text-[#d92b2b]">Please enter organization name</p>
                </div>
              )}
            </div>
          </div>

          {/* Organization Description */}
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Description</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your organization..."
              className="w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none resize-none h-[80px]"
            />
          </div>

          {/* Save button */}
          <div className="flex justify-end max-w-[620px]">
            <button
              onClick={handleSaveOrg}
              disabled={saving || logoUploading}
              className="rounded-[12px] bg-[#5e85ee] px-[16px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Payment
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">

          {/* Chain */}
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Chain *</p>
            <div className="relative" ref={chainDropdownRef}>
              <button
                onClick={() => { setChainDropdownOpen(v => !v); setTokenDropdownOpen(false) }}
                className="w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] flex items-center justify-between text-[13px] leading-[20px] text-[#1c1c26]"
              >
                {selectedChain ? (
                  <div className="flex items-center gap-[8px]">
                    {selectedChain.iconUrl && (
                      <img src={selectedChain.iconUrl} alt={selectedChain.name} className="w-[18px] h-[18px] rounded-full shrink-0" />
                    )}
                    <span>{selectedChain.name}</span>
                  </div>
                ) : (
                  <span className="text-[#bbbbbe]">Select a chain</span>
                )}
                <ChevronDown className={`h-[16px] w-[16px] text-[#606067] shrink-0 transition-transform ${chainDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {chainDropdownOpen && chains.length > 0 && (
                <div className="absolute left-0 bottom-full mb-[4px] w-full z-20 bg-white rounded-[16px] border border-[rgba(0,0,0,0.12)] shadow-lg overflow-hidden">
                  {chains.map(chain => (
                    <button
                      key={chain.caipChainId}
                      onClick={() => { setSelectedChainId(chain.caipChainId); setSelectedToken(''); setChainDropdownOpen(false) }}
                      className="w-full flex items-center justify-between px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                    >
                      <div className="flex items-center gap-[8px]">
                        {chain.iconUrl && (
                          <img src={chain.iconUrl} alt={chain.name} className="w-[18px] h-[18px] rounded-full shrink-0" />
                        )}
                        <span>{chain.name}</span>
                      </div>
                      {selectedChainId === chain.caipChainId && (
                        <Check className="h-[14px] w-[14px] text-[#5e85ee] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pay token type */}
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Pay token type *</p>
            <div className="relative" ref={tokenDropdownRef}>
              <button
                onClick={() => { if (selectedChainId) { setTokenDropdownOpen(v => !v); setChainDropdownOpen(false) } }}
                className={`w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] flex items-center justify-between text-[13px] leading-[20px] ${!selectedChainId ? 'opacity-50 cursor-not-allowed' : 'text-[#1c1c26]'}`}
              >
                {selectedAsset ? (
                  <div className="flex items-center gap-[8px]">
                    {selectedAsset.asset.iconUrl && (
                      <img src={selectedAsset.asset.iconUrl} alt={selectedAsset.asset.symbol} className="w-[18px] h-[18px] rounded-full shrink-0" />
                    )}
                    <span>{selectedAsset.asset.symbol}</span>
                  </div>
                ) : (
                  <span className="text-[#bbbbbe]">{selectedChainId ? 'Select a token' : 'Select a chain first'}</span>
                )}
                <ChevronDown className={`h-[16px] w-[16px] text-[#606067] shrink-0 transition-transform ${tokenDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {tokenDropdownOpen && assetsForChain.length > 0 && (
                <div className="absolute left-0 bottom-full mb-[4px] w-full z-20 bg-white rounded-[16px] border border-[rgba(0,0,0,0.12)] shadow-lg overflow-hidden">
                  {assetsForChain.map(item => {
                    const tokenValue = item.contractAddress || item.asset.symbol
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedToken(tokenValue); setTokenDropdownOpen(false) }}
                        className="w-full flex items-center justify-between px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                      >
                        <div className="flex items-center gap-[8px]">
                          {item.asset.iconUrl && (
                            <img src={item.asset.iconUrl} alt={item.asset.symbol} className="w-[18px] h-[18px] rounded-full shrink-0" />
                          )}
                          <span>{item.asset.symbol}</span>
                          {item.isNative && <span className="text-[11px] text-[#8d8d93]">(Native)</span>}
                        </div>
                        {selectedToken === tokenValue && (
                          <Check className="h-[14px] w-[14px] text-[#5e85ee] shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end max-w-[620px]">
            <button
              onClick={handleSavePayroll}
              disabled={savingPayroll}
              className="rounded-[12px] bg-[#5e85ee] px-[16px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {savingPayroll ? 'Saving...' : 'Save Payment Settings'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
