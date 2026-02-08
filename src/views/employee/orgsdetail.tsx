import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IconCopy, IconDownload, IconExternalLink } from '@tabler/icons-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SettingsDrawer } from './components/settings-drawer'
import { UpdateWalletDialog } from './components/update-wallet-dialog'
import { useWalletUpdate } from './hooks/use-wallet-update'

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

export default function EmployeeOrgsDetail() {
  const location = useLocation()
  const { orgName = 'TechDAO' } = location.state || {}
  const [, setCopied] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [displayName, setDisplayName] = useState('Alice Chen')
  // const [muteNotifications, setMuteNotifications] = useState(true)
  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const organizationName = orgName

  const { state: walletState, actions: walletActions } = useWalletUpdate()

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{organizationName}</h1>
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
      <UpdateWalletDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        walletState={walletState}
        walletActions={walletActions}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        organizationName={organizationName}
        displayName={displayName}
        setDisplayName={setDisplayName}
        walletAddress={walletAddress}
        formatAddress={formatAddress}
        handleCopy={handleCopy}
        // muteNotifications={muteNotifications}
        // setMuteNotifications={setMuteNotifications}
        onOpenUpdateWallet={() => setIsDialogOpen(true)}
      />
    </div>
  )
}
