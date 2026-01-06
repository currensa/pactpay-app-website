import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBell,
  IconBulb,
  IconCopy,
  IconDiamond,
  IconDownload,
  IconExternalLink,
  IconLoader2,
  IconUpload,
  IconUser,
  IconWallet
} from '@tabler/icons-react'
import { useState } from 'react'

interface PaymentItem {
  date: string
  amount: number
  token: string
  status: 'completed' | 'pending'
  transactionId: string
}

const payments: PaymentItem[] = [
  {
    date: '2025-11-18 14:23',
    amount: 5000,
    token: 'USDC',
    status: 'completed',
    transactionId: '0x1a2b...9s0t'
  },
  {
    date: '2025-11-19 16:12',
    amount: 1500,
    token: 'USDC',
    status: 'pending',
    transactionId: '0x3c4d...1u2v'
  },
  {
    date: '2025-10-28 10:15',
    amount: 6000,
    token: 'USDC',
    status: 'completed',
    transactionId: '0x6f7g...4x5y'
  }
]

export default function TechCorp() {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [newWalletAddress, setNewWalletAddress] = useState('')
  const [confirmWalletAddress, setConfirmWalletAddress] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('Ethereum Mainnet')
  const [addressError, setAddressError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [displayName, setDisplayName] = useState('Alice Chen')
  const [muteNotifications, setMuteNotifications] = useState(true)
  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const organizationName = 'TechDAO'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const validateAddressFormat = (address: string): boolean => {
    // 以太坊地址格式：0x 开头，后面跟 40 个十六进制字符（不区分大小写）
    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/
    return ethereumAddressRegex.test(address)
  }

  const validateAddresses = () => {
    if (!newWalletAddress || !confirmWalletAddress) {
      return false
    }
    if (newWalletAddress !== confirmWalletAddress) {
      setAddressError('Wallet addresses do not match')
      return false
    }
    setAddressError('')
    return true
  }

  const handleConfirmAddressChange = (value: string) => {
    setConfirmWalletAddress(value)
    if (value && newWalletAddress && value !== newWalletAddress) {
      setAddressError('Wallet addresses do not match')
    } else {
      setAddressError('')
    }
  }

  const handleNewAddressChange = (value: string) => {
    setNewWalletAddress(value)
    if (value && confirmWalletAddress && value !== confirmWalletAddress) {
      setAddressError('Wallet addresses do not match')
    } else {
      setAddressError('')
    }
  }

  const handleUpdateWallet = async () => {
    if (!validateAddresses()) {
      return
    }

    // 校验地址格式
    if (!validateAddressFormat(newWalletAddress)) {
      toast({
        title: 'Error',
        description: `Invalid address format for ${selectedNetwork}`,
        variant: 'destructive'
      })
      return
    }

    setIsUpdating(true)

    try {
      // TODO: 实现更新钱包地址的 API 调用
      // const response = await updateWalletAddress(newWalletAddress, selectedNetwork)

      // 模拟 API 调用（实际使用时替换为真实 API）
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 模拟 API 响应（实际使用时根据 API 响应处理）
      // 如果 API 返回错误，会抛出异常进入 catch 块
      // const response = await updateWalletAddress(newWalletAddress, selectedNetwork)
      // if (!response.success) {
      //   throw new Error(response.error || 'Failed to update wallet address')
      // }

      toast({
        title: 'Success',
        description: 'Wallet address updated successfully'
      })
      setIsDialogOpen(false)
      // 重置表单
      setNewWalletAddress('')
      setConfirmWalletAddress('')
      setAddressError('')
    } catch (error) {
      // API 调用失败时显示错误提示
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Error',
        description: errorMessage.includes('Invalid address format')
          ? `Invalid address format for ${selectedNetwork}`
          : errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsDialogOpen(true)
    } else if (!isUpdating) {
      // 只有在非更新状态时才允许关闭
      setIsDialogOpen(false)
      // 关闭对话框时重置表单
      setNewWalletAddress('')
      setConfirmWalletAddress('')
      setAddressError('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">TechCorp Inc.</h1>
          <Badge variant="success" className="text-xs">
            Active
          </Badge>
        </div>
        <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
          Manage
        </Button>
      </div>

      {/* Receiving Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Receiving Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <div className="flex items-center gap-2">
                <Input value={formatAddress(walletAddress)} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  <IconCopy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Network</Label>
              <Input value="Ethereum Mainnet" readOnly />
            </div>
          </div>
          <Button variant="default" className="w-full sm:w-auto" onClick={() => setIsDialogOpen(true)}>
            Change Wallet
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription className="mt-1">3 transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <IconDownload className="h-4 w-4" />
              Download Statement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{payment.date}</TableCell>
                  <TableCell>{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{payment.token}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === 'completed' ? 'success' : 'warning'}>{payment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{payment.transactionId}</span>
                      <a
                        href={`https://etherscan.io/tx/${payment.transactionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <IconExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Update Wallet Address Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Wallet Address</DialogTitle>
            <DialogDescription>Change your receiving wallet address for TechCorp Inc.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="Enter new wallet address"
                value={newWalletAddress}
                onChange={e => handleNewAddressChange(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-wallet-address">Confirm Wallet Address</Label>
              <Input
                id="confirm-wallet-address"
                placeholder="Re-enter wallet address"
                value={confirmWalletAddress}
                onChange={e => handleConfirmAddressChange(e.target.value)}
                className={`font-mono ${addressError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {addressError && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <IconAlertTriangle className="h-4 w-4" />
                  {addressError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="network">Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger id="network">{selectedNetwork}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ethereum Mainnet">Ethereum Mainnet</SelectItem>
                  <SelectItem value="Polygon">Polygon</SelectItem>
                  <SelectItem value="Arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="Optimism">Optimism</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <p className="text-sm text-red-900">
                  Double-check carefully. Payments will be sent to this address. Crypto transactions{' '}
                  <span className="font-bold text-red-600">cannot be reversed.</span>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleUpdateWallet} disabled={!!addressError || isUpdating}>
              {isUpdating && <IconLoader2 className="h-4 w-4 animate-spin" />}
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="flex h-full w-full flex-col sm:w-[600px]">
          <DrawerHeader className="shrink-0 border-b">
            <DrawerTitle className="text-2xl">Settings for {organizationName}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {/* Member Profile Section */}
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <IconUser className="text-primary h-5 w-5" />
                  <h2 className="text-lg font-semibold">Member Profile</h2>
                </div>
                <p className="text-muted-foreground text-sm">How you appear in this organization</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name in {organizationName}</Label>
                    <Input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    <p className="text-muted-foreground text-xs">
                      This name will be visible to admins and other members in this organization only
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Avatar</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {displayName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" size="sm">
                        <IconUpload className="h-4 w-4" />
                        Upload Image
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      You can use different avatars for different organizations
                    </p>
                  </div>
                </div>
              </div>

              {/* Receiving Preferences Section */}
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <IconWallet className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-semibold">Receiving Preferences</h2>
                </div>
                <p className="text-muted-foreground text-sm">Manage your payment wallet for this organization</p>
                <div className="space-y-4">
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-start gap-2">
                      <IconBulb className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      <p className="text-sm text-blue-900">
                        This is your <strong>receiving wallet</strong> for payments from this organization, separate
                        from your login wallet.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Organization Network</Label>
                    <div className="bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <IconDiamond className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm font-medium">Ethereum Mainnet</span>
                      </div>
                      <span className="text-muted-foreground text-xs">Set by organization</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Receiving Wallet</Label>
                    <div className="bg-background flex items-center gap-2 rounded-md border px-3 py-2">
                      <span className="flex-1 font-mono text-sm">{formatAddress(walletAddress)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                        <IconCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        setIsDialogOpen(true)
                      }}
                    >
                      Update Receiving Wallet
                      <IconArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Organization Notifications Section */}
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <IconBell className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold">Organization Notifications</h2>
                </div>
                <p className="text-muted-foreground text-sm">Control notifications from this organization</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="mute-notifications" className="cursor-pointer">
                        Mute Notifications for this Org
                      </Label>
                      <p className="text-muted-foreground text-xs">
                        Non-critical notifications from {organizationName} will be hidden
                      </p>
                    </div>
                    <Switch
                      id="mute-notifications"
                      checked={muteNotifications}
                      onCheckedChange={setMuteNotifications}
                    />
                  </div>
                </div>
              </div>

              {/* Danger Zone Section */}
              <div className="space-y-4 rounded-md border border-red-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100">
                    <IconAlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                    <p className="text-sm text-red-800">Irreversible actions</p>
                  </div>
                </div>
                <div className="space-y-2 rounded-md bg-red-50 p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium text-red-900">Leave Organization</h3>
                    <p className="text-sm text-red-800">
                      You will no longer receive payments from {organizationName}. This action cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    Leave {organizationName}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
