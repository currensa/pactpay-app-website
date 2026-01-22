import api from '@/apis'
import type { Chain } from '@/apis/orgnization.api'
import { Organization, PaymentAccount } from '@/apis/orgnization.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SafeWalletSetupDialog, type SafeWalletSetupMode } from '@/views/orgs/components/safe-wallet/safe-wallet-setup-dialog'
import { IconAlertTriangle, IconExternalLink, IconFileText, IconShield, IconUpload } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const navigate = useNavigate()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Safe Wallet info
  const [safeWallet, setSafeWallet] = useState<PaymentAccount | null>(null)
  const [networkName, setNetworkName] = useState<string>('')
  const [chains, setChains] = useState<Chain[]>([])
  const [canManageSafeWallet, setCanManageSafeWallet] = useState(false)
  const [safeWalletDialogOpen, setSafeWalletDialogOpen] = useState(false)
  const [safeWalletDialogMode, setSafeWalletDialogMode] = useState<SafeWalletSetupMode>('bind')

  const organizationId = localStorage.getItem('organizationId')

  useEffect(() => {
    if (!organizationId) {
      navigate('/account/identity', { replace: true })
      return
    }
    loadData()
  }, [organizationId, navigate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [orgData, chainsData, orgsData] = await Promise.all([
        api.organization.getOrganizationDetail(),
        api.chainAsset.getChains(),
        api.organization.getOrganizations()
      ])

      // Parse organization data (API returns string, need to parse)
      const org: Organization = typeof orgData === 'string' ? JSON.parse(orgData) : orgData
      setOrganization(org)
      setOrgName(org.orgName || '')
      setDescription(org.description || '')
      setWebsite((org as any).website || '')
      setChains(chainsData || [])

      // Find Safe Wallet
      const safeAccount = org.paymentAccounts?.find(account => account.type === 'safe')
      if (safeAccount) {
        setSafeWallet(safeAccount)
        // Find network name from chains
        const network = chainsData.find(
          chain =>
            chain.caipChainId === safeAccount.config.network ||
            chain.chainId === safeAccount.config.network ||
            chain.id === safeAccount.config.network
        )
        setNetworkName(network?.name || safeAccount.config.network || 'Unknown Network')
      } else {
        setSafeWallet(null)
        setNetworkName('')
      }

      // Determine permission (Owner / Pay Admin) based on current organization membership
      const currentOrgId = org.orgId || organizationId
      const currentItem = (orgsData || []).find((item: any) => item?.organization?.orgId === currentOrgId)
      const roles: string[] = currentItem?.member?.roles?.map((r: any) => r.role) || []
      // Map: Admin = Owner, Operator = Pay Admin
      setCanManageSafeWallet(roles.includes('Admin') || roles.includes('Operator'))
    } catch (error) {
      console.error('Failed to load organization data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('文件大小不能超过 2MB')
        return
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件（PNG 或 JPG）')
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
      alert('组织名称是必填项')
      return
    }

    try {
      setSaving(true)
      // TODO: Implement update organization API
      // await api.organization.updateOrganization({
      //   orgName,
      //   description,
      //   website,
      //   logo: logoFile
      // })
      console.log('Saving organization:', { orgName, description, website, logoFile })
      alert('保存成功')
    } catch (error) {
      console.error('Failed to save organization:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleChangeSafeWallet = () => {
    setSafeWalletDialogMode('bind')
    setSafeWalletDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Organization Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Manage your organization's basic information and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Organization Logo</Label>
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
          <div className="space-y-2">
            <Label htmlFor="org-name">
              Organization Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Acme Corporation"
            />
            <p className="text-muted-foreground text-xs">
              This name will be displayed to all members and in invitations
            </p>
          </div>

          {/* Organization Description */}
          <div className="space-y-2">
            <Label htmlFor="org-description">Organization Description</Label>
            <Textarea
              id="org-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Building the future of blockchain payments"
              rows={3}
            />
          </div>

          {/* Organization Website */}
          <div className="space-y-2">
            <Label htmlFor="org-website">Organization Website</Label>
            <Input
              id="org-website"
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://acme.com"
            />
            <p className="text-muted-foreground text-xs">Optional: Your organization's website URL</p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveChanges} disabled={saving}>
              {saving ? '保存中...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Safe Wallet Section */}
      <Card>
        <CardHeader>
          <CardTitle>Safe Wallet</CardTitle>
          <CardDescription>Manage your organization's multi-signature wallet address and network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {safeWallet ? (
            <>
              <div className="space-y-2">
                <Label>Current Safe Wallet</Label>
                <div className="bg-muted/50 rounded-lg border p-4">
                  <div className="text-lg font-semibold">{safeWallet.config.address}</div>
                  <div className="text-muted-foreground mt-1 text-sm">{networkName}</div>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
                <div className="flex gap-3">
                  <IconAlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-600 dark:text-yellow-500" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-semibold">Important:</span> Changing your Safe Wallet address requires
                    verification through signature. Make sure you have access to the Safe Wallet you want to connect.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleChangeSafeWallet}>Change Safe Wallet</Button>
                <a
                  href="https://safe.global/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                >
                  Learn about Safe Wallet Multi-sig
                  <IconExternalLink className="size-4" />
                </a>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="text-muted-foreground">No Safe Wallet connected. Please connect a Safe Wallet first.</div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setSafeWalletDialogMode('create')
                    setSafeWalletDialogOpen(true)
                  }}
                >
                  Create Safe Wallet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSafeWalletDialogMode('bind')
                    setSafeWalletDialogOpen(true)
                  }}
                >
                  Verify & Connect
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {organizationId && (
        <SafeWalletSetupDialog
          open={safeWalletDialogOpen}
          mode={safeWalletDialogMode}
          onModeChange={setSafeWalletDialogMode}
          onOpenChange={setSafeWalletDialogOpen}
          organizationId={organizationId}
          chains={chains}
          canManage={canManageSafeWallet}
          onSuccess={loadData}
        />
      )}

      {/* Legal Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Documents</CardTitle>
          <CardDescription>Review our privacy policy and terms of service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Privacy Policy Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="bg-primary/10 text-primary border-primary flex size-12 shrink-0 items-center justify-center rounded-lg border-2">
                    <IconShield className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Privacy Policy</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Learn how we collect, use, and protect your personal information and data.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Download PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    View Online
                    <IconExternalLink className="ml-2 size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Terms of Service Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="bg-primary/10 text-primary border-primary flex size-12 shrink-0 items-center justify-center rounded-lg border-2">
                    <IconFileText className="size-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Terms of Service</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Review our terms of service, user responsibilities, and limitation of liability.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Download PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    View Online
                    <IconExternalLink className="ml-2 size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
