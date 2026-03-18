import apis from '@/apis'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { getMemberStatusDisplayName, memberStatus } from '@/enums/org'
import useOrganizationStore from '@/stores/organization'
import { getMemberRoles, getPrimaryRole, hasPermission, MemberRole, Permission } from '@/utils/permissions'
import type {
  Member,
  SortDirection,
  SortField
} from '@/views/orgs/components/member-detail'
import { MemberDetailContent } from '@/views/orgs/components/member-detail'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Copy, Download, Edit2, Plus, RefreshCw, Search, Send, Upload, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface MemberPageProps {
  showInvite: boolean
}
export default function MemberPage(
  {
    showInvite = true
  }: MemberPageProps
) {
  const { toast } = useToast()

  // 状态管理
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [inited, setInited] = useState(false)
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<memberStatus | 'All'>('All')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('ORG-A3K9-7B2M')
  const [inviteLink, setInviteLink] = useState('https://pactpay.com/join/eng-team/inv-x9k2...')
  const [emailInvites, setEmailInvites] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [emailInviteDialogOpen, setEmailInviteDialogOpen] = useState(false)
  const [pendingEmails, setPendingEmails] = useState<string[]>([])
  const [activeInviteTab, setActiveInviteTab] = useState<'link' | 'email' | 'batch'>('link')
  const [sendingInvites, setSendingInvites] = useState(false)
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)
  const fetchPayrollTokenSymbol = useOrganizationStore(s => s.fetchPayrollTokenSymbol)

  const pageSize = 20
  const currentUserRole: MemberRole[] = ['Owner'] // TODO: 从 context 获取



  // 将 API 返回的成员数据转换为组件使用的格式
  const transformMember = (apiMember: any): Member => {
    const roles = getMemberRoles(apiMember)
    const primaryRole = getPrimaryRole(roles)
    // API 返回 payoutIntents 数组；取第一条（已由后端按组织发薪配置过滤）
    const payoutIntent = apiMember.payoutIntent ?? null

    return {
      id: apiMember.id,
      memberId: apiMember.memberId,
      name: apiMember.showName || '',
      email: apiMember.email || '',
      role: primaryRole,
      roles: roles,
      serviceFee: payoutIntent ? parseFloat(payoutIntent.amount) : 0,
      status: apiMember.status,
      lastPayment: apiMember.lastPayment || null,
      joinDate: apiMember.createdAt ? new Date(apiMember.createdAt).toISOString().split('T')[0] : '',
      avatar: apiMember.avatarUrl || undefined
    }
  }

  // sortField → 后端 sortBy 字段名映射
  const toApiSortBy = (field: SortField): 'showName' | 'amount' | 'status' | 'createdAt' | 'lastPayment' | undefined => {
    if (!field) return undefined
    if (field === 'name') return 'showName'
    if (field === 'serviceFee') return 'amount'
    return field as 'lastPayment'
  }

  // 获取成员列表（服务端 keyword/status/sort/page）
  // isInitial=true 时显示全屏 loading 占位；false 时只降低表格透明度，避免抖动
  const fetchMembers = async (page = currentPage, isInitial = false) => {
    if (!localStorage.getItem('organizationId')) return
    if (isInitial) setLoading(true)
    else setRefreshing(true)
    try {
      const membersResponse = await apis.organization.getOrganizationMembers({
        page,
        pageSize,
        keyword: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        sortBy: toApiSortBy(sortField),
        sortOrder: sortDirection ?? undefined,
      })
      setMembers(membersResponse.data.map(transformMember))
      setTotal(membersResponse.total)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load members',
        variant: 'destructive'
      })
    } finally {
      if (isInitial) setLoading(false)
      else setRefreshing(false)
      setInited(true)
    }
  }

  // 组织初始化：只在组件挂载时执行一次
  useEffect(() => {
    fetchMembers(1, true)
  }, []) // 只在组件挂载时执行一次

  // 搜索防抖
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 过滤条件或页码变化时重新请求（debouncedSearch/statusFilter/sort 变化时重置到第一页）
  useEffect(() => {
    if (!inited) return
    setCurrentPage(1)
    fetchMembers(1)
  }, [debouncedSearch, statusFilter, sortField, sortDirection])

  useEffect(() => {
    if (!inited) return
    fetchMembers(currentPage)
  }, [currentPage])

  // 角色过滤（客户端，仅在当前页数据上过滤）
  const paginatedMembers = useMemo(() => {
    if (roleFilter === 'All') return members
    return members.filter(m => m.role === roleFilter)
  }, [members, roleFilter])

  // 分页
  const totalPages = Math.ceil(total / pageSize)

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
  // 打开详情 Drawer
  const openMemberDrawer = (member: Member) => {
    setSelectedMember(member)
    setDrawerOpen(true)
  }

  // 处理审批
  const handleApprove = async (member: Member) => {
    try {
      await apis.organization.approveInvite(member.memberId)
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, status: memberStatus.ACTIVE } : m)))
      toast({ title: 'Success', description: 'Member approved successfully.' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to approve member.',
        variant: 'destructive'
      })
    }
  }

  // 处理拒绝
  const handleReject = async (member: Member) => {
    try {
      await apis.organization.rejectInvite(member.memberId)
      setMembers(prev => prev.filter(m => m.id !== member.id))
      toast({ title: 'Success', description: 'Member rejected. Notification sent.' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to reject member.',
        variant: 'destructive'
      })
    }
  }

  // 处理删除
  const handleRemove = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId)
      if (!member) return

      await apis.organization.deleteMember(member.memberId)
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

  // 关闭 Drawer
  const handleDrawerClose = (open: boolean) => {
    setDrawerOpen(open)
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
      const results = await Promise.allSettled(pendingEmails.map(email => apis.organization.sendEmailInvitation(email)))

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
        fetchMembers(currentPage)
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
      const newInviteCode = await apis.organization.regenerateOrganizationInviteCode()
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

  // 下载 CSV 模版
  const handleDownloadTemplate = () => {
    const csvContent = 'email\nuser1@example.com\nuser2@example.com'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'pactpay_member_invite_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 触发文件选择
  const handleTriggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  // 处理文件上传解析
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: 'Error',
        description: 'Please upload a CSV file',
        variant: 'destructive'
      })
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const lines = text.split(/\r?\n/)

      // 假设第一行是表头，寻找 email 列
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const emailIndex = headers.indexOf('email')

      if (emailIndex === -1) {
        toast({
          title: 'Error',
          description: 'CSV file must contain an "email" column',
          variant: 'destructive'
        })
        return
      }

      const emails: string[] = []
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',')
        if (row.length > emailIndex) {
          const email = row[emailIndex].trim()
          if (email && emailRegex.test(email)) {
            emails.push(email)
          }
        }
      }

      if (emails.length === 0) {
        toast({
          title: 'Error',
          description: 'No valid email addresses found in the CSV file',
          variant: 'destructive'
        })
        return
      }

      setPendingEmails(emails)
      setEmailInviteDialogOpen(true)

      // 重置 input 以便下次可以上传同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
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
      await apis.organization.updateMemberPayoutIntent(
        member.memberId,
        { amount: numValue.toString() }
      )
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, serviceFee: numValue } : m)))
      toast({
        title: 'Success',
        description: `Service Fee updated to ${numValue}`
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update service fee',
        variant: 'destructive'
      })
    }
  }

  // Helper: status badge
  const StatusBadge = ({ status }: { status: memberStatus }) => {
    if (status === memberStatus.ACTIVE) {
      return (
        <span className="inline-flex items-center rounded-[8px] bg-[rgba(93,221,34,0.12)] px-[7px] py-[2px] text-[12px] leading-[18px] text-[#5ddd22] whitespace-nowrap">
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-[8px] bg-[rgba(255,168,0,0.12)] px-[7px] py-[2px] text-[12px] leading-[18px] text-[#ffa800] whitespace-nowrap">
        {getMemberStatusDisplayName(status)}
      </span>
    )
  }

  // Helper: sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField === field) {
      return sortDirection === 'asc'
        ? <ChevronUp className="h-[14px] w-[14px] text-[#1c1c26]" />
        : <ChevronDown className="h-[14px] w-[14px] text-[#1c1c26]" />
    }
    return <ChevronsUpDown className="h-[14px] w-[14px] text-[#8d8d93]" />
  }

  const ROLES: Array<MemberRole | 'All'> = ['All', 'Owner', 'Admin', 'Operator', 'Employee']
  const STATUSES: Array<memberStatus | 'All'> = ['All', memberStatus.ACTIVE, memberStatus.ACTIVATION, memberStatus.REVIEW]

  return (
    <div className="flex flex-col gap-[16px] h-full bg-white rounded-[32px] p-[20px]">

      {/* ── Invite Members section ─────────────────────────────────────── */}
      {showInvite && inviteSectionOpen && (
        <div className="bg-[#f5f5f5] rounded-[20px] px-[20px] pt-[16px] pb-[20px] flex flex-col gap-[16px] shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="font-['Poppins',sans-serif] font-medium text-[16px] leading-[24px] text-[#1c1c26]">
              Invite Members
            </p>
            <button
              onClick={() => { handleTriggerFileUpload() }}
              className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#ebebeb] transition-colors"
            >
              <Download className="h-[14px] w-[14px]" />
              Batch Import
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          </div>

          {/* Two-column cards */}
          <div className="flex gap-[20px]">
            {/* Organization Invitation */}
            <div className="flex flex-1 flex-col gap-[12px] rounded-[16px] border-[0.5px] border-[rgba(0,0,0,0.1)] bg-white p-[16px]">
              <div className="flex flex-col gap-[6px]">
                <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Invitation</p>
                <div className="flex flex-col gap-[6px] rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px]">
                  <div className="flex items-center justify-between">
                    <p className="flex-1 truncate text-[13px] leading-[20px] text-[#1c1c26]">{inviteCode}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteCode); toast({ description: 'Invite code copied.' }) }}
                      className="ml-[8px] text-[#8d8d93] hover:text-[#1c1c26] transition-colors shrink-0"
                    >
                      <Copy className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="flex-1 truncate text-[13px] leading-[20px] text-[#1c1c26]">{inviteLink}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteLink); toast({ description: 'Invite link copied.' }) }}
                      className="ml-[8px] text-[#8d8d93] hover:text-[#1c1c26] transition-colors shrink-0"
                    >
                      <Copy className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleRegenerateInvite}
                className="flex w-fit items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#ebebeb] transition-colors"
              >
                <RefreshCw className="h-[14px] w-[14px]" />
                Regenerate
              </button>
            </div>

            {/* Email Invitation */}
            <div className="flex flex-1 flex-col gap-[12px] rounded-[16px] border-[0.5px] border-[rgba(0,0,0,0.1)] bg-white p-[16px]">
              <div className="flex flex-1 flex-col gap-[6px]">
                <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Email Invitation</p>
                <textarea
                  value={emailInvites}
                  onChange={e => setEmailInvites(e.target.value)}
                  placeholder="Enter emails (comma-separated)"
                  className="flex-1 min-h-[64px] w-full resize-none rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
                />
              </div>
              <button
                onClick={handleSendEmailInvites}
                className="flex w-fit items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity"
              >
                <Send className="h-[14px] w-[14px]" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between">
        {/* Left: Search + Role + Status */}
        <div className="flex items-center gap-[10px]">
          {/* Search */}
          <div className="flex h-[36px] w-[260px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email..."
              className="flex-1 bg-transparent text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
            />
            <Search className="h-[16px] w-[16px] text-[#8d8d93] shrink-0" />
          </div>

          {/* Role dropdown */}
          <div className="relative">
            <button
              onClick={() => { setRoleDropdownOpen(v => !v); setStatusDropdownOpen(false) }}
              className="flex h-[36px] w-[120px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]"
            >
              <span className={`text-[13px] leading-[20px] ${roleFilter === 'All' ? 'text-[#8d8d93]' : 'text-[#1c1c26]'}`}>
                {roleFilter === 'All' ? 'Role' : roleFilter}
              </span>
              <ChevronDown className={`h-[16px] w-[16px] text-[#1c1c26] transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {roleDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-[4px] w-[120px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg overflow-hidden">
                {ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => { setRoleFilter(r); setRoleDropdownOpen(false) }}
                    className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] hover:bg-[#f5f5f5] transition-colors ${roleFilter === r ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}
                  >
                    {r === 'All' ? 'All Roles' : r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => { setStatusDropdownOpen(v => !v); setRoleDropdownOpen(false) }}
              className="flex h-[36px] w-[120px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]"
            >
              <span className={`text-[13px] leading-[20px] ${statusFilter === 'All' ? 'text-[#8d8d93]' : 'text-[#1c1c26]'}`}>
                {statusFilter === 'All' ? 'Status' : getMemberStatusDisplayName(statusFilter as memberStatus)}
              </span>
              <ChevronDown className={`h-[16px] w-[16px] text-[#1c1c26] transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <div className="absolute left-0 top-full z-20 mt-[4px] w-[160px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg overflow-hidden">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setStatusDropdownOpen(false) }}
                    className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] hover:bg-[#f5f5f5] transition-colors ${statusFilter === s ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}
                  >
                    {s === 'All' ? 'All Statuses' : getMemberStatusDisplayName(s as memberStatus)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Hide + Export */}
        <div className="flex items-center gap-[10px]">
          {showInvite && (
            <button
              onClick={() => setInviteSectionOpen(v => !v)}
              className="flex items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity"
            >
              {inviteSectionOpen
                ? <X className="h-[14px] w-[14px]" />
                : <Plus className="h-[14px] w-[14px]" />}
              {inviteSectionOpen ? 'Hide' : 'Invite Members'}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
          >
            <Download className="h-[14px] w-[14px]" />
            Export
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className={`flex-1 min-h-0 overflow-x-auto ${refreshing ? 'opacity-50 pointer-events-none' : ''}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => handleSort('name')} className="flex items-center gap-[4px]">
                  Member <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>
                <button onClick={() => handleSort('serviceFee')} className="flex items-center gap-[4px]">
                  Service Fee{payrollTokenSymbol ? ` (${payrollTokenSymbol})` : ''} <SortIcon field="serviceFee" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button onClick={() => handleSort('lastPayment')} className="flex items-center gap-[4px]">
                  Last Payment <SortIcon field="lastPayment" />
                </button>
              </TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-[40px] text-[#8d8d93]">Loading...</TableCell>
              </TableRow>
            ) : paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center gap-[8px] py-[40px]">
                    <Search className="h-[40px] w-[40px] text-[#8d8d93]" />
                    <p className="text-[13px] font-medium leading-[20px] text-[#1c1c26]">No members found</p>
                    <p className="text-[13px] leading-[20px] text-[#8d8d93]">Try adjusting your search or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map(member => (
                <TableRow key={member.id} className="cursor-pointer" onClick={() => openMemberDrawer(member)}>
                  {/* Member */}
                  <TableCell>
                    <div className="flex items-center gap-[6px]">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-[28px] w-[28px] rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e8eefe]">
                          <span className="text-[12px] font-medium text-[#5e85ee]">{member.name?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <span className="max-w-[120px] truncate">{member.name || '—'}</span>
                    </div>
                  </TableCell>
                  {/* Email */}
                  <TableCell className="max-w-[200px] truncate">{member.email || '—'}</TableCell>
                  {/* Role */}
                  <TableCell>{member.role || '—'}</TableCell>
                  {/* Service Fee */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-[4px]">
                      {editingField === member.id ? (
                        <Input
                          type="number"
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onBlur={() => { handleEditServiceFee(member, editingValue); setEditingField(null) }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { handleEditServiceFee(member, editingValue); setEditingField(null) }
                            else if (e.key === 'Escape') setEditingField(null)
                          }}
                          className="h-[26px] w-[90px]"
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className="whitespace-nowrap">
                            {member.serviceFee}{payrollTokenSymbol ? ` ${payrollTokenSymbol}` : ''}
                          </span>
                          <button
                            onClick={() => { setEditingField(member.id); setEditingValue(member.serviceFee.toString()) }}
                            className="text-[#8d8d93] hover:text-[#5e85ee] transition-colors"
                          >
                            <Edit2 className="h-[15px] w-[15px]" />
                          </button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  {/* Status */}
                  <TableCell><StatusBadge status={member.status} /></TableCell>
                  {/* Last Payment */}
                  <TableCell>
                    {member.lastPayment ? new Date(member.lastPayment).toLocaleDateString('zh-CN').replace(/\//g, '/') : '—'}
                  </TableCell>
                  {/* Action */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    {member.status === memberStatus.REVIEW && hasPermission(currentUserRole, Permission.APPROVE_MEMBER) ? (
                      <div className="flex items-center gap-[6px]">
                        <button
                          onClick={() => handleApprove(member)}
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#5e85ee] hover:opacity-90 transition-opacity"
                        >
                          <Check className="h-[18px] w-[18px] text-white" />
                        </button>
                        <button
                          onClick={() => handleReject(member)}
                          className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#f5f5f5] transition-colors"
                        >
                          <X className="h-[18px] w-[18px] text-[#1c1c26]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openMemberDrawer(member)}
                        className="text-[13px] leading-[20px] text-[#5e85ee] hover:opacity-80 transition-opacity whitespace-nowrap"
                      >
                        View Details
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {!loading && total > 0 && (
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-[13px] leading-[20px] text-[#606067]">{total.toLocaleString()} Members</p>
          <div className="flex items-center gap-[4px]">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#606067] hover:bg-[rgba(0,0,0,0.06)] disabled:opacity-30 transition-colors"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-[13px] leading-[20px] transition-colors ${
                    currentPage === page
                      ? 'bg-[rgba(28,28,38,0.1)] text-[#606067]'
                      : 'text-[#606067] hover:bg-[rgba(0,0,0,0.06)]'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="flex h-[30px] w-[30px] items-center justify-center text-[#606067]">…</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[13px] leading-[20px] text-[#606067] hover:bg-[rgba(0,0,0,0.06)] transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] text-[#606067] hover:bg-[rgba(0,0,0,0.06)] disabled:opacity-30 transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* ── Member Detail Drawer ────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={handleDrawerClose}>
        <DrawerContent className="max-h-screen">
          <div className="overflow-y-auto py-4">
            {selectedMember && (
              <MemberDetailContent
                selectedMember={selectedMember}
                currentUserRole={currentUserRole}
                payrollTokenSymbol={payrollTokenSymbol}
                onDrawerClose={() => setDrawerOpen(false)}
                onRemoveMember={member => { setMemberToRemove(member); setRemoveMemberDialogOpen(true) }}
                onSaveSuccess={updatedMember => setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Regenerate dialog ───────────────────────────────────────────── */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Organization Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to regenerate the organization invitation? The old code and link will no longer work.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRegenerate}>Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email invite confirm dialog ─────────────────────────────────── */}
      <Dialog open={emailInviteDialogOpen} onOpenChange={open => { if (!sendingInvites) { setEmailInviteDialogOpen(open); if (!open) setPendingEmails([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email Invitations</DialogTitle>
            <DialogDescription>
              {sendingInvites ? 'Sending invitations...' : 'The following email addresses will receive invitation emails:'}
            </DialogDescription>
          </DialogHeader>
          {!sendingInvites && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {pendingEmails.map((email, i) => (
                <div key={i} className="rounded-md bg-[#f5f5f5] px-3 py-2 text-sm">{email}</div>
              ))}
            </div>
          )}
          {sendingInvites && (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEmailInviteDialogOpen(false); setPendingEmails([]) }} disabled={sendingInvites}>Cancel</Button>
            <Button onClick={handleConfirmSendInvites} disabled={sendingInvites}>{sendingInvites ? 'Sending...' : 'Send Invitations'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove member dialog ────────────────────────────────────────── */}
      <Dialog open={removeMemberDialogOpen} onOpenChange={open => { setRemoveMemberDialogOpen(open); if (!open) setMemberToRemove(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              {memberToRemove && `Are you sure you want to remove ${memberToRemove.name}? They will no longer receive payments from this organization.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveMemberDialogOpen(false); setMemberToRemove(null) }}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRemove}>Remove Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
