import api from '@/apis'
import { Organization } from '@/apis/orgnization.api'
import { ImageCropUpload } from '@/components/app/image-crop-upload'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ERC20_ABI } from '@/lib/gravarc/gravarcAbi'
import { readPayrollWalletBalance } from '@/lib/gravarc/payrollWalletBalance'
import { openWalletModal } from '@/providers/app-kit-provider'
import useChainAssetStore from '@/stores/chain-asset'
import useOrganizationStore from '@/stores/organization'
import { useTranslation } from '@/utils/i18n'
import { ApiKeySection } from '@/views/orgs/components/api-key-section'
import { PaymentConfigFields } from '@/views/orgs/components/payment-config-fields'
import { BookOpen, Check, Copy, XCircle } from 'lucide-react'
import { useAppKitAccount } from '@reown/appkit/react'
import { getPublicClient } from '@wagmi/core'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatUnits, type Hex } from 'viem'
import { useConfig } from 'wagmi'

const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000'

export default function OrganizationSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const fetchChainAssets = useChainAssetStore(s => s.fetchChainAssets)
  const chainAssets = useChainAssetStore(s => s.chainAssets)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)
  const { address, isConnected } = useAppKitAccount()
  const wagmiConfig = useConfig()

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
  const [balanceChainId, setBalanceChainId] = useState('')
  const [balanceToken, setBalanceToken] = useState('')
  const [walletBalance, setWalletBalance] = useState<{
    key: string
    status: 'loading' | 'loaded' | 'unavailable'
    amount?: bigint
  } | null>(null)

  const selectedBalanceAsset = chainAssets.find(asset =>
    asset.caipChainId === balanceChainId &&
    (asset.contractAddress ?? NATIVE_TOKEN).toLowerCase() === balanceToken.toLowerCase()
  )
  const balanceKey = `${balanceChainId}:${balanceToken.toLowerCase()}:${address?.toLowerCase() ?? ''}`
  const currentWalletBalance = walletBalance?.key === balanceKey ? walletBalance : null

  const organizationId = localStorage.getItem('organizationId')
  const mcpRepositoryUrl = 'https://github.com/currensa/pact-privacy-mcp/tree/zk-prod'
  const mcpInstallCommand = `git clone --branch zk-prod --single-branch https://github.com/currensa/pact-privacy-mcp.git
cd pact-privacy-mcp
npm install
npm run build`

  useEffect(() => {
    if (!organizationId) {
      navigate('/welcome', { replace: true })
      return
    }
    loadData()
  }, [organizationId])

  useEffect(() => {
    if (!selectedBalanceAsset || !balanceChainId || !isConnected || !address) return
    let cancelled = false
    setWalletBalance({ key: balanceKey, status: 'loading' })

    const fetchBalance = async () => {
      try {
        const client = getPublicClient(wagmiConfig, { chainId: Number(balanceChainId.split(':')[1]) })
        if (!client) throw new Error('Wallet network is unavailable')
        const amount = await readPayrollWalletBalance(
          selectedBalanceAsset,
          address,
          wallet => client.getBalance({ address: wallet as Hex }),
          (token, wallet) => client.readContract({
            address: token as Hex,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [wallet as Hex],
          }),
        )
        if (!cancelled) setWalletBalance({ key: balanceKey, status: 'loaded', amount })
      } catch {
        if (!cancelled) setWalletBalance({ key: balanceKey, status: 'unavailable' })
      }
    }

    void fetchBalance()
    return () => { cancelled = true }
  }, [address, balanceChainId, balanceKey, isConnected, selectedBalanceAsset, wagmiConfig])

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

  const handleLogoCropped = async (file: File, previewUrl: string) => {
    const previousPreview = logoPreview
    setLogoUploading(true)
    try {
      setLogoPreview(previewUrl)
      const url = await api.storage.uploadFile(file)
      setLogoUrl(url)
    } catch {
      toast({ variant: 'destructive', title: t('common.error'), description: t('pages.orgSettings.uploadLogoFailed') })
      setLogoPreview(previousPreview)
    } finally {
      setLogoUploading(false)
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
      toast({ title: t('pages.orgMembers.success'), description: t('pages.orgSettings.organizationUpdated') })
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
      toast({ title: t('pages.orgMembers.success'), description: t('pages.orgSettings.referralCodeApplied') })
    } catch {
      // request interceptor handles API errors
    } finally {
      setSavingReferralCode(false)
    }
  }

  const handleSavePayroll = async () => {
    if (!selectedChainId || !selectedToken) {
      toast({ variant: 'destructive', title: t('common.error'), description: t('pages.orgSettings.selectChainAndToken') })
      return
    }
    try {
      setSavingPayroll(true)
      await api.organization.upsertOrgPayrollConfig({ caipChainId: selectedChainId, token: selectedToken })
      await fetchPayrollTokenSymbol()
      toast({ title: t('pages.orgMembers.success'), description: t('pages.orgSettings.paymentSettingsUpdated') })
    } catch {
      // request interceptor handles API errors
    } finally {
      setSavingPayroll(false)
    }
  }

  const handleCopyMcpCommand = async () => {
    try {
      await navigator.clipboard.writeText(mcpInstallCommand)
      toast({ title: t('pages.orgMembers.success'), description: t('pages.orgSettings.commandCopied') })
    } catch {
      toast({ variant: 'destructive', title: t('common.error'), description: t('pages.orgSettings.failedCopyCommand') })
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[13px] text-[#8d8d93]">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          {t('pages.orgSettings.organizationSettings')}
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{t('pages.orgSettings.organizationLogo')}</p>
            <ImageCropUpload
              imageUrl={logoPreview}
              alt={orgName || 'Organization logo'}
              fallback={orgName?.[0]?.toUpperCase() || '?'}
              variant="logo"
              actionLabel={logoUploading ? t('pages.orgSettings.uploading') : t('pages.orgSettings.uploadNewLogo')}
              helperText={t('pages.orgSettings.logoHint')}
              uploading={logoUploading}
              acceptedMimeTypes={['image/png', 'image/jpeg']}
              previewWrapperClassName="h-[100px] w-[100px]"
              onValidationError={kind => {
                const description = kind === 'size' ? t('pages.orgSettings.imageUnder2Mb') : t('pages.orgSettings.uploadPngOrJpg')
                toast({ variant: 'destructive', title: t('common.error'), description })
              }}
              onCropped={({ file, previewUrl }) => void handleLogoCropped(file, previewUrl)}
            />
          </div>

          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{t('pages.orgSettings.organizationName')}</p>
            <div className="flex flex-col gap-[4px]">
              <input
                value={orgName}
                onChange={e => { setOrgName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
                placeholder={t('pages.orgSettings.organizationNamePlaceholder')}
                className="w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
              />
              {nameError && (
                <div className="flex items-center gap-[4px]">
                  <XCircle className="h-[14px] w-[14px] text-[#d92b2b] shrink-0" />
                  <p className="text-[12px] leading-[20px] text-[#d92b2b]">{t('pages.orgSettings.organizationNameRequired')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{t('pages.orgSettings.organizationDescription')}</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('pages.orgSettings.organizationDescriptionPlaceholder')}
              className="w-full bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none resize-none h-[80px]"
            />
          </div>

          <div className="flex justify-end max-w-[620px]">
            <button
              onClick={handleSaveOrg}
              disabled={saving || logoUploading}
              className="rounded-[12px] bg-[#5e85ee] px-[16px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? t('pages.orgSettings.saving') : t('pages.orgSettings.saveChanges')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          {t('pages.orgSettings.referralCode')}
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{t('pages.orgSettings.referralCode')}</p>
            {existingReferralCode ? (
              <div className="flex items-center gap-[10px]">
                <div className="flex-1 bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] font-mono select-all">
                  {existingReferralCode}
                </div>
                <div className="flex items-center gap-[6px] rounded-[10px] bg-[rgba(93,221,34,0.12)] px-[10px] py-[6px]">
                  <Check className="h-[13px] w-[13px] text-[#5ddd22] shrink-0" />
                  <span className="text-[12px] leading-[18px] text-[#5ddd22] font-medium">{t('pages.orgSettings.applied')}</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-[8px]">
                <input
                  value={referralCodeInput}
                  onChange={e => setReferralCodeInput(e.target.value)}
                  placeholder={t('pages.orgSettings.referralCodePlaceholder')}
                  className="flex-1 bg-[#f5f5f5] rounded-[12px] px-[14px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
                />
                <button
                  onClick={handleBindReferralCode}
                  disabled={savingReferralCode || !referralCodeInput.trim()}
                  className="rounded-[12px] bg-[#5e85ee] px-[16px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
                >
                  {savingReferralCode ? t('pages.orgSettings.applying') : t('pages.orgSettings.apply')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          {t('pages.orgSettings.payment')}
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[20px]">
          <PaymentConfigFields
            chainAssets={chainAssets}
            selectedChainId={selectedChainId}
            selectedToken={selectedToken}
            onSelectedChainIdChange={setSelectedChainId}
            onSelectedTokenChange={setSelectedToken}
            networkLabelExtra={
              <a href="/testing" target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#5e85ee] hover:underline">
                {t('pages.orgSettings.testOnSepolia')}
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
              {savingPayroll ? t('pages.orgSettings.saving') : t('pages.orgSettings.savePaymentSettings')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          {t('pages.orgSettings.walletBalances')}
        </p>

        <div className="flex flex-col gap-[16px] rounded-[32px] bg-white p-[20px]">
          <p className="max-w-[620px] text-[13px] leading-[20px] text-[#8d8d93]">
            {t('pages.orgSettings.walletBalancesDescription')}
          </p>
          <PaymentConfigFields
            chainAssets={chainAssets}
            selectedChainId={balanceChainId}
            selectedToken={balanceToken}
            onSelectedChainIdChange={setBalanceChainId}
            onSelectedTokenChange={setBalanceToken}
            tokenLabel={t('pages.orgSettings.balanceToken')}
            dropdownPlacement="top"
            className="max-w-[620px]"
          />

          {selectedBalanceAsset && (
            <div className="flex max-w-[620px] flex-col gap-[10px] rounded-[16px] bg-[#f5f5f5] px-[16px] py-[14px]">
              <span aria-live="polite" className="text-[13px] text-[#1c1c26]">
                {t('pages.createTransactionSelector.walletBalance')}: {' '}
                {!isConnected || !address
                  ? t('pages.createTransactionSelector.connectWalletForBalance')
                  : currentWalletBalance?.status === 'loaded' && currentWalletBalance.amount !== undefined
                    ? `${formatUnits(currentWalletBalance.amount, selectedBalanceAsset.decimals)} ${selectedBalanceAsset.asset.symbol}`
                    : currentWalletBalance?.status === 'unavailable'
                      ? t('pages.createTransactionSelector.balanceUnavailable')
                      : t('common.loading')}
              </span>
              {!isConnected && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void openWalletModal(Number(balanceChainId.split(':')[1])).catch(() => {
                    setWalletBalance({ key: balanceKey, status: 'unavailable' })
                  })}
                >
                  {t('pages.transactions.connectWallet')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[26px] text-[#1c1c26]">
          {t('pages.orgSettings.mcp')}
        </p>

        <div className="bg-white rounded-[32px] p-[20px] flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[4px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{t('pages.orgSettings.mcpConnectTitle')}</p>
            <p className="text-[13px] leading-[20px] text-[#8d8d93]">
              {t('pages.orgSettings.mcpConnectDescription')}
            </p>
            <a
              href={mcpRepositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[13px] leading-[20px] text-[#5e85ee] hover:underline"
            >
              {mcpRepositoryUrl}
            </a>
          </div>

          <div className="flex flex-col gap-[8px] max-w-[620px]">
            <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">{t('pages.orgSettings.mcpInstallCommand')}</p>
            <div className="flex flex-col overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-[#f5f5f5] md:flex-row">
              <div className="min-w-0 flex-1 px-[14px] py-[10px]">
                <pre className="overflow-x-auto whitespace-pre text-[13px] leading-[20px] text-[#1c1c26]">
                  <code>{mcpInstallCommand}</code>
                </pre>
              </div>
              <div className="border-t border-[rgba(0,0,0,0.08)] md:border-l md:border-t-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopyMcpCommand()}
                className="h-full w-full rounded-none px-[12px] text-[13px] text-[#606067] hover:bg-[#ebebef] md:min-w-[110px]"
              >
                <Copy className="h-[14px] w-[14px]" />
                  {t('pages.orgSettings.copyCommand')}
                </Button>
              </div>
            </div>

            <a
              href={mcpRepositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[8px] text-[13px] leading-[20px] text-[#5e85ee] hover:underline"
            >
              <BookOpen className="h-[16px] w-[16px]" />
              {t('pages.orgSettings.readDocumentation')}
            </a>
          </div>
        </div>
      </div>

      <ApiKeySection />
    </div>
  )
}
