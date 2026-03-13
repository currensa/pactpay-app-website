import apis from '@/apis'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { IconUser } from '@tabler/icons-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function EmployeeOrgsDetail() {
  const location = useLocation()
  const { orgName = '', orgId = '', memberId = '' } = location.state || {}
  const { toast } = useToast()

  const [showName, setShowName] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!orgId || !memberId) {
      toast({ description: 'Organization or member info missing.', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await apis.organization.updateMemberProfile(orgId, memberId, {
        showName: showName || undefined,
        avatarUrl: avatarUrl || undefined,
      })
      toast({ title: 'Saved', description: 'Your profile has been updated.' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update profile.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{orgName || 'Organization'}</h1>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconUser className="h-5 w-5 text-primary" />
            <CardTitle>My Profile in this Organization</CardTitle>
          </div>
          <CardDescription>
            Update the display name and avatar that other members see for you in this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="show-name">Display Name</Label>
            <Input
              id="show-name"
              placeholder="Your display name"
              value={showName}
              onChange={e => setShowName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url">Avatar URL</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={showName} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {showName ? showName[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <Input
                id="avatar-url"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || (!showName && !avatarUrl)}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
