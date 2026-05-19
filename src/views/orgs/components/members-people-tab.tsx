import apis from '@/apis'
import { OrganizationMember } from '@/apis/orgnization.api'
import BindWalletReminderBanner from '@/components/app/base/bind-wallet-reminder-banner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { getMemberStatusDisplayName, memberStatus, OrganizationMemberRole } from '@/enums/org'
import useOrganizationStore from '@/stores/organization'
import { getHighestRole, Permission, useHasPermission } from '@/utils/permissions'
import { BatchImportDialog } from '@/views/orgs/components/batch-import-dialog'
import { InviteSection } from '@/views/orgs/components/invite-section'
import type { SortDirection, SortField } from '@/views/orgs/components/member-detail'
import { MemberDetailContent } from '@/views/orgs/components/member-detail'
import { StatusBadge } from '@/views/orgs/components/status-badge'
import { Check, ChevronDown, ChevronsUpDown, ChevronUp, Edit2, Plus, Search, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

type MembersPeopleTabProps = {
  tabsNav: ReactNode
}

export function MembersPeopleTab({ tabsNav }: MembersPeopleTabProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const bindWalletBannerDismissKey = useMemo(
    () => `pactpay_members_bind_wallet_banner_dismissed:${localStorage.getItem('userId') ?? 'anonymous'}`,
    [],
  )

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [total, setTotal] = useState(0)
  const [inited, setInited] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<OrganizationMemberRole | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<memberStatus | 'All'>('All')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inviteSectionOpen, setInviteSectionOpen] = useState(false)
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

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

  const toApiSortBy = (field: SortField): 'showName' | 'amount' | 'status' | 'createdAt' | 'lastPayment' | undefined => {
    if (!field) return undefined
    if (field === 'name') return 'showName'
    if (field === 'serviceFee') return 'amount'
    return field as 'lastPayment'
  }

  const buildMemberQueryParams = (page: number, customPageSize = pageSize) => ({
    page,
    pageSize: customPageSize,
    keyword: debouncedSearch || undefined,
    role: roleFilter !== 'All' ? roleFilter : undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    sortBy: toApiSortBy(sortField),
    sortOrder: sortDirection ?? undefined,
  })

  const fetchMembers = async (page = currentPage, isInitial = false) => {
    if (!localStorage.getItem('organizationId')) return
    if (isInitial) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await apis.organization.getOrganizationMembers(buildMemberQueryParams(page))
      setMembers(res.data)
      setTotal(res.total)
    } catch {
      // request interceptor handles API errors
    } finally {
      if (isInitial) setLoading(false)
      else setRefreshing(false)
      setInited(true)
    }
  }

  useEffect(() => {
    void fetchMembers(1, true)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!inited) return
    setCurrentPage(1)
    void fetchMembers(1)
  }, [debouncedSearch, inited, roleFilter, sortDirection, sortField, statusFilter])

  useEffect(() => {
    if (!inited) return
    void fetchMembers(currentPage)
  }, [currentPage, inited])

  const totalPages = Math.ceil(total / pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleApprove = (member: OrganizationMember) => {
    setMemberToApprove(member)
    setApproveConfirmDialogOpen(true)
  }

  const handleConfirmApprove = async () => {
    if (!memberToApprove) return
    try {
      await apis.organization.approveInvite(memberToApprove.memberId)
      setMembers(prev => prev.map(member => (
        member.id === memberToApprove.id ? { ...member, status: 'active' as const } : member
      )))
      toast({ title: 'Success', description: 'Member approved successfully.' })
    } catch {
      // request interceptor handles API errors
    } finally {
      setApproveConfirmDialogOpen(false)
      setMemberToApprove(null)
    }
  }

  const handleReject = async (member: OrganizationMember) => {
    try {
      await apis.organization.rejectInvite(member.memberId)
      setMembers(prev => prev.filter(item => item.id !== member.id))
      toast({ title: 'Success', description: 'Member rejected. Notification sent.' })
    } catch {
      // request interceptor handles API errors
    }
  }

  const handleRemove = async (memberId: string) => {
    const member = members.find(item => item.id === memberId)
    if (!member) return

    try {
      await apis.organization.deleteMember(member.memberId)
      setMembers(prev => prev.filter(item => item.id !== memberId))
      setDrawerOpen(false)
      toast({ title: 'Success', description: 'Member removed successfully.' })
    } catch {
      // request interceptor handles API errors
    }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    await handleRemove(memberToRemove.id)
    setRemoveMemberDialogOpen(false)
    setMemberToRemove(null)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
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
        headers = (text.split(/\r?\n/)[0] ?? '').split(',').map(header => header.trim().replace(/"/g, ''))
      }

      const getMemberField = (member: typeof members[0], field: string): string => {
        switch (field.toLowerCase()) {
          case 'amount':
            return String(member.payoutIntent?.amount ?? '')
          case 'email':
            return String(member.email ?? '')
          case 'showname':
            return String(member.showName ?? '')
          case 'status':
            return String(member.status ?? '')
          case 'createdat':
            return String(member.createdAt ?? '')
          case 'lastpayment':
            return String(member.lastPayment ?? '')
          default:
            return String((member as any)[field] ?? '')
        }
      }

      const exportPageSize = 100
      const firstPage = await apis.organization.getOrganizationMembers(buildMemberQueryParams(1, exportPageSize))
      const totalPagesToExport = Math.max(1, Math.ceil(firstPage.total / exportPageSize))
      const remainingPages = totalPagesToExport > 1
        ? await Promise.all(
          Array.from({ length: totalPagesToExport - 1 }, (_, index) =>
            apis.organization.getOrganizationMembers(buildMemberQueryParams(index + 2, exportPageSize)),
          ),
        )
        : []
      const exportMembers = [firstPage, ...remainingPages].flatMap(response => response.data)

      if (exportMembers.length === 0) {
        toast({ title: 'Info', description: 'No members match the current filters.' })
        return
      }

      const dataRows = exportMembers.map(member => headers.map(header => getMemberField(member, header)))
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
      ws['!cols'] = headers.map(header => ({ wch: Math.max(20, header.length + 4) }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Members')
      XLSX.writeFile(wb, 'members-export.xlsx')
    } catch {
      // request interceptor handles API errors
    } finally {
      setExporting(false)
    }
  }

  const handleEditServiceFee = async (member: OrganizationMember, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      toast({ title: 'Error', description: 'Amount must be a positive number', variant: 'destructive' })
      return
    }

    const originalAmount = parseFloat(member.payoutIntent?.amount ?? '')
    if (!isNaN(originalAmount) && numValue === originalAmount) {
      setEditingField(null)
      return
    }

    try {
      await apis.organization.updateMemberPayoutIntent(member.memberId, { amount: numValue.toString() })
      setMembers(prev => prev.map(item => (
        item.id === member.id
          ? { ...item, payoutIntent: { ...item.payoutIntent, amount: numValue.toString() } }
          : item
      )))
      toast({ title: 'Success', description: `Amount updated to ${numValue}` })
    } catch (error: any) {
      if (error?.response?.status === 404 && error?.response?.data?.message?.includes('payroll')) {
        setTimeout(() => navigate('/orgs/settings'), 1500)
        return
      }
    }
  }

  const handleSaveRemark = async () => {
    if (!remarkMember) return
    setRemarkSaving(true)

    try {
      const orgId = localStorage.getItem('organizationId') ?? ''
      const updated = await apis.organization.updateMemberProfile(orgId, remarkMember.memberId, { remark: remarkValue })
      setMembers(prev => prev.map(member => (
        member.id === remarkMember.id ? { ...member, remark: updated.remark } : member
      )))
      toast({ title: 'Success', description: 'Remark updated.' })
      setRemarkDialogOpen(false)
      setRemarkMember(null)
    } catch {
      // request interceptor handles API errors
    } finally {
      setRemarkSaving(false)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField === field) {
      return sortDirection === 'asc'
        ? <ChevronUp className="h-[14px] w-[14px] text-[#1c1c26]" />
        : <ChevronDown className="h-[14px] w-[14px] text-[#1c1c26]" />
    }
    return <ChevronsUpDown className="h-[14px] w-[14px] text-[#8d8d93]" />
  }

  const roles: Array<OrganizationMemberRole | 'All'> = [
    'All',
    OrganizationMemberRole.OWNER,
    OrganizationMemberRole.ADMIN,
    OrganizationMemberRole.OPERATOR,
    OrganizationMemberRole.MEMBER,
  ]

  const statuses: Array<memberStatus | 'All'> = [
    'All',
    memberStatus.ACTIVE,
    memberStatus.ACTIVATION,
    memberStatus.REVIEW,
  ]

  return (
    <div className="flex h-full flex-col gap-[16px]">
      <div className="flex h-full flex-col gap-[16px] rounded-[32px] bg-white p-[20px]">
        {tabsNav}
        <BindWalletReminderBanner
          dismissStorageKey={bindWalletBannerDismissKey}
          redirectTo="/orgs/members"
        />

        {inviteSectionOpen && (
          <InviteSection onBatchImportClick={() => setBatchImportOpen(true)} onInvited={() => void fetchMembers(1)} />
        )}

        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[36px] w-[260px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]">
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search by name, email..."
                className="flex-1 bg-transparent text-[13px] leading-[20px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
              />
              <Search className="h-[16px] w-[16px] shrink-0 text-[#8d8d93]" />
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setRoleDropdownOpen(open => !open)
                  setStatusDropdownOpen(false)
                }}
                className="flex h-[36px] w-[120px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]"
              >
                <span className={`text-[13px] leading-[20px] ${roleFilter === 'All' ? 'text-[#8d8d93]' : 'text-[#1c1c26]'}`}>
                  {roleFilter === 'All' ? 'Role' : roleFilter}
                </span>
                <ChevronDown className={`h-[16px] w-[16px] text-[#1c1c26] transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {roleDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-[4px] w-[120px] overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg">
                  {roles.map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        setRoleFilter(role)
                        setRoleDropdownOpen(false)
                      }}
                      className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] transition-colors hover:bg-[#f5f5f5] ${
                        roleFilter === role ? 'text-[#5e85ee]' : 'text-[#1c1c26]'
                      }`}
                    >
                      {role === 'All' ? 'All Roles' : role}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setStatusDropdownOpen(open => !open)
                  setRoleDropdownOpen(false)
                }}
                className="flex h-[36px] w-[160px] items-center justify-between rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px]"
              >
                <span className={`text-[13px] leading-[20px] ${statusFilter === 'All' ? 'text-[#8d8d93]' : 'text-[#1c1c26]'}`}>
                  {statusFilter === 'All' ? 'Status' : getMemberStatusDisplayName(statusFilter)}
                </span>
                <ChevronDown className={`h-[16px] w-[16px] text-[#1c1c26] transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {statusDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-[4px] w-[160px] overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white shadow-lg">
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status)
                        setStatusDropdownOpen(false)
                      }}
                      className={`w-full px-[12px] py-[8px] text-left text-[13px] leading-[20px] transition-colors hover:bg-[#f5f5f5] ${
                        statusFilter === status ? 'text-[#5e85ee]' : 'text-[#1c1c26]'
                      }`}
                    >
                      {status === 'All' ? 'All Statuses' : getMemberStatusDisplayName(status)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-[10px]">
            <button
              onClick={() => setInviteSectionOpen(open => !open)}
              className="flex items-center gap-[4px] rounded-[12px] bg-[#5e85ee] px-[12px] py-[7px] text-[13px] leading-[20px] text-white transition-opacity hover:opacity-90"
            >
              {inviteSectionOpen ? <X className="h-[14px] w-[14px]" /> : <Plus className="h-[14px] w-[14px]" />}
              {inviteSectionOpen ? 'Hide' : 'Invite Members'}
            </button>
            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className="flex items-center gap-[4px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white px-[12px] py-[7px] text-[13px] leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
            >
              <Upload className="h-[14px] w-[14px]" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-x-auto ${refreshing ? 'pointer-events-none opacity-50' : ''}`}>
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
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center gap-[10px] py-[24px]">
                      <img src="/empty-table.svg" alt="No members" className="h-[120px] w-[120px]" />
                      <p className="text-[13px] leading-[20px] text-[#8d8d93]">No members found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                members.map(member => (
                  <TableRow key={member.id} className="cursor-pointer" onClick={() => {
                    setSelectedMember(member)
                    setDrawerOpen(true)
                  }}
                  >
                    <TableCell onClick={event => event.stopPropagation()}>
                      <div className="flex items-center gap-[6px]">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.showName} className="h-[28px] w-[28px] shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#e8eefe]">
                            <span className="text-[12px] font-medium text-[#5e85ee]">{member.showName?.[0]?.toUpperCase() || '?'}</span>
                          </div>
                        )}
                        <button
                          className="group flex items-center gap-[4px]"
                          onClick={() => {
                            setSelectedMember(member)
                            setDrawerOpen(true)
                          }}
                        >
                          <span className="max-w-[120px] truncate">{member.showName || '-'}</span>
                          {member.memberId === currentMember?.memberId && <span className="shrink-0">Me</span>}
                          {member.remark && (
                            <span className="max-w-[80px] truncate text-[11px] text-[#8d8d93]" title={member.remark}>
                              ({member.remark})
                            </span>
                          )}
                        </button>
                        {hasPermission(Permission.SET_OPERATOR) && (
                          <button
                            onClick={() => {
                              setRemarkMember(member)
                              setRemarkValue(member.remark ?? '')
                              setRemarkDialogOpen(true)
                            }}
                            className="shrink-0 text-[#8d8d93] transition-colors hover:text-[#5e85ee]"
                            title="Edit remark"
                          >
                            <Edit2 className="h-[13px] w-[13px]" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{member.email || '-'}</TableCell>
                    <TableCell>{getHighestRole(member.roles)}</TableCell>
                    <TableCell onClick={event => event.stopPropagation()}>
                      <div className="flex items-center gap-[4px]">
                        {editingField === member.id ? (
                          <Input
                            type="number"
                            value={editingValue}
                            onChange={event => setEditingValue(event.target.value)}
                            onBlur={() => {
                              void handleEditServiceFee(member, editingValue)
                              setEditingField(null)
                            }}
                            onKeyDown={event => {
                              if (event.key === 'Enter') {
                                void handleEditServiceFee(member, editingValue)
                                setEditingField(null)
                              } else if (event.key === 'Escape') {
                                setEditingField(null)
                              }
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
                              onClick={() => {
                                setEditingField(member.id)
                                setEditingValue(member.payoutIntent?.amount ?? '')
                              }}
                              className="ml-[4px] text-[#8d8d93] transition-colors hover:text-[#5e85ee]"
                            >
                              <Edit2 className="h-[15px] w-[15px]" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={member.status} /></TableCell>
                    <TableCell>
                      {member.lastPayment ? new Date(member.lastPayment).toLocaleDateString('zh-CN').replace(/\//g, '/') : '-'}
                    </TableCell>
                    <TableCell onClick={event => event.stopPropagation()}>
                      {member.status === 'pending_review' && hasPermission(Permission.APPROVE_MEMBER) ? (
                        <div className="flex items-center gap-[6px]">
                          <button
                            onClick={() => handleApprove(member)}
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#5e85ee] transition-opacity hover:opacity-90"
                          >
                            <Check className="h-[18px] w-[18px] text-white" />
                          </button>
                          <button
                            onClick={() => void handleReject(member)}
                            className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-[rgba(0,0,0,0.12)] bg-white transition-colors hover:bg-[#f5f5f5]"
                          >
                            <X className="h-[18px] w-[18px] text-[#1c1c26]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMember(member)
                            setDrawerOpen(true)
                          }}
                          className="whitespace-nowrap text-[13px] leading-[20px] text-[#5e85ee] transition-opacity hover:opacity-80"
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

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="flex max-h-screen w-[420px] flex-col">
            {selectedMember && (
              <MemberDetailContent
                selectedMember={selectedMember}
                payrollTokenSymbol={payrollTokenSymbol}
                onDrawerClose={() => setDrawerOpen(false)}
                onRemoveMember={member => {
                  setMemberToRemove(member)
                  setRemoveMemberDialogOpen(true)
                }}
                onSaveSuccess={updatedMember => setMembers(prev => prev.map(member => (
                  member.id === updatedMember.id ? updatedMember : member
                )))}
              />
            )}
          </DrawerContent>
        </Drawer>

        <BatchImportDialog
          open={batchImportOpen}
          onOpenChange={setBatchImportOpen}
          onComplete={() => void fetchMembers(currentPage)}
        />

        <Dialog open={approveConfirmDialogOpen} onOpenChange={open => {
          setApproveConfirmDialogOpen(open)
          if (!open) setMemberToApprove(null)
        }}
        >
          <DialogContent className="max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Please carefully verify the identity of the member you are adding.</DialogTitle>
              <DialogDescription>
                Due to the high anonymity of the platform, you will not receive any member information other than the nickname and avatar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={async () => {
                  setApproveConfirmDialogOpen(false)
                  if (memberToApprove) await handleReject(memberToApprove)
                  setMemberToApprove(null)
                }}
              >
                Reject
              </Button>
              <Button onClick={() => void handleConfirmApprove()}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={remarkDialogOpen} onOpenChange={open => {
          setRemarkDialogOpen(open)
          if (!open) setRemarkMember(null)
        }}
        >
          <DialogContent className="max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Edit Remark</DialogTitle>
              <DialogDescription>
                {remarkMember && `Set a remark for ${remarkMember.showName}.`}
              </DialogDescription>
            </DialogHeader>
            <Input
              value={remarkValue}
              onChange={event => setRemarkValue(event.target.value)}
              placeholder="Enter remark..."
              onKeyDown={event => {
                if (event.key === 'Enter') void handleSaveRemark()
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRemarkDialogOpen(false)
                  setRemarkMember(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSaveRemark()} disabled={remarkSaving}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={removeMemberDialogOpen} onOpenChange={open => {
          setRemoveMemberDialogOpen(open)
          if (!open) setMemberToRemove(null)
        }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Member</DialogTitle>
              <DialogDescription>
                {memberToRemove && `Are you sure you want to remove ${memberToRemove.showName}? They will no longer receive payments from this organization.`}
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
              <Button variant="destructive" onClick={() => void handleConfirmRemove()}>Remove Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
