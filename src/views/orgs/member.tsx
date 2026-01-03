import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

  const pageSize = 20
  const currentUserRole: MemberRole = 'Admin' // TODO: 从 context 获取

  // 模拟数据
  useEffect(() => {
    // TODO: 替换为实际 API 调用
    setTimeout(() => {
      setMembers([
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          receivingWallet: '0x1234567890abcdef1234567890abcdef12345678',
          network: 'Ethereum Mainnet',
          role: 'Member',
          serviceFee: 5000,
          status: 'Active',
          lastPayment: '2024-01-15',
          joinDate: '2024-01-01',
        },
        {
          id: '2',
          name: 'Bob Smith',
          email: 'bob@example.com',
          receivingWallet: null,
          network: 'Ethereum Mainnet',
          role: 'Member',
          serviceFee: 3000,
          status: 'Pending',
          lastPayment: null,
          joinDate: '2024-01-10',
        },
        {
          id: '3',
          name: 'Charlie Brown',
          email: 'charlie@example.com',
          receivingWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
          network: 'Ethereum Mainnet',
          role: 'Operator',
          serviceFee: 8000,
          status: 'Active',
          lastPayment: '2024-01-14',
          joinDate: '2023-12-15',
        },
      ])
      setLoading(false)
    }, 1000)
  }, [])

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
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          (m.receivingWallet?.toLowerCase().includes(query) ?? false)
      )
    }

    // 角色过滤
    if (roleFilter !== 'All') {
      result = result.filter((m) => m.role === roleFilter)
    }

    // 状态过滤
    if (statusFilter !== 'All') {
      result = result.filter((m) => m.status === statusFilter)
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
  const paginatedMembers = filteredAndSortedMembers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

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
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: 'Active' as MemberStatus } : m))
    )
    toast({
      title: 'Success',
      description: 'Member approved successfully.',
    })
  }

  // 处理拒绝
  const handleReject = async (memberId: string) => {
    // TODO: API 调用
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    toast({
      title: 'Success',
      description: 'Member rejected. Notification sent.',
    })
  }

  // 处理删除
  const handleRemove = async (memberId: string) => {
    // TODO: API 调用
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: 'Inactive' as MemberStatus } : m))
    )
    setDrawerOpen(false)
    toast({
      title: 'Success',
      description: 'Member removed successfully.',
    })
  }

  // 导出列表
  const handleExport = () => {
    // TODO: 实现导出逻辑
    toast({
      title: 'Success',
      description: 'Member list exported successfully.',
    })
  }

  // 保存 Drawer 修改
  const handleSaveChanges = async () => {
    if (!selectedMember) return

    // TODO: API 调用
    setMembers((prev) =>
      prev.map((m) =>
        m.id === selectedMember.id
          ? {
            ...m,
            receivingWallet: drawerChanges.receivingWallet ?? m.receivingWallet,
            serviceFee: drawerChanges.serviceFee ?? m.serviceFee,
            role: drawerChanges.role ?? m.role,
          }
          : m
      )
    )

    toast({
      title: 'Success',
      description: 'Member information updated successfully!',
    })

    setDrawerChanges({})
    setDrawerOpen(false)
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

  // 发送邮箱邀请
  const handleSendEmailInvites = async () => {
    if (!emailInvites.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter valid email addresses',
        variant: 'destructive',
      })
      return
    }

    // TODO: API 调用
    toast({
      title: 'Success',
      description: `Invitations sent to ${emailInvites.split(',').length} recipient(s)!`,
    })
    setEmailInvites('')
  }

  // 重新生成邀请码
  const handleRegenerateInvite = async () => {
    // TODO: API 调用
    setInviteCode('ORG-NEW-' + Math.random().toString(36).substring(2, 8).toUpperCase())
    setInviteLink('https://pactpay.com/join/eng-team/inv-' + Math.random().toString(36).substring(2, 10))
    toast({
      title: 'Success',
      description: 'Organization invitation regenerated successfully',
    })
  }

  // 请求地址
  const handleRequestAddress = async (memberId: string) => {
    // TODO: API 调用
    toast({
      title: 'Success',
      description: 'Reminder sent to member.',
    })
  }

  // 内联编辑 Service Fee
  const handleEditServiceFee = (member: Member, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: 'Error',
        description: 'Service Fee must be a positive number',
        variant: 'destructive',
      })
      return
    }

    // TODO: API 调用
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, serviceFee: numValue } : m))
    )
    toast({
      title: 'Success',
      description: `Service Fee updated to ${numValue} USDC`,
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">Organization Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your team members, permissions, and invitations
        </p>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button
            onClick={() => setInviteSectionOpen(!inviteSectionOpen)}
            className="w-[160px] justify-center"
          >
            {inviteSectionOpen ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Hide
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Invite Members
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 邀请模块 */}
      {inviteSectionOpen && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invite Members</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setInviteSectionOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 组织邀请 */}
              <div className="space-y-4">
                <Label className="text-xs uppercase text-muted-foreground">
                  ORGANIZATION INVITATION
                </Label>
                <div className="space-y-2">
                  <Input
                    value={inviteCode}
                    readOnly
                    className="select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Input
                    value={inviteLink}
                    readOnly
                    className="select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <Button variant="outline" onClick={handleRegenerateInvite}>
                  Regenerate
                </Button>
              </div>

              {/* 邮箱邀请 */}
              <div className="space-y-4">
                <Label className="text-xs uppercase text-muted-foreground">
                  EMAIL INVITATION
                </Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter emails (comma-separated)"
                  value={emailInvites}
                  onChange={(e) => setEmailInvites(e.target.value)}
                />
                <Button onClick={handleSendEmailInvites}>
                  Send Invitations
                </Button>
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
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                    {sortField !== 'name' && (
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    )}
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
                        {roleFilter !== 'All' && (
                          <span className="ml-2 text-xs">✓</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setRoleFilter('All')}>
                        All Roles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleFilter('Admin')}>
                        Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleFilter('Operator')}>
                        Operator
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleFilter('Member')}>
                        Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('serviceFee')}
                >
                  <div className="flex items-center gap-2">
                    Service Fee
                    {sortField === 'serviceFee' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                    {sortField !== 'serviceFee' && (
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 px-2">
                        Status
                        {statusFilter !== 'All' && (
                          <span className="ml-2 text-xs">✓</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setStatusFilter('All')}>
                        All Statuses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('Active')}>
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('Pending')}>
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('Inactive')}>
                        Inactive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('lastPayment')}
                >
                  <div className="flex items-center gap-2">
                    Last Payment
                    {sortField === 'lastPayment' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                    {sortField !== 'lastPayment' && (
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-12 w-12 text-muted-foreground" />
                      <p className="font-medium">No members found</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => openMemberDrawer(member)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.name[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.receivingWallet ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm">
                            {formatAddress(member.receivingWallet)}
                          </span>
                          <Check className="h-3 w-3 text-green-500" />
                        </div>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={(e) => {
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
                          member.role === 'Admin'
                            ? 'default'
                            : member.role === 'Operator'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="group relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <span>{member.serviceFee.toLocaleString()} USDC</span>
                        <Edit2
                          className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            handleEditServiceFee(member, editingValue)
                            setEditingField(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditServiceFee(member, editingValue)
                              setEditingField(null)
                            } else if (e.key === 'Escape') {
                              setEditingField(null)
                            }
                          }}
                          className="w-24 h-8"
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
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="space-x-2"
                    >
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
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredAndSortedMembers.length)} of{' '}
            {filteredAndSortedMembers.length} members
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-medium">
                          {selectedMember.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <DrawerTitle>{selectedMember.name}</DrawerTitle>
                        <Badge className="mt-1">{selectedMember.role}</Badge>
                      </div>
                    </div>
                  </div>
                </DrawerHeader>

                <div className="px-4 pb-4 space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-xs uppercase text-muted-foreground mb-4">
                      BASIC INFORMATION
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="mt-1">{selectedMember.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Receiving Wallet Address
                        </Label>
                        <Input
                          value={
                            drawerChanges.receivingWallet !== undefined
                              ? drawerChanges.receivingWallet
                              : selectedMember.receivingWallet || ''
                          }
                          onChange={(e) =>
                            setDrawerChanges({
                              ...drawerChanges,
                              receivingWallet: e.target.value,
                            })
                          }
                          placeholder="0x..."
                          className="mt-1 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Service Fee</Label>
                        <Input
                          type="number"
                          value={
                            drawerChanges.serviceFee !== undefined
                              ? drawerChanges.serviceFee
                              : selectedMember.serviceFee
                          }
                          onChange={(e) =>
                            setDrawerChanges({
                              ...drawerChanges,
                              serviceFee: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      {selectedMember.status === 'Active' &&
                        selectedMember.role !== 'Admin' &&
                        currentUserRole === 'Admin' && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Role</Label>
                            <Select
                              value={drawerChanges.role || selectedMember.role}
                              onValueChange={(value: MemberRole) =>
                                setDrawerChanges({ ...drawerChanges, role: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Member">Member</SelectItem>
                                <SelectItem value="Operator">Operator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Network</Label>
                        <p className="mt-1">{selectedMember.network}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <Badge className="mt-1">{selectedMember.status}</Badge>
                      </div>
                      {selectedMember.status === 'Active' &&
                        selectedMember.role !== 'Admin' &&
                        (currentUserRole === 'Admin' ||
                          (currentUserRole === 'Operator' && selectedMember.role === 'Member')) && (
                          <div>
                            <Button
                              variant="link"
                              className="text-destructive p-0 h-auto"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Are you sure you want to remove ${selectedMember.name}? They will no longer receive payments from this organization.`
                                  )
                                ) {
                                  handleRemove(selectedMember.id)
                                }
                              }}
                            >
                              Remove Member
                            </Button>
                          </div>
                        )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Join Date</Label>
                        <p className="mt-1">{selectedMember.joinDate}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Statistics */}
                  <div>
                    <h3 className="text-xs uppercase text-muted-foreground mb-4">
                      PAYMENT STATISTICS
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Received</span>
                        <span className="font-medium">$25,000 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Payment Date</span>
                        <span className="font-medium">
                          {selectedMember.lastPayment || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Payment Count</span>
                        <span className="font-medium">5 payments</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Activity Log */}
                  <div>
                    <h3 className="text-xs uppercase text-muted-foreground mb-4">
                      ACTIVITY LOG
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">2024-01-15 10:30</p>
                        <p className="text-sm">Received payment: 5000 USDC</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">2024-01-01 09:00</p>
                        <p className="text-sm">Joined organization</p>
                      </div>
                    </div>
                  </div>
                </div>

                <DrawerFooter>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={!hasUnsavedChanges}
                    className="w-full"
                  >
                    Confirm Changes
                  </Button>
                </DrawerFooter>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

