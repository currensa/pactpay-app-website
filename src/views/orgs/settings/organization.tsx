import api from '@/apis'
import { Organization } from '@/apis/orgnization.api'
import { useToast } from '@/components/ui/use-toast'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { PaymentConfigFields } from '@/views/orgs/components/payment-config-fields'
import { Check, Loader2, Upload, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OrganizationSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fetchChainAssets = useChainAssetStore(s => s.fetchChainAssets)
  const chainAssets = useChainAssetStore(s => s.chainAssets)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPayroll, setSavingPayroll] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [nameError, setNameError] = useState(false)

  const [existingReferralCode, setExistingReferralCode] = useState<string | null>(null)
  const [referralCodeInput, setReferralCodeInput] = useState('')
  const [savingReferralCode, setSavingReferralCode] = useState(false)

  const [selectedChainId, setSelectedChainId] = useState('')
  const [selectedToken, setSelectedToken] = useState('')

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
      const [orgData, payrollData] = await Promise.all([
        api.organization.getOrganizationDetail(),
        api.organization.getOrgPayrollConfig(),
        fetchChainAssets(),
      ])
      const org: Organization = typeof orgData === 'string' ? JSON.parse(orgData) : orgData
      setOrgName(org.orgName || '')
      setDescription(org.desc || '')
      if (org.logoUrl) {
        setLogoPreview(org.logoUrl)
        setLogoUrl(org.logoUrl)
      }
      setExistingReferralCode(org.referralCode ?? null)
      setSelectedChainId(payrollData?.caipChainId ?? '')
      setSelectedToken(payrollData?.token ?? '')
    } catch {
      // request interceptor handles API errors
    } finally {
      setLoading(false)
    }
  }

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

    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)

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
      // request interceptor handles API errors
    } finally {
      setSaving(false)
    }
  }

  const handleBindReferralCode = async () => {
    if (!referralCodeInput.trim()) return
    try {
      setSavingReferralCode(true)
      const updated = await api.organization.bindReferralCode(referralCodeInput.trim())
      setExistingReferralCode(updated.referralCode ?? null)
      setReferralCodeInput('')
      toast({ title: 'Success', description: 'Referral code applied.' })
    } catch {
      // request interceptor handles API errors
    } finally {
      setSavingReferralCode(false)
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
      await fetchPayrollTokenSymbol()
      toast({ title: 'Success', description: 'Payment settings updated.' })
    } catch {
      // request interceptor handles API errors
    } finally {
      setSavingPayroll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[13px] text-[#8d8d93]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Organization Settings
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Logo</p>
            <div className="flex items-start gap-[14px]">
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
                  Recommended: square image, at least 200x200 px. PNG or JPG.
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

          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Description</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your organization..."
              className="w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none resize-none h-[80px]"
            />
          </div>

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

      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Referral Code
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Referral Code</p>
            {existingReferralCode ? (
              <div className="flex items-center gap-[10px]">
                <div className="flex-1 bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] font-mono select-all">
                  {existingReferralCode}
                </div>
                <div className="flex items-center gap-[6px] rounded-[10px] bg-[rgba(93,221,34,0.12)] px-[10px] py-[6px]">
                  <Check className="h-[13px] w-[13px] text-[#5ddd22] shrink-0" />
                  <span className="text-[12px] leading-[18px] text-[#5ddd22] font-medium">Applied</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-[8px]">
                <input
                  value={referralCodeInput}
                  onChange={e => setReferralCodeInput(e.target.value)}
                  placeholder="Enter referral code"
                  className="flex-1 bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
                />
                <button
                  onClick={handleBindReferralCode}
                  disabled={savingReferralCode || !referralCodeInput.trim()}
                  className="rounded-[12px] bg-[#5e85ee] px-[16px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
                >
                  {savingReferralCode ? 'Applying...' : 'Apply'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          Payment
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">
          <PaymentConfigFields
            chainAssets={chainAssets}
            selectedChainId={selectedChainId}
            selectedToken={selectedToken}
            onSelectedChainIdChange={setSelectedChainId}
            onSelectedTokenChange={setSelectedToken}
            networkLabelExtra={
              <a href="/testing.html" target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#5e85ee] hover:underline">
                New to PactPay? Test on Sepolia first
              </a>
            }
            dropdownPlacement="top"
            className="max-w-[620px]"
          />

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
