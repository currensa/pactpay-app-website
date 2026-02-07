import api from '@/apis'
import { Organization, OrganizationMember } from '@/apis/orgnization.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  IconArrowRight,
  IconBuildingSkyscraper,
  IconCalendar,
  IconCheck,
  IconLoader2,
  IconPlus,
  IconUsersGroup
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface OrganizationResponseItem {
  organization: Organization
  member: OrganizationMember
}

export default function Identity() {
  const [organizations, setOrganizations] = useState<OrganizationResponseItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await api.organization.getOrganizations()
      console.log('Loaded organizations:', data)
      console.log('Organizations count:', data?.length)
      setOrganizations(data || [])
    } catch (error) {
      console.error('Failed to load organizations:', error)
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  const checkIdentities = (member: OrganizationMember) => {
    const roles = member.roles.map(r => r.role)
    const isManager = roles.includes('Admin') || roles.includes('Operator')
    const isEmployee = roles.includes('Member')
    return { isManager, isEmployee }
  }

  // Step 2: Navigate to org dashboard (no wallet gating)
  const navigateToOrgDashboard = (item: OrganizationResponseItem) => {
    // Update localStorage with organization ID
    localStorage.setItem('organizationId', item.organization.orgId)
    navigate('/orgs/dashboard', { replace: true })
  }

  const navigateToMemberDashboard = (item: OrganizationResponseItem) => {
    // Update localStorage with organization ID
    localStorage.setItem('organizationId', item.organization.orgId)
    navigate('/member/overview', { replace: true })
  }

  const handleCreateOrganization = () => {
    navigate('/account/organization/create')
  }

  const handleJoinOrganization = () => {
    navigate('/account/organization/join')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Step 1: If user has exactly one organization, automatically proceed to step 2
  useEffect(() => {
    if (organizations.length === 1 && !loading) {
      const item = organizations[0]
      const { isManager, isEmployee } = checkIdentities(item.member)

      // If user has both roles, don't auto-redirect, let them choose
      if (isManager && isEmployee) {
        return
      }

      if (isManager) {
        navigateToOrgDashboard(item)
      } else if (isEmployee) {
        navigateToMemberDashboard(item)
      }
    }
  }, [organizations, loading, navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="text-muted-foreground size-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If user has exactly one organization, show loading while redirecting
  // BUT only if we are actually redirecting (not both roles)
  if (organizations.length === 1) {
    const { isManager, isEmployee } = checkIdentities(organizations[0].member)
    if (!(isManager && isEmployee)) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <IconLoader2 className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground">Redirecting...</p>
          </div>
        </div>
      )
    }
  }

  // If user has multiple organizations, show selection interface
  if (organizations.length >= 1) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Select Organization</h1>
            <p className="text-muted-foreground mt-2 text-sm">Choose which organization to manage</p>
          </div>

          {/* Organization Cards */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map(item => {
              const { isManager, isEmployee } = checkIdentities(item.member)
              return (
                <Card
                  key={item.organization.orgId}
                  className="group hover:border-primary transition-all hover:shadow-md flex flex-col"
                >
                  <CardHeader className="pb-3">
                    <div className="bg-primary/10 mb-3 flex size-10 items-center justify-center rounded-lg">
                      <IconBuildingSkyscraper className="text-primary size-5" />
                    </div>
                    <CardTitle className="text-lg">{item.organization.orgName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 flex-1">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <IconCalendar className="size-3.5" />
                      <span>Last payment: {item.member.updatedAt ? formatDate(item.member.updatedAt) : 'N/A'}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <IconUsersGroup className="size-3.5" />
                      <span>Member</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-2">
                    {isManager && (
                      <Button
                        variant="default"
                        className="w-full justify-between"
                        onClick={() => navigateToOrgDashboard(item)}
                      >
                        Manage Organization
                        <IconArrowRight className="size-4" />
                      </Button>
                    )}
                    {isEmployee && (
                      <Button
                        variant={isManager ? 'outline' : 'default'}
                        className="w-full justify-between"
                        onClick={() => navigateToMemberDashboard(item)}
                      >
                        Enter Workspace
                        <IconArrowRight className="size-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}

            {/* Create Organization Card */}
            <Card
              className="group hover:border-primary cursor-pointer border-dashed transition-all hover:shadow-md flex flex-col justify-center"
              onClick={handleCreateOrganization}
            >
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="bg-muted mb-3 flex size-10 items-center justify-center rounded-lg">
                  <IconPlus className="text-muted-foreground size-5" />
                </div>
                <CardTitle className="mb-1 text-lg">Create Organization</CardTitle>
                <CardDescription className="text-center text-xs">Set up a new organization to manage</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Logo and Title */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-3">
            <div className="bg-primary flex size-12 items-center justify-center rounded-xl">
              <IconBuildingSkyscraper className="text-primary-foreground size-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">PactPay</h1>
          </div>
          <h2 className="text-foreground text-2xl font-semibold">How do you want to use PactPay?</h2>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Organization Card */}
          <Card className="group transition-all hover:border-orange-500 hover:shadow-lg">
            <CardHeader>
              <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-xl">
              <IconBuildingSkyscraper className="text-primary size-8" />
              </div>
              <CardTitle className="text-xl">I manage an organization</CardTitle>
              <CardDescription className="text-base">
                Create and manage an organization, set up payment plans, and pay contractors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleCreateOrganization} className="w-full" size="lg">
                Create Organization
                <IconArrowRight className="ml-2 size-4" />
              </Button>

              <Separator />

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <IconCheck className="size-3 text-orange-500/70" />
                  </div>
                  <span className="text-muted-foreground text-sm">Set up automated payment plans</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <IconCheck className="size-3 text-orange-500/70" />
                  </div>
                  <span className="text-muted-foreground text-sm">Manage team members and permissions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <IconCheck className="size-3 text-orange-500/70" />
                  </div>
                  <span className="text-muted-foreground text-sm">Track payments and analytics</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Join Organization Card */}
          <Card className="group transition-all hover:border-orange-500 hover:shadow-lg">
            <CardHeader>
              <div className="bg-primary/10 mb-4 flex size-16 items-center justify-center rounded-xl">
                <IconUsersGroup className="text-primary size-8" />
              </div>
              <CardTitle className="text-xl">I'm a member</CardTitle>
              <CardDescription className="text-base">
                Join an organization to receive payments and view transaction history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleJoinOrganization} className="w-full" size="lg">
                Join Organization
                <IconArrowRight className="ml-2 size-4" />
              </Button>

              <Separator />

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <IconCheck className="size-3 text-orange-500/70" />
                  </div>
                  <span className="text-muted-foreground text-sm">Receive instant payments</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <IconCheck className="size-3 text-orange-500/70" />
                  </div>
                  <span className="text-muted-foreground text-sm">View complete transaction history</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <IconCheck className="size-3 text-orange-500/70" />
                  </div>
                  <span className="text-muted-foreground text-sm">Join multiple organizations</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <p className="text-muted-foreground mt-8 text-center text-sm">
          You can always switch between these modes later in your account settings
        </p>
      </div>
    </div>
  )
}
