import api from '@/apis'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreateOrganization() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleBack = () => {
    navigate(-1)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const org = await api.organization.createOrganization({
        orgName: name.trim(),
        website: website.trim() || undefined,
        desc: description.trim() || undefined
      })

      localStorage.setItem('organizationId', org.orgId)

      // Navigate to connect Safe Wallet page with organization ID
      // navigate('/account/organization/connect-safe')
      navigate('/orgs/dashboard')
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Create Organization</h1>
          <p className="text-muted-foreground mt-1 text-sm">Provide your organization's basic information</p>
        </div>

        {/* Basic Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide your organization's basic details</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSubmit(e)
              }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-3">
                <Label htmlFor="name">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter organization name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your organization"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between gap-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <IconArrowLeft className="mr-2 size-4" />
            Back
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim() || isCreating} size="lg">
            {isCreating ? 'Creating...' : 'Next'}
            <IconArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
