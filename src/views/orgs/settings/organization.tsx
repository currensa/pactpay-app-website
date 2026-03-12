import api from '@/apis'
import { Organization, OrgPayrollConfig } from '@/apis/orgnization.api'
import { ChainAssetResponse } from '@/apis/chain-asset.api'
import useChainAssetStore from '@/stores/chain-asset'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { IconFileText, IconUpload } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OrganizationSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fetchChainAssets = useChainAssetStore(s => s.fetchChainAssets)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPayroll, setSavingPayroll] = useState(false)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Payroll config state
  const [payrollConfig, setPayrollConfig] = useState<OrgPayrollConfig | null>(null)
  const [chainAssets, setChainAssets] = useState<ChainAssetResponse['data']>([])
  const [selectedChainId, setSelectedChainId] = useState('')
  const [selectedToken, setSelectedToken] = useState('')

  const organizationId = localStorage.getItem('organizationId')

  useEffect(() => {
    if (!organizationId) {
      navigate('/account/login', { replace: true })
      return
    }
    loadData()
  }, [organizationId, navigate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [orgData, payrollData, chainAssetData] = await Promise.all([
        api.organization.getOrganizationDetail(),
        api.organization.getOrgPayrollConfig(),
        fetchChainAssets(),
      ])

      // Parse organization data (API returns string, need to parse)
      const org: Organization = typeof orgData === 'string' ? JSON.parse(orgData) : orgData
      setOrganization(org)
      setOrgName(org.orgName || '')
      setDescription(org.desc || '')
      setWebsite(org.website || '')
      if (org.logoUrl) {
        setLogoPreview(org.logoUrl)
      }

      setChainAssets(chainAssetData)

      if (payrollData) {
        setPayrollConfig(payrollData)
        setSelectedChainId(payrollData.caipChainId)
        setSelectedToken(payrollData.token)
      }
    } catch (error) {
      console.error('Failed to load organization data:', error)
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: '无法加载组织信息，请稍后重试'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: '文件过大',
          description: '图片大小不能超过 2MB'
        })
        return
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: '文件类型错误',
          description: '请上传图片文件 (PNG 或 JPG)'
        })
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveChanges = async () => {
    if (!orgName.trim()) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '组织名称不能为空'
      })
      return
    }

    try {
      setSaving(true)
      
      await api.organization.uploadOrganizationDetail({
        orgName,
        desc: description,
        website,
        // logoUrl is not handled yet as we don't have an upload API
      })

      toast({
        title: '保存成功',
        description: '组织信息已更新'
      })
      
      // Refresh data
      loadData()
    } catch (error) {
      console.error('Failed to save organization:', error)
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: '更新组织信息时出错，请稍后重试'
      })
    } finally {
      setSaving(false)
    }
  }

  // Derive unique chains from chainAssets
  const chains = Array.from(
    new Map(chainAssets.map(item => [item.chain.caipChainId ?? item.chain.chainId, item.chain])).values()
  )

  // Filter assets by selected chain
  const assetsForChain = chainAssets.filter(
    item => (item.chain.caipChainId ?? item.chain.chainId) === selectedChainId
  )

  const handleSavePayrollConfig = async () => {
    if (!selectedChainId || !selectedToken) {
      toast({
        variant: 'destructive',
        title: '验证失败',
        description: '请选择链和Token'
      })
      return
    }
    try {
      setSavingPayroll(true)
      await api.organization.upsertOrgPayrollConfig({ caipChainId: selectedChainId, token: selectedToken })
      toast({ title: '保存成功', description: '发薪货币配置已更新' })
    } catch (error) {
      console.error('Failed to save payroll config:', error)
      toast({ variant: 'destructive', title: '保存失败', description: '更新发薪配置时出错，请稍后重试' })
    } finally {
      setSavingPayroll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Manage your organization's basic information and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="mb-2 block">Organization Logo</Label>
            <div className="flex items-start gap-4">
              <div className="border-muted-foreground/25 bg-muted/50 flex size-24 items-center justify-center rounded-lg border-2 border-dashed">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="size-full rounded-lg object-cover" />
                ) : organization?.orgName ? (
                  <div className="text-muted-foreground flex size-full items-center justify-center text-2xl font-semibold">
                    {organization.orgName.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <IconFileText className="text-muted-foreground size-8" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()} asChild>
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <IconUpload className="mr-2 size-4" />
                    Upload New Logo
                  </label>
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <p className="text-muted-foreground text-xs">Recommended: 200x200px, PNG or JPG, max 2MB</p>
              </div>
            </div>
          </div>

          {/* Organization Name */}
          <div className="space-y-3">
            <Label htmlFor="org-name" className="mb-2 block">
              Organization Name <span className="text-destructive">*</span>
            </Label>
            <div>
              <Input
                id="org-name"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corporation"
              />
              <p className="text-muted-foreground mt-2 text-xs">
                This name will be displayed to all members and in invitations
              </p>
            </div>
          </div>

          {/* Organization Description */}
          <div className="space-y-3">
            <Label htmlFor="org-description" className="mb-2 block">Organization Description</Label>
            <Textarea
              id="org-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Building the future of blockchain payments"
              rows={3}
            />
          </div>

          {/* Organization Website */}
          <div className="space-y-3">
            <Label htmlFor="org-website" className="mb-2 block">Organization Website</Label>
            <div>
              <Input
                id="org-website"
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://acme.com"
              />
              <p className="text-muted-foreground mt-2 text-xs">Optional: Your organization's website URL</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={saving}>
              {saving ? '保存中...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Payroll Currency Config */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Currency</CardTitle>
          <CardDescription>Set the default chain and token used for payroll payouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chain Select */}
          <div className="space-y-2">
            <Label>Chain</Label>
            <Select
              value={selectedChainId}
              onValueChange={val => {
                setSelectedChainId(val)
                setSelectedToken('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a chain" />
              </SelectTrigger>
              <SelectContent>
                {chains.map(chain => (
                  <SelectItem key={chain.caipChainId ?? chain.chainId} value={chain.caipChainId ?? chain.chainId}>
                    <div className="flex items-center gap-2">
                      {chain.iconUrl && <img src={chain.iconUrl} alt={chain.name} className="size-4 rounded-full" />}
                      {chain.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asset/Token Select */}
          <div className="space-y-2">
            <Label>Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken} disabled={!selectedChainId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedChainId ? 'Select a token' : 'Select a chain first'} />
              </SelectTrigger>
              <SelectContent>
                {assetsForChain.map(item => (
                  <SelectItem key={item.id} value={item.contractAddress || item.asset.symbol}>
                    <div className="flex items-center gap-2">
                      {item.asset.iconUrl && (
                        <img src={item.asset.iconUrl} alt={item.asset.symbol} className="size-4 rounded-full" />
                      )}
                      {item.asset.symbol}
                      {item.isNative && (
                        <span className="text-muted-foreground text-xs">(Native)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {payrollConfig && (
              <p className="text-muted-foreground text-xs">
                Current: {payrollConfig.caipChainId} / {payrollConfig.token}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePayrollConfig} disabled={savingPayroll}>
              {savingPayroll ? '保存中...' : 'Save Payroll Config'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
