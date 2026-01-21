import { OrganizationMember } from '@/apis/orgnization.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { IconCalendar, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

interface CreateTransactionDialogContentProps {
  isCreatingFromReaction: boolean
  organizationMembers: OrganizationMember[]
  membersLoading: boolean
  transactionDetailMembers: any[]
  onCreateTransaction: (params: {
    selectedMembers: Set<string>
    memberServiceFees: Record<string, string>
    transactionName: string
    executionDate: string
  }) => void
  onCancel: () => void
}

export function CreateTransactionDialogContent({
  isCreatingFromReaction,
  organizationMembers,
  membersLoading,
  transactionDetailMembers,
  onCancel,
  onCreateTransaction,
}: CreateTransactionDialogContentProps) {
  // 内部状态管理
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [memberServiceFees, setMemberServiceFees] = useState<Record<string, string>>({})
  const [transactionName, setTransactionName] = useState('')
  const [executionDate, setExecutionDate] = useState('')

  // 根据 selectedMembers 按币种汇总金额
  const amountByCurrency = useMemo(() => {
    const totals: Record<string, number> = {}

    selectedMembers.forEach(memberId => {
      const member = organizationMembers.find(m => m.id === memberId)
      const currency = member?.payoutIntent?.currency || 'UNKNOWN'
      const amount = parseFloat(memberServiceFees[memberId] || '0') || 0
      totals[currency] = (totals[currency] || 0) + amount
    })

    return Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => ({ currency, amount }))
  }, [selectedMembers, memberServiceFees, organizationMembers])

  // 初始化服务费数据
  useEffect(() => {
    const initialFees: Record<string, string> = {}
    organizationMembers.forEach(member => {
      initialFees[member.id] = member.payoutIntent?.amount || '0'
    })
    setMemberServiceFees(initialFees)
    setSelectedMembers(new Set())
    setCurrentStep(isCreatingFromReaction ? 2 : 1)
    setTransactionName(isCreatingFromReaction ? 'New Transaction (Re-action)' : '')
    setExecutionDate('')
  }, [organizationMembers, isCreatingFromReaction])
  // 工具函数
  function formatWalletAddress(address: string): string {
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  function formatDateForDisplay(dateString: string): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year} / ${month} / ${day}`
  }

  // 处理函数
  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedMembers.size === organizationMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(organizationMembers.map(m => m.id)))
    }
  }

  const handleInvertSelection = () => {
    const newSelected = new Set<string>()
    organizationMembers.forEach(member => {
      if (!selectedMembers.has(member.id)) {
        newSelected.add(member.id)
      }
    })
    setSelectedMembers(newSelected)
  }

  const handleServiceFeeChange = (memberId: string, value: string) => {
    // 限制不能为负数
    if (value !== '' && parseFloat(value) < 0) {
      return
    }
    setMemberServiceFees((prev: Record<string, string>) => ({
      ...prev,
      [memberId]: value
    }))
  }

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2)
    }
  }

  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const handleCreateTransaction = () => {
    onCreateTransaction({
      selectedMembers,
      memberServiceFees,
      transactionName,
      executionDate,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <DialogTitle>Create New Transaction</DialogTitle>
      </DialogHeader>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-4 pb-6">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              currentStep === 1
                ? 'bg-primary text-primary-foreground'
                : isCreatingFromReaction
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {isCreatingFromReaction && currentStep === 2 ? '✓' : '1'}
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              currentStep === 1 || isCreatingFromReaction ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Select Members & Set Amounts
          </span>
        </div>
        <div className="bg-border h-px flex-1" />
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            2
          </div>
          <span
            className={cn('text-sm font-medium', currentStep === 2 ? 'text-foreground' : 'text-muted-foreground')}
          >
            Choose Date & Preview
          </span>
        </div>
      </div>

      {/* 第一步：选择成员和设置金额 */}
      {currentStep === 1 && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* 选择控制按钮 */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleInvertSelection}>
              Invert Selection
            </Button>
          </div>

          {/* 成员表格 */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>MEMBER</TableHead>
                  {/* <TableHead>EMAIL</TableHead> */}
                  <TableHead>ROLE</TableHead>
                  <TableHead>SERVICE FEE</TableHead>
                  <TableHead>WALLET ADDRESS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                        Loading members...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : organizationMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  organizationMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedMembers.has(member.id)}
                              onChange={() => handleMemberToggle(member.id)}
                              className="border-input accent-primary h-4 w-4 cursor-pointer rounded"
                            />
                      </TableCell>
                      <TableCell className="font-medium">{member.showName}</TableCell>
                      {/* <TableCell className="text-muted-foreground">{member.email}</TableCell> */}
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {member.roles[0]?.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={memberServiceFees[member.id] || ''}
                                onChange={e => handleServiceFeeChange(member.id, e.target.value)}
                                className="w-24"
                                placeholder="0"
                              />
                          <span className="text-muted-foreground text-sm">{member.payoutIntent?.currency}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {formatWalletAddress(member.receivingAccounts[0]?.config?.address)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 第二步：选择日期和预览 */}
      {currentStep === 2 && (
        <div className="flex-1 space-y-6 overflow-y-auto">
          {/* 输入字段 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Transaction Name */}
            <div className="space-y-2">
              <Label htmlFor="transaction-name">Transaction Name</Label>
                  <Input
                    id="transaction-name"
                    placeholder="Enter transaction name."
                    value={transactionName}
                    onChange={e => setTransactionName(e.target.value)}
                  />
              <p className="text-muted-foreground text-xs">
                Give this transaction a descriptive name for easy identification.
              </p>
            </div>

            {/* Execution Date */}
            <div className="space-y-2">
              <Label htmlFor="execution-date">Execution Date</Label>
              <div className="relative">
                    <Input
                      id="execution-date"
                      type="date"
                      placeholder="年 / 月 / 日"
                      value={executionDate}
                      onChange={e => setExecutionDate(e.target.value)}
                      min={getTodayDate()}
                      className="pr-10"
                    />
                <IconCalendar className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
              </div>
              <p className="text-muted-foreground text-xs">
                Select the date when this transaction should be executed. Cannot select past dates.
              </p>
            </div>
          </div>

          {/* 摘要面板 */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Transaction Name:</span>
              <span className="text-sm font-medium">{transactionName || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Selected Members:</span>
              <span className="text-sm font-medium">{selectedMembers.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Execution Date:</span>
              <span className="text-sm font-medium">
                {executionDate ? formatDateForDisplay(executionDate) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total Amount:</span>
              <span className="text-sm font-medium text-right">
                {amountByCurrency.length === 0
                  ? '-'
                  : amountByCurrency.map(({ currency, amount }) => (
                      <div key={currency}>
                        {amount} {currency}
                      </div>
                    ))}
              </span>
            </div>
          </div>

          {/* 成员详情 */}
          <div className="space-y-3">
            <h3 className="text-muted-foreground text-sm font-medium uppercase">Member Details</h3>
            <div className="space-y-2">
              {transactionDetailMembers.map(item => {
                const amount = parseFloat(item.amount)
                // Charlie Brown 显示 "Original"，其他显示 "Service Fee"
                const label = item.member.showName === 'Charlie Brown' ? 'Original' : 'Service Fee'
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium">{item.member.showName}</span>
                    <span className="text-muted-foreground text-sm">
                      {label}: {amount} {item.currency}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="flex items-center justify-end gap-3 border-t pt-4 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {currentStep === 1 && (
          <Button onClick={handleNext} disabled={selectedMembers.size === 0}>
            Next
          </Button>
        )}
        {currentStep === 2 && (
          <>
            <Button variant="outline" onClick={handlePrevious}>
              Previous
            </Button>
            <Button onClick={handleCreateTransaction} disabled={!transactionName || !executionDate}>
              Create Transaction
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
