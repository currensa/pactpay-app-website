import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
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
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { getMemberStatusDisplayName, memberStatus } from '@/enums/org'
import useOrganizationStore from '@/stores/organization'
import { getMemberRoles, getPrimaryRole, MemberRole, Permission, useHasPermission } from '@/utils/permissions'
import type { SortDirection, SortField } from '@/views/orgs/components/member-detail'
import { MemberDetailContent } from '@/views/orgs/components/member-detail'
import { StatusBadge } from '@/views/orgs/components/status-badge'
import { AlertCircle, Check, CheckCircle, ChevronDown, ChevronsUpDown, ChevronUp, Copy, Download, Edit2, Plus, RefreshCw, Search, Send, Upload, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface MemberPageProps {
  showInvite: boolean
}
export default function MemberPage(
  {
    showInvite = true
  }: MemberPageProps
) {
  const { toast } = useToast()
  const navigate = useNavigate()

  // 状态管理
  const [members, setMembers] = useState<OrganizationMember[]>([])
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
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false)
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [emailInvites, setEmailInvites] = useState('')
  const [emailShowName, setEmailShowName] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [emailInviteDialogOpen, setEmailInviteDialogOpen] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<Array<{ name: string; email: string }>>([])
  const [sendingInvites, setSendingInvites] = useState(false)
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [batchImportStep, setBatchImportStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchHeaders, setBatchHeaders] = useState<string[]>([])
  const [batchPreviewRows, setBatchPreviewRows] = useState<Array<{ cells: string[]; valid: boolean }>>([])
  const [batchImporting, setBatchImporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [batchResult, setBatchResult] = useState<{
    total: number; successCount: number; failCount: number
    results: Array<{ row: number; email: string; success: boolean; message: string }>
  } | null>(null)

  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)

  const pageSize = showInvite ? 20 : 3
  const hasPermission = useHasPermission()



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
      setMembers(membersResponse.data)
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
    return members.filter(m => getMemberRoles(m).includes(roleFilter as MemberRole))
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
  const openMemberDrawer = (member: OrganizationMember) => {
    setSelectedMember(member)
    setDrawerOpen(true)
  }

  // 处理审批
  const handleApprove = async (member: OrganizationMember) => {
    try {
      await apis.organization.approveInvite(member.memberId)
      setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, status: 'active' as const } : m)))
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
  const handleReject = async (member: OrganizationMember) => {
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

  // 导出当前页成员数据：先拉模板获取表头，再按表头顺序填充成员数据
  const handleExport = async () => {
    try {
      // 1. 下载模板，解析表头
      const { blob } = await apis.organization.getInviteImportTemplate()
      const text = await blob.text()
      const firstLine = text.split(/\r?\n/)[0] ?? ''
      const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''))

      // 2. 直接用表头字段名从成员对象取值
      const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const rows = [
        headers.map(escape).join(','),
        ...paginatedMembers.map(m => headers.map(h => escape(String((m as any)[h] ?? ''))).join(','))
      ]

      const csvBlob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(csvBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `members-page-${currentPage}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to export members',
        variant: 'destructive'
      })
    }
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
    if (!emailShowName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a display name',
        variant: 'destructive'
      })
      return
    }

    const validation = validateEmails(emailInvites)

    if (!validation.valid) {
      toast({
        title: 'Error',
        description: 'Please enter valid email addresses',
        variant: 'destructive'
      })
      return
    }

    const names = emailShowName.split(',').map(n => n.trim()).filter(n => n)
    if (names.length !== validation.emails.length) {
      toast({
        title: 'Error',
        description: `Names count (${names.length}) does not match emails count (${validation.emails.length})`,
        variant: 'destructive'
      })
      return
    }
    setPendingInvites(validation.emails.map((email, i) => ({ name: names[i], email })))
    setEmailInviteDialogOpen(true)
  }

  // 确认发送邮箱邀请
  const handleConfirmSendInvites = async () => {
    setSendingInvites(true)

    try {
      // 逐个发送邀请邮件
      const results = await Promise.allSettled(pendingInvites.map(({ email, name }) => apis.organization.sendEmailInvitation(email, name)))

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Invitation emails sent successfully to ${successCount} recipient(s)${failCount > 0 ? `, ${failCount} failed` : ''}`
        })
        setEmailInvites('')
        setEmailShowName('')
        setEmailInviteDialogOpen(false)
        setPendingInvites([])
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

  // 加载邀请码
  const loadInviteCode = async () => {
    try {
      setInviteCodeLoading(true)
      const data = await apis.organization.getOrganizationInviteCode()
      setInviteCode(data.code)
      setInviteLink(`${window.location.origin}/join/${data.code}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load invite code.',
        variant: 'destructive',
      })
    } finally {
      setInviteCodeLoading(false)
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
  // 下载 CSV 模板
  const handleDownloadTemplate = async () => {
    try {
      const { blob, filename } = await apis.organization.getInviteImportTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to download template',
        variant: 'destructive'
      })
    }
  }

  // CSV 客户端预览解析：保留原始表头和列顺序
  const parseCsvForPreview = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { total: 0, headers: [] as string[], rows: [] as Array<{ cells: string[]; valid: boolean }> }
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const total = lines.length - 1
    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/"/g, ''))
      const email = emailIdx >= 0 ? (cells[emailIdx] ?? '') : ''
      return { cells, valid: emailIdx < 0 || (!!email && emailRegex.test(email)) }
    })
    return { total, headers, rows }
  }

  // 处理选中文件：解析 CSV 生成预览
  const handleBatchFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Error', description: 'Please upload a CSV file', variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const { total, headers, rows } = parseCsvForPreview(e.target?.result as string)
      setBatchTotal(total)
      setBatchHeaders(headers)
      setBatchPreviewRows(rows)
      setBatchImportStep('preview')
    }
    reader.readAsText(file)
  }

  // 确认批量导入：逐行调用邮件邀请接口，实时显示进度
  const handleConfirmBatchImport = async () => {
    const emailIdx = batchHeaders.findIndex(h => h.toLowerCase() === 'email')
    const nameIdx = batchHeaders.findIndex(h => ['name', 'showname'].includes(h.toLowerCase()))
    const amountIdx = batchHeaders.findIndex(h => ['fee', 'amount', 'servicefee'].includes(h.toLowerCase()))

    const validRows = batchPreviewRows.filter(r => r.valid)
    if (validRows.length === 0) return

    setBatchImporting(true)
    setBatchProgress({ current: 0, total: validRows.length })
    setBatchImportStep('importing')

    const results: Array<{ row: number; email: string; success: boolean; message: string }> = []

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const email = emailIdx >= 0 ? (row.cells[emailIdx] ?? '') : ''
      const name = nameIdx >= 0 ? (row.cells[nameIdx] ?? '') : ''
      const amount = amountIdx >= 0 ? (row.cells[amountIdx] ?? '') : ''
      const rowNum = batchPreviewRows.indexOf(row) + 2

      try {
        await apis.organization.sendEmailInvitation(email, name, amount || undefined)
        results.push({ row: rowNum, email, success: true, message: '' })
      } catch (error: any) {
        results.push({ row: rowNum, email, success: false, message: error?.response?.data?.message || 'Failed' })
      }

      setBatchProgress({ current: i + 1, total: validRows.length })
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    setBatchResult({ total: validRows.length, successCount, failCount, results })
    setBatchImporting(false)
    setBatchImportStep('result')
    fetchMembers(currentPage)
  }

  // 前端生成失败项 CSV 并下载
  const handleDownloadErrorReport = () => {
    if (!batchResult) return
    const failedResults = batchResult.results.filter(r => !r.success)
    const headers = [...batchHeaders, 'Error']
    const csvRows = failedResults.map(r => {
      // API 中 row 从 2 开始（第 1 行是表头），对应 batchPreviewRows 索引 = r.row - 2
      const rowData = batchPreviewRows[r.row - 2]
      const cells = rowData ? [...rowData.cells] : []
      while (cells.length < batchHeaders.length) cells.push('')
      return [...cells, r.message || ''].map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\n')
    const blob = new Blob(['\uFEFF' + csv,], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-error-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 内联编辑 Amount
  const handleEditServiceFee = async (member: OrganizationMember, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      toast({
        title: 'Error',
        description: 'Amount must be a positive number',
        variant: 'destructive'
      })
      return
    }

    const originalAmount = parseFloat(member.payoutIntent?.amount ?? '')
    if (!isNaN(originalAmount) && numValue === originalAmount) {
      setEditingField(null)
      return
    }

    try {
      await apis.organization.updateMemberPayoutIntent(
        member.memberId,
        { amount: numValue.toString() }
      )
      setMembers(prev => prev.map(m => m.id === member.id
        ? { ...m, payoutIntent: { ...m.payoutIntent, amount: numValue.toString() } }
        : m
      ))
      toast({
        title: 'Success',
        description: `Amount updated to ${numValue}`
      })
    } catch (error: any) {
      if (error?.response?.status === 404 && error?.response?.data?.message?.includes('payroll')) {
        toast({
          title: 'Payroll not configured',
          description: error.response.data.message,
          variant: 'destructive',
        })
        setTimeout(() => navigate('/orgs/settings'), 1500)
        return
      }
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to update amount',
        variant: 'destructive'
      })
    }
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

  const ROLES: Array<MemberRole | 'All'> = ['All', 'Owner', 'Admin', 'Operator', 'Member']
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
              onClick={() => { setBatchImportOpen(true); setBatchImportStep('upload') }}
              className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#ebebeb] transition-colors"
            >
              <Upload className="h-[14px] w-[14px]" />
              Batch Import
            </button>
          </div>

          {/* Two-column cards */}
          <div className="flex gap-[20px]">
            {/* Organization Invitation */}
            <div className="flex flex-1 flex-col gap-[12px] rounded-[16px] border-[0.5px] border-[rgba(0,0,0,0.1)] bg-white p-[16px]">
              <div className="flex flex-col gap-[6px]">
                <p className="text-[13px] font-semibold leading-[20px] text-[#1c1c26]">Organization Invitation</p>
                <div className="flex flex-col gap-[6px] rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px]">
                  {inviteCodeLoading ? (
                    <p className="text-[13px] leading-[20px] text-[#8d8d93]">Loading...</p>
                  ) : (
                    <>
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
                    </>
                  )}
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
                <input
                  value={emailShowName}
                  onChange={e => setEmailShowName(e.target.value)}
                  placeholder="Enter name (comma-separated)"
                  className="w-full rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
                />
                <input
                  value={emailInvites}
                  onChange={e => setEmailInvites(e.target.value)}
                  placeholder="Enter emails (comma-separated)"
                  className="w-full rounded-[10px] bg-[#f5f5f5] px-[12px] py-[10px] text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#bbbbbe] outline-none"
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
              onClick={async () => {
                if (!inviteSectionOpen) {
                  setInviteSectionOpen(true)
                  await loadInviteCode()
                } else {
                  setInviteSectionOpen(false)
                }
              }}
              disabled={inviteCodeLoading}
              className="flex items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {inviteSectionOpen
                ? <X className="h-[14px] w-[14px]" />
                : <Plus className="h-[14px] w-[14px]" />}
              {inviteSectionOpen ? 'Hide' : inviteCodeLoading ? 'Loading...' : 'Invite Members'}
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
                  Amount<SortIcon field="serviceFee" />
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
              <TableSkeletonRows rows={5} cols={7} />
            ) : paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center gap-[10px] py-[24px]">
                    <img src="/empty-table.svg" alt="No members" className="h-[120px] w-[120px]" />
                    <p className="text-[13px] leading-[20px] text-[#8d8d93]">No members found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map(member => (
                <TableRow key={member.id} className="cursor-pointer" onClick={() => openMemberDrawer(member)}>
                  {/* Member */}
                  <TableCell>
                    <div className="flex items-center gap-[6px]">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.showName} className="h-[28px] w-[28px] rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e8eefe]">
                          <span className="text-[12px] font-medium text-[#5e85ee]">{member.showName?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <span className="max-w-[120px] truncate">{member.showName || '—'}</span>
                    </div>
                  </TableCell>
                  {/* Email */}
                  <TableCell className="max-w-[200px] truncate">{member.email || '—'}</TableCell>
                  {/* Role */}
                  <TableCell>{getPrimaryRole(getMemberRoles(member)) || '—'}</TableCell>
                  {/* Amount */}
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
                            {member.payoutIntent?.amount ?? 0}{payrollTokenSymbol ? ` ${payrollTokenSymbol}` : ''}
                          </span>
                          <button
                            onClick={() => { setEditingField(member.id); setEditingValue(member.payoutIntent?.amount ?? '') }}
                            className="text-[#8d8d93] hover:text-[#5e85ee] transition-colors ml-[4px]"
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
                    {member.status === 'pending_review' && hasPermission(Permission.APPROVE_MEMBER) ? (
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={total}
          pageSize={pageSize}
          itemLabel="members"
          className="shrink-0"
        />
      )}

      {/* ── Member Detail Drawer ────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={handleDrawerClose}>
        <DrawerContent className="max-h-screen flex flex-col w-[420px]">
          {selectedMember && (
            <MemberDetailContent
              selectedMember={selectedMember}
              payrollTokenSymbol={payrollTokenSymbol}
              onDrawerClose={() => setDrawerOpen(false)}
              onRemoveMember={member => { setMemberToRemove(member); setRemoveMemberDialogOpen(true) }}
              onSaveSuccess={updatedMember => setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m))}
            />
          )}
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
      <Dialog open={emailInviteDialogOpen} onOpenChange={open => { if (!sendingInvites) { setEmailInviteDialogOpen(open); if (!open) setPendingInvites([]) } }}>
        <DialogContent className="max-w-[440px] p-[20px] gap-0 flex flex-col gap-[16px]">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[15px] font-semibold leading-[22px] text-[#1c1c26]">
              Send Email Invitations
            </DialogTitle>
          </DialogHeader>

          {sendingInvites ? (
            <div className="flex items-center justify-center gap-[10px] h-[80px] rounded-[10px] bg-[#f5f5f5]">
              <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#5e85ee] border-t-transparent" />
              <p className="text-[13px] leading-[20px] text-[#8d8d93]">Sending invitations...</p>
            </div>
          ) : (
            <div className="rounded-[10px] border border-[rgba(0,0,0,0.10)] overflow-hidden">
              <div className="grid grid-cols-2 bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.08)]">
                <div className="px-[12px] py-[5px] text-[11px] leading-[16px] text-[#8d8d93]">Name</div>
                <div className="px-[12px] py-[5px] text-[11px] leading-[16px] text-[#8d8d93] border-l border-[rgba(0,0,0,0.08)]">Email</div>
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {pendingInvites.map(({ name, email }, i) => (
                  <div key={i} className="grid grid-cols-2 border-b border-[rgba(0,0,0,0.06)] last:border-b-0">
                    <div className="px-[12px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] truncate">{name}</div>
                    <div className="px-[12px] py-[8px] text-[13px] leading-[20px] text-[#606067] truncate border-l border-[rgba(0,0,0,0.06)]">{email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-[8px]">
            <button
              onClick={() => { setEmailInviteDialogOpen(false); setPendingInvites([]) }}
              disabled={sendingInvites}
              className="rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSendInvites}
              disabled={sendingInvites}
              className="rounded-[10px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              Send Invitations
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Batch Import Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={batchImportOpen}
        onOpenChange={open => {
          if (!batchImporting) {
            setBatchImportOpen(open)
            if (!open) { setBatchImportStep('upload'); setBatchHeaders([]); setBatchPreviewRows([]); setBatchResult(null); setBatchProgress({ current: 0, total: 0 }) }
          }
        }}
      >
        <DialogContent className="max-w-[580px] p-[24px] gap-0 flex flex-col gap-[20px]">
          <DialogHeader className="p-0">
            <DialogTitle className="text-[16px] font-semibold leading-[24px] text-[#1c1c26]">
              Batch Import Members
            </DialogTitle>
          </DialogHeader>

          {batchImportStep === 'upload' ? (
            <>
              {/* Download Template link */}
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-[4px] text-[13px] font-semibold text-[#5e85ee] hover:opacity-80 transition-opacity w-fit"
              >
                <Download className="h-[14px] w-[14px]" />
                Download Template
              </button>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleBatchFile(f) }}
                onClick={() => batchFileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-[10px] h-[200px] rounded-[12px] bg-[#f5f5f5] cursor-pointer transition-colors ${isDragging ? 'border-2 border-dashed border-[#5e85ee]' : 'hover:bg-[#ececec]'}`}
              >
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] bg-[#d2d2d4]">
                  <Upload className="h-[24px] w-[24px] text-white" />
                </div>
                <div className="flex flex-col items-center gap-[2px]">
                  <p className="text-[13px] leading-[20px] text-[#1c1c26]">Click or drag to upload file</p>
                  <p className="text-[12px] leading-[18px] text-[#8d8d93]">Supports CSV, Max 5MB</p>
                </div>
              </div>
              <input
                type="file"
                ref={batchFileInputRef}
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBatchFile(f); e.target.value = '' }}
              />
            </>
          ) : batchImportStep === 'preview' ? (
            <>
              {/* Stats row */}
              <div className="flex items-center gap-[12px]">
                <p className="text-[14px] leading-[22px] text-[#1c1c26]">Total: {batchTotal} rows</p>
                <div className="flex items-center gap-[2px]">
                  <CheckCircle className="h-[18px] w-[18px] text-[#5ddd22]" />
                  <p className="text-[14px] leading-[22px] text-[#1c1c26]">Valid: {batchPreviewRows.filter(r => r.valid).length}</p>
                </div>
                <div className="flex items-center gap-[2px]">
                  <XCircle className="h-[18px] w-[18px] text-[#d92b2b]" />
                  <p className="text-[14px] leading-[22px] text-[#1c1c26]">Invalid: {batchPreviewRows.filter(r => !r.valid).length}</p>
                </div>
              </div>

              {/* Preview table */}
              <div className="flex flex-col gap-[6px]">
                <p className="text-[11px] leading-[16px] text-[#8d8d93]">Preview of the first 10 items</p>
                <div className="border border-[rgba(0,0,0,0.12)] rounded-[12px] overflow-hidden">
                  <div className="overflow-y-auto max-h-[260px]">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0">
                        <tr className="bg-[#f5f5f5] border-b border-[rgba(0,0,0,0.12)]">
                          {batchHeaders.map((h, i) => (
                            <th key={i} className="px-[14px] py-[5px] text-left text-[11px] leading-[16px] text-[#8d8d93] font-normal whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {batchPreviewRows.slice(0, 10).map((row, i) => {
                          const emailIdx = batchHeaders.findIndex(h => h.toLowerCase() === 'email')
                          return (
                            <tr key={i} className={`border-b border-[rgba(0,0,0,0.12)] last:border-b-0 ${!row.valid ? 'bg-[rgba(217,43,43,0.04)]' : ''}`}>
                              {row.cells.map((cell, j) => (
                                <td key={j} className="px-[14px] py-[10px] text-[13px] leading-[20px] whitespace-nowrap">
                                  {j === emailIdx && !row.valid ? (
                                    <div className="flex items-center gap-[4px]">
                                      <span className="text-[#d92b2b]">{cell || '—'}</span>
                                      <AlertCircle className="h-[12px] w-[12px] text-[#d92b2b] shrink-0" />
                                    </div>
                                  ) : (
                                    <span className="text-[#1c1c26]">{cell || '—'}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-[10px]">
                <button
                  onClick={() => setBatchImportStep('upload')}
                  className="rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[14px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmBatchImport}
                  disabled={batchImporting}
                  className="rounded-[12px] bg-[#5e85ee] px-[14px] py-[8px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {batchImporting ? 'Importing...' : 'Import'}
                </button>
              </div>
            </>
          ) : batchImportStep === 'importing' ? (
            <div className="flex flex-col items-center justify-center gap-[8px] h-[200px] w-full rounded-[12px] bg-[#f5f5f5]">
              <div className="h-[36px] w-[36px] animate-spin rounded-full border-[3px] border-[#5e85ee] border-t-transparent border-r-transparent" />
              <p className="text-[14px] leading-[22px] text-[#1c1c26]">
                Importing... {batchProgress.current}/{batchProgress.total}
              </p>
            </div>
          ) : batchImportStep === 'result' ? (
            <div className="flex flex-col items-center justify-center gap-[10px] h-[200px] w-full rounded-[12px] bg-[#f5f5f5]">
              {batchResult?.failCount === 0 ? (
                <>
                  <CheckCircle className="h-[52px] w-[52px] text-[#5ddd22]" strokeWidth={1.5} />
                  <p className="text-[14px] leading-[22px] text-[#1c1c26]">
                    {batchResult.successCount} members imported successfully.
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-[52px] w-[52px] text-[#ffa800]" strokeWidth={1.5} />
                  <p className="text-[14px] leading-[22px] text-[#1c1c26]">
                    {batchResult?.successCount} successed,{' '}
                    <span className="text-[#d92b2b]">{batchResult?.failCount}</span> failed.
                  </p>
                  <button
                    onClick={handleDownloadErrorReport}
                    className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Download className="h-[14px] w-[14px]" />
                    Download error report
                  </button>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Remove member dialog ────────────────────────────────────────── */}
      <Dialog open={removeMemberDialogOpen} onOpenChange={open => { setRemoveMemberDialogOpen(open); if (!open) setMemberToRemove(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              {memberToRemove && `Are you sure you want to remove ${memberToRemove.showName}? They will no longer receive payments from this organization.`}
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
