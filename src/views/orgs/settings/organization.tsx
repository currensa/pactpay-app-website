import api from '@/apis'
import { Organization } from '@/apis/orgnization.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { IconFileText, IconUpload } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OrganizationSettings() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

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
      const orgData = await api.organization.getOrganizationDetail()

      // Parse organization data (API returns string, need to parse)
      const org: Organization = typeof orgData === 'string' ? JSON.parse(orgData) : orgData
      setOrganization(org)
      setOrgName(org.orgName || '')
      setDescription(org.desc || '')
      setWebsite(org.website || '')
      if (org.logoUrl) {
        setLogoPreview(org.logoUrl)
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
    </div>
  )
}
