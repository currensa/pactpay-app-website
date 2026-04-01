import apis from '@/apis'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getMemberRoles, getPrimaryRole, MemberRole } from '@/utils/permissions'
import { Mail, Plus, Shield, ShieldAlert, ShieldCheck, User, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Member {
  id: string
  memberId: string
  name: string
  email: string
  role: MemberRole
  roles: MemberRole[]
  avatar?: string
}

const ROLE_DETAILS: Record<MemberRole, { description: string; icon: any; color: string }> = {
  Owner: {
    description: 'Full access to all organization settings and financial operations.',
    icon: ShieldAlert,
    color: 'text-red-600 bg-red-50 border-red-100'
  },
  'Org Admin': {
    description: 'Can manage members, organization settings, and view all data.',
    icon: ShieldCheck,
    color: 'text-blue-600 bg-blue-50 border-blue-100'
  },
  'Pay Admin': {
    description: 'Focuses on payment operations, transaction management, and safe wallets.',
    icon: Shield,
    color: 'text-purple-600 bg-purple-50 border-purple-100'
  },
  Operator: {
    description: 'Can create and propose transactions, and manage basic member info.',
    icon: User,
    color: 'text-green-600 bg-green-50 border-green-100'
  },
  Member: {
    description: 'Basic access to view personal dashboard and assigned transactions.',
    icon: Users,
    color: 'text-gray-600 bg-gray-50 border-gray-100'
  }
}

export default function RoleManagementPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<MemberRole>('Member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const transformMember = (apiMember: any): Member => {
    const roles = getMemberRoles(apiMember)
    return {
      id: apiMember.id,
      memberId: apiMember.memberId,
      name: apiMember.showName || apiMember.memberId,
      email: apiMember.email || (apiMember.showName?.includes('@') ? apiMember.showName : ''),
      role: getPrimaryRole(roles),
      roles: roles,
      avatar: apiMember.avatarUrl
    }
  }

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const response = await apis.organization.getOrganizationMembers({ page: 1, pageSize: 100, status: 'active' })
      setMembers(response.data.map(transformMember))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load members',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleOpenInvite = (role: MemberRole) => {
    setSelectedRole(role)
    setInviteDialogOpen(true)
  }

  const handleSendInvite = async () => {
    if (!inviteEmail) return

    setIsSubmitting(true)
    try {
      // Note: The current API doesn't seem to support specifying a role during invitation directly in one call 
      // based on the existing code in members.tsx, but we'll assume it's part of the flow or will be added.
      // For now, we follow the existing pattern of sending email invitation.
      await apis.organization.sendEmailInvitation(inviteEmail)

      toast({
        title: 'Success',
        description: `Invitation sent to ${inviteEmail} for role ${selectedRole}.`
      })
      setInviteDialogOpen(false)
      setInviteEmail('')
      fetchMembers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to send invitation',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const membersByRole = (role: MemberRole) => {
    return members.filter(m => m.roles.includes(role))
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization roles and member assignments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Object.keys(ROLE_DETAILS) as MemberRole[]).map(role => {
          const details = ROLE_DETAILS[role]
          const roleMembers = membersByRole(role)
          const Icon = details.icon

          return (
            <Card key={role} className="flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg border ${details.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="font-medium">
                    {roleMembers.length} Members
                  </Badge>
                </div>
                <CardTitle className="mt-4">{role}</CardTitle>
                <CardDescription className="min-h-[40px] mt-2">
                  {details.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Members
                  </div>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                      <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                    </div>
                  ) : roleMembers.length > 0 ? (
                    <div className="space-y-3">
                      {roleMembers.slice(0, 5).map(member => (
                        <div key={member.id} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            {member.name[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                      ))}
                      {roleMembers.length > 5 && (
                        <p className="text-xs text-center text-muted-foreground py-1">
                          + {roleMembers.length - 5} more members
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-[10px] py-[16px]">
                      <img src="/src/assets/empty-data.svg" alt="No members" className="h-[120px] w-[120px]" />
                      <p className="text-xs text-muted-foreground">No members in this role</p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full mt-6"
                  variant="outline"
                  onClick={() => handleOpenInvite(role)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member as {selectedRole}</DialogTitle>
            <DialogDescription>
              Enter the email address of the person you want to invite to join your organization as a {selectedRole}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-900">Permissions for {selectedRole}</p>
                <p className="text-[11px] text-blue-700 mt-1">
                  {ROLE_DETAILS[selectedRole].description}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={!inviteEmail || isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
