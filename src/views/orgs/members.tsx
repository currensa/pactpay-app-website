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
import { BatchImportDialog } from '@/views/orgs/components/batch-import-dialog'
import { InviteSection } from '@/views/orgs/components/invite-section'
import { Check, ChevronDown, ChevronsUpDown, ChevronUp, Download, Edit2, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

export default function MemberPage() {
  const { toast } = useToast()
  const navigate = useNavigate()

  // ── Data state ───────────────────────────────────────────────────────
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)
  const [inited, setInited] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // ── Filter / sort state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<MemberRole | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<memberStatus | 'All'>('All')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  // ── UI state ─────────────────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false)
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // ── Dialog state ─────────────────────────────────────────────────────
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null)
  const [approveConfirmDialogOpen, setApproveConfirmDialogOpen] = useState(false)
  const [memberToApprove, setMemberToApprove] = useState<OrganizationMember | null>(null)
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false)
  const [remarkMember, setRemarkMember] = useState<OrganizationMember | null>(null)
  const [remarkValue, setRemarkValue] = useState('')
  const [remarkSaving, setRemarkSaving] = useState(false)

  const payrollTokenSymbol = useOrganizationStore(s => s.payrollTokenSymbol)
  const currentMember = useOrganizationStore(s => s.currentMember)
  const pageSize = 10
  const hasPermission = useHasPermission()

  // ── API ───────────────────────────────────────────────────────────────
  const toApiSortBy = (field: SortField): 'showName' | 'amount' | 'status' | 'createdAt' | 'lastPayment' | undefined => {
    if (!field) return undefined
    if (field === 'name') return 'showName'
    if (field === 'serviceFee') return 'amount'
    return field as 'lastPayment'
  }

  const fetchMembers = async (page = currentPage, isInitial = false) => {
    if (!localStorage.getItem('organizationId')) return
    if (isInitial) setLoading(true); else setRefreshing(true)
    try {
      const res = await apis.organization.getOrganizationMembers({
        page, pageSize,
        keyword: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        sortBy: toApiSortBy(sortField),
        sortOrder: sortDirection ?? undefined,
      })
      setMembers(res.data)
      setTotal(res.total)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to load members', variant: 'destructive' })
    } finally {
      if (isInitial) setLoading(false); else setRefreshing(false)
      setInited(true)
    }
  }

  useEffect(() => { fetchMembers(1, true) }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!inited) return
    setCurrentPage(1); fetchMembers(1)
  }, [debouncedSearch, statusFilter, sortField, sortDirection])

  useEffect(() => {
    if (!inited) return
    fetchMembers(currentPage)
  }, [currentPage])

  // ── Derived ───────────────────────────────────────────────────────────
  const paginatedMembers = useMemo(() => {
    if (roleFilter === 'All') return members
    return members.filter(m => getMemberRoles(m).includes(roleFilter as MemberRole))
  }, [members, roleFilter])

  const totalPages = Math.ceil(total / pageSize)

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else { setSortField(null); setSortDirection(null) }
    } else {
      setSortField(field); setSortDirection('asc')
    }
  }

  const handleApprove = (member: OrganizationMember) => { setMemberToApprove(member); setApproveConfirmDialogOpen(true) }

  const handleConfirmApprove = async () => {
    if (!memberToApprove) return
    try {
      await apis.organization.approveInvite(memberToApprove.memberId)
      setMembers(prev => prev.map(m => m.id === memberToApprove.id ? { ...m, status: 'active' as const } : m))
      toast({ title: 'Success', description: 'Member approved successfully.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to approve member.', variant: 'destructive' })
    } finally {
      setApproveConfirmDialogOpen(false); setMemberToApprove(null)
    }
  }

  const handleReject = async (member: OrganizationMember) => {
    try {
      await apis.organization.rejectInvite(member.memberId)
      setMembers(prev => prev.filter(m => m.id !== member.id))
      toast({ title: 'Success', description: 'Member rejected. Notification sent.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to reject member.', variant: 'destructive' })
    }
  }

  const handleRemove = async (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    try {
      await apis.organization.deleteMember(member.memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      setDrawerOpen(false)
      toast({ title: 'Success', description: 'Member removed successfully.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to remove member', variant: 'destructive' })
    }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    await handleRemove(memberToRemove.id)
    setRemoveMemberDialogOpen(false); setMemberToRemove(null)
  }

  const handleExport = async () => {
    try {
      const { blob, filename } = await apis.organization.getInviteImportTemplate()
      const isXlsx = filename?.toLowerCase().endsWith('.xlsx')
      let headers: string[] = []
      if (isXlsx) {
        const ab = await blob.arrayBuffer()
        const wb = XLSX.read(ab, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        headers = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] as string[] | undefined) ?? []
      } else {
        const text = await blob.text()
        headers = (text.split(/\r?\n/)[0] ?? '').split(',').map(h => h.trim().replace(/"/g, ''))
      }
      const getMemberField = (m: typeof paginatedMembers[0], field: string): string => {
        switch (field.toLowerCase()) {
          case 'amount': return String(m.payoutIntent?.amount ?? '')
          case 'email': return String(m.email ?? '')
          case 'showname': return String(m.showName ?? '')
          case 'status': return String(m.status ?? '')
          case 'createdat': return String(m.createdAt ?? '')
          case 'lastpayment': return String(m.lastPayment ?? '')
          default: return String((m as any)[field] ?? '')
        }
      }
      const dataRows = paginatedMembers.map(m => headers.map(h => getMemberField(m, h)))
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
      ws['!cols'] = headers.map(h => ({ wch: Math.max(20, h.length + 4) }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Members')
      XLSX.writeFile(wb, `members-page-${currentPage}.xlsx`)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to export members', variant: 'destructive' })
    }
  }

  const handleEditServiceFee = async (member: OrganizationMember, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      toast({ title: 'Error', description: 'Amount must be a positive number', variant: 'destructive' }); return
    }
    const originalAmount = parseFloat(member.payoutIntent?.amount ?? '')
    if (!isNaN(originalAmount) && numValue === originalAmount) { setEditingField(null); return }
    try {
      await apis.organization.updateMemberPayoutIntent(member.memberId, { amount: numValue.toString() })
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, payoutIntent: { ...m.payoutIntent, amount: numValue.toString() } } : m))
      toast({ title: 'Success', description: `Amount updated to ${numValue}` })
    } catch (error: any) {
      if (error?.response?.status === 404 && error?.response?.data?.message?.includes('payroll')) {
        toast({ title: 'Payroll not configured', description: error.response.data.message, variant: 'destructive' })
        setTimeout(() => navigate('/orgs/settings'), 1500); return
      }
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to update amount', variant: 'destructive' })
    }
  }

  const handleSaveRemark = async () => {
    if (!remarkMember) return
    setRemarkSaving(true)
    try {
      const orgId = localStorage.getItem('organizationId') ?? ''
      const updated = await apis.organization.updateMemberProfile(orgId, remarkMember.memberId, { remark: remarkValue })
      setMembers(prev => prev.map(m => m.id === remarkMember.id ? { ...m, remark: updated.remark } : m))
      toast({ title: 'Success', description: 'Remark updated.' })
      setRemarkDialogOpen(false); setRemarkMember(null)
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.message || 'Failed to update remark', variant: 'destructive' })
    } finally {
      setRemarkSaving(false)
    }
  }

  // ── Sort icon ─────────────────────────────────────────────────────────
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

      {/* ── Invite Members section ──────────────────────────────────────── */}
      {inviteSectionOpen && (
        <InviteSection onBatchImportClick={() => setBatchImportOpen(true)} />
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between">
        {/* Left: Search + Role + Status */}
        <div className="flex items-center gap-[10px]">
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
                  <button key={r} onClick={() => { setRoleFilter(r); setRoleDropdownOpen(false) }}
                    className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] hover:bg-[#f5f5f5] transition-colors ${roleFilter === r ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
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
                  <button key={s} onClick={() => { setStatusFilter(s); setStatusDropdownOpen(false) }}
                    className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] hover:bg-[#f5f5f5] transition-colors ${statusFilter === s ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
                    {s === 'All' ? 'All Statuses' : getMemberStatusDisplayName(s as memberStatus)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Invite + Export */}
        <div className="flex items-center gap-[10px]">
          <button
            onClick={() => setInviteSectionOpen(v => !v)}
            className="flex items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white hover:opacity-90 transition-opacity"
          >
            {inviteSectionOpen ? <X className="h-[14px] w-[14px]" /> : <Plus className="h-[14px] w-[14px]" />}
            {inviteSectionOpen ? 'Hide' : 'Invite Members'}
          </button>
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
                  Amount <SortIcon field="serviceFee" />
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
                <TableRow key={member.id} className="cursor-pointer" onClick={() => { setSelectedMember(member); setDrawerOpen(true) }}>
                  {/* Member */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-[6px]">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.showName} className="h-[28px] w-[28px] rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e8eefe]">
                          <span className="text-[12px] font-medium text-[#5e85ee]">{member.showName?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      <button
                        className="flex items-center gap-[4px] group"
                        onClick={() => { setSelectedMember(member); setDrawerOpen(true) }}
                      >
                        <span className="max-w-[120px] truncate">{member.showName || '—'}</span>
                        {member.memberId === currentMember?.memberId && <span className="shrink-0">🌟</span>}
                        {member.remark && (
                          <span className="max-w-[80px] truncate text-[11px] text-[#8d8d93]" title={member.remark}>
                            ({member.remark})
                          </span>
                        )}
                      </button>
                      {hasPermission(Permission.SET_OPERATOR) && (
                        <button
                          onClick={() => { setRemarkMember(member); setRemarkValue(member.remark ?? ''); setRemarkDialogOpen(true) }}
                          className="text-[#8d8d93] hover:text-[#5e85ee] transition-colors shrink-0"
                          title="Edit remark"
                        >
                          <Edit2 className="h-[13px] w-[13px]" />
                        </button>
                      )}
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
                        <button onClick={() => handleApprove(member)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#5e85ee] hover:opacity-90 transition-opacity">
                          <Check className="h-[18px] w-[18px] text-white" />
                        </button>
                        <button onClick={() => handleReject(member)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white hover:bg-[#f5f5f5] transition-colors">
                          <X className="h-[18px] w-[18px] text-[#1c1c26]" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setSelectedMember(member); setDrawerOpen(true) }} className="text-[13px] leading-[20px] text-[#5e85ee] hover:opacity-80 transition-opacity whitespace-nowrap">
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
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
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

      {/* ── Batch Import Dialog ─────────────────────────────────────────── */}
      <BatchImportDialog
        open={batchImportOpen}
        onOpenChange={setBatchImportOpen}
        onComplete={() => fetchMembers(currentPage)}
      />

      {/* ── Approve confirm dialog ───────────────────────────────────────── */}
      <Dialog open={approveConfirmDialogOpen} onOpenChange={open => { setApproveConfirmDialogOpen(open); if (!open) setMemberToApprove(null) }}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Please carefully verify the identity of the member you are adding.</DialogTitle>
            <DialogDescription>
              Due to the high anonymity of the platform, you will not receive any member information other than the nickname and avatar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={async () => { setApproveConfirmDialogOpen(false); if (memberToApprove) await handleReject(memberToApprove); setMemberToApprove(null) }}>Reject</Button>
            <Button onClick={handleConfirmApprove}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remark dialog ───────────────────────────────────────────────── */}
      <Dialog open={remarkDialogOpen} onOpenChange={open => { setRemarkDialogOpen(open); if (!open) setRemarkMember(null) }}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Edit Remark</DialogTitle>
            <DialogDescription>
              {remarkMember && `Set a remark for ${remarkMember.showName}.`}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={remarkValue}
            onChange={e => setRemarkValue(e.target.value)}
            placeholder="Enter remark..."
            onKeyDown={e => { if (e.key === 'Enter') handleSaveRemark() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemarkDialogOpen(false); setRemarkMember(null) }}>Cancel</Button>
            <Button onClick={handleSaveRemark} disabled={remarkSaving}>Save</Button>
          </DialogFooter>
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
