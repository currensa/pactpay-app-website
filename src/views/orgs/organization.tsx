import apis from '@/apis'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Check, ChevronDown, ChevronsUpDown, ChevronUp, Download, Edit2, Plus, Search, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

// 类型定义
type MemberRole = 'Admin' | 'Operator' | 'Member'
type MemberStatus = 'Active' | 'Pending' | 'Inactive'
type SortField = 'name' | 'serviceFee' | 'lastPayment' | null
type SortDirection = 'asc' | 'desc' | null

interface Member {
  id: string
  memberId: string
  name: string
  email: string
  receivingWallet: string | null
  network: string
  role: MemberRole
  serviceFee: number
  status: MemberStatus
  lastPayment: string | null
  joinDate: string
  avatar?: string
}

interface DrawerChanges {
  receivingWallet?: string
  serviceFee?: number
  role?: MemberRole
}

export default function MemberPage() {
  const { toast } = useToast()

  // 状态管理
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'All'>('All')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerChanges, setDrawerChanges] = useState<DrawerChanges>({})
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('ORG-A3K9-7B2M')
  const [inviteLink, setInviteLink] = useState('https://pactpay.com/join/eng-team/inv-x9k2...')
  const [emailInvites, setEmailInvites] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [emailInviteDialogOpen, setEmailInviteDialogOpen] = useState(false)
  const [pendingEmails, setPendingEmails] = useState<string[]>([])
  const [sendingInvites, setSendingInvites] = useState(false)
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)

  const pageSize = 20
  const currentUserRole: MemberRole = 'Admin' // TODO: 从 context 获取
  const [organizationId, setOrganizationId] = useState<string>('')

  // 将 API 返回的成员数据转换为组件使用的格式
  const transformMember = (apiMember: any): Member => {
    const primaryRole = apiMember.roles?.[0]?.role || 'Member'
    const receivingAccount = apiMember.receivingAccounts?.[0]
    const payoutIntent = apiMember.payoutIntent

    return {
      id: apiMember.id,
      memberId: apiMember.memberId,
      name: apiMember.showName || apiMember.memberId,
      email: apiMember.showName?.includes('@') ? apiMember.showName : '',
      receivingWallet: receivingAccount?.address || null,
      network: receivingAccount?.network || payoutIntent?.network || 'Ethereum Mainnet',
      role: primaryRole as MemberRole,
      serviceFee: payoutIntent ? parseFloat(payoutIntent.amount) : 0,
      status: apiMember.status === 'active' ? 'Active' : apiMember.status === 'pending' ? 'Pending' : 'Inactive',
      lastPayment: apiMember.lastPayment || null,
      joinDate: apiMember.createdAt ? new Date(apiMember.createdAt).toISOString().split('T')[0] : '',
      avatar: apiMember.avatarUrl || undefined
    }
  }

  // 获取组织列表
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true)
        const organizations = await apis.org.getMyOrganizations()

        if (organizations && Array.isArray(organizations) && organizations.length > 0) {
          // 使用第一个组织作为当前组织
          setOrganizationId(organizations[0].id)
        } else {
          // 没有组织，显示提示信息
          toast({
            title: 'No Organizations',
            description: 'You do not have any organizations. Please create one first.',
            variant: 'destructive'
          })
          setLoading(false)
        }
      } catch (error: any) {
        console.error('Failed to load organizations:', error)
        toast({
          title: 'Error',
          description: error?.response?.data?.message || error?.message || 'Failed to load organizations',
          variant: 'destructive'
        })
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  // 获取成员列表和邀请码
  useEffect(() => {
    if (!organizationId) return

    const fetchData = async () => {
      try {
        setLoading(true)
        // 获取成员列表
        const membersResponse = await apis.org.getOrganizationMembers(organizationId, currentPage, pageSize)
        const transformedMembers = membersResponse.data.map(transformMember)
        setMembers(transformedMembers)

        // 获取邀请码
        const inviteCodeData = await apis.org.getOrganizationInviteCode(organizationId)
        setInviteCode(inviteCodeData.code)
        // 根据邀请码生成邀请链接
        setInviteLink(`${window.location.origin}/join/${inviteCodeData.code}`)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error?.response?.data?.message || 'Failed to load data',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentPage, organizationId])

  // 搜索防抖
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 过滤和排序
  const filteredAndSortedMembers = useMemo(() => {
    let result = [...members]

    // 搜索过滤
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          (m.receivingWallet?.toLowerCase().includes(query) ?? false)
      )
    }

    // 角色过滤
    if (roleFilter !== 'All') {
      result = result.filter(m => m.role === roleFilter)
    }

    // 状态过滤
    if (statusFilter !== 'All') {
      result = result.filter(m => m.status === statusFilter)
    }

    // 排序
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortField) {
          case 'name':
            aVal = a.name.toLowerCase()
            bVal = b.name.toLowerCase()
            break
          case 'serviceFee':
            aVal = a.serviceFee
            bVal = b.serviceFee
            break
          case 'lastPayment':
            aVal = a.lastPayment || ''
            bVal = b.lastPayment || ''
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [members, debouncedSearch, roleFilter, statusFilter, sortField, sortDirection])

  // 分页
  const totalPages = Math.ceil(filteredAndSortedMembers.length / pageSize)
  const paginatedMembers = filteredAndSortedMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // 处理排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 格式化地址
  const formatAddress = (address: string | null) => {
    if (!address) return null
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 打开详情 Drawer
  const openMemberDrawer = (member: Member) => {
    setSelectedMember(member)
    setDrawerChanges({})
    setDrawerOpen(true)
  }

  // 处理审批
  const handleApprove = async (memberId: string) => {
    // TODO: API 调用
    setMembers(prev => prev.map(m => (m.id === memberId ? { ...m, status: 'Active' as MemberStatus } : m)))
    toast({
      title: 'Success',
      description: 'Member approved successfully.'
    })
  }

  // 处理拒绝
  const handleReject = async (memberId: string) => {
    // TODO: API 调用
    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast({
      title: 'Success',
      description: 'Member rejected. Notification sent.'
    })
  }

  // 处理删除
  const handleRemove = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId)
      if (!member) return

      await apis.org.deleteMember(organizationId, member.memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      setDrawerOpen(false)
      toast({
        title: 'Success',
        description: 'Member removed successfully.'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to remove member',
        variant: 'destructive'
      })
    }
  }

  // 确认删除成员
  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    await handleRemove(memberToRemove.id)
    setRemoveMemberDialogOpen(false)
    setMemberToRemove(null)
  }

  // 导出列表
  const handleExport = () => {
    // TODO: 实现导出逻辑
    toast({
      title: 'Success',
      description: 'Member list exported successfully.'
    })
  }

  // 保存 Drawer 修改
  const handleSaveChanges = async () => {
    if (!selectedMember) return

    try {
      // 更新收款账户地址
      if (
        drawerChanges.receivingWallet !== undefined &&
        drawerChanges.receivingWallet !== selectedMember.receivingWallet
      ) {
        await apis.org.updateMemberAccountAddress(
          organizationId,
          selectedMember.memberId,
          drawerChanges.receivingWallet,
          selectedMember.network
        )
      }

      // 更新支付意向（Service Fee）
      if (drawerChanges.serviceFee !== undefined && drawerChanges.serviceFee !== selectedMember.serviceFee) {
        await apis.org.updateMemberPayoutIntent(
          organizationId,
          selectedMember.memberId,
          drawerChanges.serviceFee.toString(),
          selectedMember.network
        )
      }

      // 更新本地状态
      setMembers(prev =>
        prev.map(m =>
          m.id === selectedMember.id
            ? {
                ...m,
                receivingWallet: drawerChanges.receivingWallet ?? m.receivingWallet,
                serviceFee: drawerChanges.serviceFee ?? m.serviceFee,
                role: drawerChanges.role ?? m.role
              }
            : m
        )
      )

      toast({
        title: 'Success',
        description: 'Member information updated successfully!'
      })

      setDrawerChanges({})
      setDrawerOpen(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update member information',
        variant: 'destructive'
      })
    }
  }

  // 检查是否有未保存的修改
  const hasUnsavedChanges = Object.keys(drawerChanges).length > 0

  // 关闭 Drawer 前检查
  const handleDrawerClose = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      // TODO: 显示确认对话框
      if (window.confirm('You have unsaved changes. Do you want to discard them?')) {
        setDrawerOpen(false)
        setDrawerChanges({})
      }
    } else {
      setDrawerOpen(open)
    }
  }

  // 邮箱格式校验
  const validateEmails = (emailString: string): { valid: boolean; emails: string[] } => {
    if (!emailString.trim()) {
      return { valid: false, emails: [] }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emails = emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    if (emails.length === 0) {
      return { valid: false, emails: [] }
    }

    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return { valid: false, emails: [] }
    }

    return { valid: true, emails }
  }

  // 发送邮箱邀请 - 校验并打开确认对话框
  const handleSendEmailInvites = () => {
    const validation = validateEmails(emailInvites)

    if (!validation.valid) {
      toast({
        title: 'Error',
        description: 'Please enter valid email addresses',
        variant: 'destructive'
      })
      return
    }

    // 校验通过，显示确认对话框
    setPendingEmails(validation.emails)
    setEmailInviteDialogOpen(true)
  }

  // 确认发送邮箱邀请
  const handleConfirmSendInvites = async () => {
    setSendingInvites(true)

    try {
      // 逐个发送邀请邮件
      const results = await Promise.allSettled(
        pendingEmails.map(email => apis.org.sendEmailInvitation(organizationId, email))
      )

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Invitation emails sent successfully to ${successCount} recipient(s)${failCount > 0 ? `, ${failCount} failed` : ''}`
        })
        setEmailInvites('')
        setEmailInviteDialogOpen(false)
        setPendingEmails([])
        // 刷新成员列表
        const membersResponse = await apis.org.getOrganizationMembers(organizationId, currentPage, pageSize)
        const transformedMembers = membersResponse.data.map(transformMember)
        setMembers(transformedMembers)
      } else {
        throw new Error('All invitations failed')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to send invitations. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSendingInvites(false)
    }
  }

  // 打开重新生成确认对话框
  const handleRegenerateInvite = () => {
    setRegenerateDialogOpen(true)
  }

  // 确认重新生成邀请码
  const handleConfirmRegenerate = async () => {
    try {
      const newInviteCode = await apis.org.regenerateOrganizationInviteCode(organizationId)
      setInviteCode(newInviteCode.code)
      setInviteLink(`${window.location.origin}/join/${newInviteCode.code}`)
      setRegenerateDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Organization invitation regenerated successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to regenerate invitation code',
        variant: 'destructive'
      })
    }
  }

  // 请求地址
  const handleRequestAddress = async (_memberId: string) => {
    // TODO: API 调用 - 发送提醒成员填写收款地址的请求
    toast({
      title: 'Success',
      description: 'Reminder sent to member.'
    })
  }

  // 内联编辑 Service Fee
  const handleEditServiceFee = async (member: Member, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: 'Error',
        description: 'Service Fee must be a positive number',
        variant: 'destructive'
      })
      return
    }

    try {
      await apis.org.updateMemberPayoutIntent(organizationId, member.memberId, numValue.toString(), member.network)
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, serviceFee: numValue } : m)))
      toast({
        title: 'Success',
        description: `Service Fee updated to ${numValue} USDC`
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update service fee',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 text-2xl font-bold">Organization Management</div>
      <div className="text-muted-foreground mb-4">Manage your team members, permissions, and invitations</div>
      <div className="rounded-lg bg-white p-4">
        {/* 工具栏 */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="max-w-md flex-1 space-y-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search by name, email, or wallet..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 导出按钮 */}
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export List
            </Button>
            {/* 邀请按钮 */}
            <Button onClick={() => setInviteSectionOpen(!inviteSectionOpen)} className="w-[160px] justify-center">
              {inviteSectionOpen ? (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Members
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 邀请模块 */}
        {inviteSectionOpen && (
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invite Members</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setInviteSectionOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 组织邀请 */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground text-xs uppercase">ORGANIZATION INVITATION</Label>
                  <div className="space-y-2">
                    <Input
                      value={inviteCode}
                      readOnly
                      className="select-all"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <Input
                      value={inviteLink}
                      readOnly
                      className="select-all"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  <Button variant="outline" onClick={handleRegenerateInvite}>
                    Regenerate
                  </Button>
                </div>

                {/* 邮箱邀请 */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground text-xs uppercase">EMAIL INVITATION</Label>
                  <textarea
                    className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter emails (comma-separated)"
                    value={emailInvites}
                    onChange={e => setEmailInvites(e.target.value)}
                  />
                  <Button onClick={handleSendEmailInvites}>Send Invitations</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 成员列表表格 */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hover:bg-muted/50 cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">
                      Name
                      {sortField === 'name' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                      {sortField !== 'name' && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Receiving Wallet</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 px-2">
                          Role
                          {roleFilter !== 'All' && <span className="ml-2 text-xs">✓</span>}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setRoleFilter('All')}>All Roles</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoleFilter('Admin')}>Admin</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoleFilter('Operator')}>Operator</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoleFilter('Member')}>Member</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className="hover:bg-muted/50 cursor-pointer" onClick={() => handleSort('serviceFee')}>
                    <div className="flex items-center gap-2">
                      Service Fee
                      {sortField === 'serviceFee' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                      {sortField !== 'serviceFee' && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 px-2">
                          Status
                          {statusFilter !== 'All' && <span className="ml-2 text-xs">✓</span>}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setStatusFilter('All')}>All Statuses</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('Active')}>Active</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('Pending')}>Pending</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('Inactive')}>Inactive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className="hover:bg-muted/50 cursor-pointer" onClick={() => handleSort('lastPayment')}>
                    <div className="flex items-center gap-2">
                      Last Payment
                      {sortField === 'lastPayment' &&
                        (sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                      {sortField !== 'lastPayment' && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : paginatedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="text-muted-foreground h-12 w-12" />
                        <p className="font-medium">No members found</p>
                        <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMembers.map(member => (
                    <TableRow key={member.id} className="cursor-pointer" onClick={() => openMemberDrawer(member)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                            <span className="text-sm font-medium">{member.name[0].toUpperCase()}</span>
                          </div>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {member.receivingWallet ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-sm">{formatAddress(member.receivingWallet)}</span>
                            <Check className="h-3 w-3 text-green-500" />
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={e => {
                              e.stopPropagation()
                              handleRequestAddress(member.id)
                            }}
                          >
                            Request Address
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>{member.network}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === 'Admin' ? 'default' : member.role === 'Operator' ? 'secondary' : 'outline'
                          }
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="group relative" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span>{member.serviceFee.toLocaleString()} USDC</span>
                          <Edit2
                            className="h-3 w-3 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => {
                              setEditingField(member.id)
                              setEditingValue(member.serviceFee.toString())
                            }}
                          />
                        </div>
                        {editingField === member.id && (
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            onBlur={() => {
                              handleEditServiceFee(member, editingValue)
                              setEditingField(null)
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleEditServiceFee(member, editingValue)
                                setEditingField(null)
                              } else if (e.key === 'Escape') {
                                setEditingField(null)
                              }
                            }}
                            className="h-8 w-24"
                            autoFocus
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.status === 'Active'
                              ? 'default'
                              : member.status === 'Pending'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.lastPayment || '-'}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()} className="space-x-2">
                        {member.status === 'Pending' &&
                          (currentUserRole === 'Admin' || currentUserRole === 'Operator') && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleApprove(member.id)}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleReject(member.id)}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 分页 */}
        {!loading && filteredAndSortedMembers.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredAndSortedMembers.length)} of {filteredAndSortedMembers.length}{' '}
              members
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* 成员详情 Drawer */}
        <Drawer open={drawerOpen} onOpenChange={handleDrawerClose}>
          <DrawerContent className="max-h-[96vh]">
            <div className="overflow-y-auto">
              {selectedMember && (
                <>
                  <DrawerHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                          <span className="text-lg font-medium">{selectedMember.name[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <DrawerTitle>{selectedMember.name}</DrawerTitle>
                          <Badge className="mt-1">{selectedMember.role}</Badge>
                        </div>
                      </div>
                    </div>
                  </DrawerHeader>

                  <div className="space-y-6 px-4 pb-4">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-muted-foreground mb-4 text-xs uppercase">BASIC INFORMATION</h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-muted-foreground text-xs">Email</Label>
                          <p className="mt-1">{selectedMember.email}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Receiving Wallet Address</Label>
                          <Input
                            value={
                              drawerChanges.receivingWallet !== undefined
                                ? drawerChanges.receivingWallet
                                : selectedMember.receivingWallet || ''
                            }
                            onChange={e =>
                              setDrawerChanges({
                                ...drawerChanges,
                                receivingWallet: e.target.value
                              })
                            }
                            placeholder="0x..."
                            className="mt-1 font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Service Fee</Label>
                          <Input
                            type="number"
                            value={
                              drawerChanges.serviceFee !== undefined
                                ? drawerChanges.serviceFee
                                : selectedMember.serviceFee
                            }
                            onChange={e =>
                              setDrawerChanges({
                                ...drawerChanges,
                                serviceFee: parseFloat(e.target.value) || 0
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                        {selectedMember.status === 'Active' &&
                          selectedMember.role !== 'Admin' &&
                          currentUserRole === 'Admin' && (
                            <div>
                              <Label className="text-muted-foreground text-xs">Role</Label>
                              <Select
                                value={drawerChanges.role || selectedMember.role}
                                onValueChange={(value: string) =>
                                  setDrawerChanges({ ...drawerChanges, role: value as MemberRole })
                                }
                              >
                                <SelectTrigger className="mt-1">{/* <SelectValue /> */}</SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Member">Member</SelectItem>
                                  <SelectItem value="Operator">Operator</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        <div>
                          <Label className="text-muted-foreground text-xs">Network</Label>
                          <p className="mt-1">{selectedMember.network}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Status</Label>
                          <Badge className="mt-1">{selectedMember.status}</Badge>
                        </div>
                        {selectedMember.status === 'Active' &&
                          selectedMember.role !== 'Admin' &&
                          (currentUserRole === 'Admin' ||
                            (currentUserRole === 'Operator' && selectedMember.role === 'Member')) && (
                            <div>
                              <Button
                                variant="link"
                                className="text-destructive h-auto p-0"
                                onClick={() => {
                                  setMemberToRemove(selectedMember)
                                  setRemoveMemberDialogOpen(true)
                                }}
                              >
                                Remove Member
                              </Button>
                            </div>
                          )}
                        <div>
                          <Label className="text-muted-foreground text-xs">Join Date</Label>
                          <p className="mt-1">{selectedMember.joinDate}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Payment Statistics */}
                    <div>
                      <h3 className="text-muted-foreground mb-4 text-xs uppercase">PAYMENT STATISTICS</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Total Received</span>
                          <span className="font-medium">$25,000 USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Last Payment Date</span>
                          <span className="font-medium">{selectedMember.lastPayment || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Payment Count</span>
                          <span className="font-medium">5 payments</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Activity Log */}
                    <div>
                      <h3 className="text-muted-foreground mb-4 text-xs uppercase">ACTIVITY LOG</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-muted-foreground text-xs">2024-01-15 10:30</p>
                          <p className="text-sm">Received payment: 5000 USDC</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">2024-01-01 09:00</p>
                          <p className="text-sm">Joined organization</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DrawerFooter>
                    <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges} className="w-full">
                      Confirm Changes
                    </Button>
                  </DrawerFooter>
                </>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* 重新生成邀请码确认对话框 */}
        <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate Organization Invitation</DialogTitle>
              <DialogDescription>
                Are you sure you want to regenerate the organization invitation? The old code and link will no longer
                work.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRegenerate}>
                Regenerate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 邮箱邀请确认对话框 */}
        <Dialog
          open={emailInviteDialogOpen}
          onOpenChange={open => {
            if (!sendingInvites) {
              setEmailInviteDialogOpen(open)
              if (!open) {
                setPendingEmails([])
              }
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Email Invitations</DialogTitle>
              <DialogDescription>
                {sendingInvites ? (
                  <span>Sending invitations...</span>
                ) : (
                  <span>The following email addresses will receive invitation emails:</span>
                )}
              </DialogDescription>
            </DialogHeader>
            {!sendingInvites && (
              <div className="max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {pendingEmails.map((email, index) => (
                    <div key={index} className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2">
                      <span className="text-sm">{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sendingInvites && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                  <p className="text-muted-foreground text-sm">Sending invitations...</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailInviteDialogOpen(false)
                  setPendingEmails([])
                }}
                disabled={sendingInvites}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmSendInvites} disabled={sendingInvites}>
                {sendingInvites ? 'Sending...' : 'Send Invitations'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除成员确认对话框 */}
        <Dialog
          open={removeMemberDialogOpen}
          onOpenChange={open => {
            setRemoveMemberDialogOpen(open)
            if (!open) {
              setMemberToRemove(null)
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Member</DialogTitle>
              <DialogDescription>
                {memberToRemove &&
                  `Are you sure you want to remove ${memberToRemove.name}? They will no longer receive payments from this organization.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRemoveMemberDialogOpen(false)
                  setMemberToRemove(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRemove}>
                Remove Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
