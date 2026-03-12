import apis from '@/apis'
import type { StealthPayrollItem } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getMetaPublicKey, recoverStealthPrivateKey } from '@/lib/stealth-key'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconExternalLink, IconKey } from '@tabler/icons-react'
import { keccak256, toBytes, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SettingsDrawer } from './components/settings-drawer'

/** 钱包签名 → 确定性 metaPrivKey（每次可重现，无需存储）；同时返回原始签名供后端验证 */
async function deriveMetaPrivKey(walletProvider: Provider, address: string): Promise<{ metaPrivKey: `0x${string}`; signature: `0x${string}` }> {
  const sig = await walletProvider.request<string>({
    method: 'personal_sign',
    params: [toHex('StealthPay Identity v1'), address],
  }) as `0x${string}`
  return { metaPrivKey: keccak256(toBytes(sig)), signature: sig }
}

export default function EmployeeOrgsDetail() {
  const location = useLocation()
  const { orgName = 'TechDAO' } = location.state || {}
  const { toast } = useToast()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [displayName, setDisplayName] = useState('Alice Chen')

  // StealthPay: metaPub 提交
  const [isSubmittingMetaPub, setIsSubmittingMetaPub] = useState(false)

  // StealthPay: 工资明细
  const [payrollItems, setPayrollItems] = useState<StealthPayrollItem[]>([])
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollLoaded, setPayrollLoaded] = useState(false)

  // StealthPay: claim
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null)
  const [recipientInputs, setRecipientInputs] = useState<Record<string, string>>({})

  const handleSubmitMetaPub = async () => {
    if (!address || !walletProvider) {
      toast({ description: 'Please connect your wallet first.', variant: 'destructive' })
      return
    }
    try {
      setIsSubmittingMetaPub(true)
      // 通过钱包签名确定性派生 metaPrivKey，再推导公钥
      const { metaPrivKey, signature } = await deriveMetaPrivKey(walletProvider, address)
      const metaPub = getMetaPublicKey(metaPrivKey)
      await apis.organization.submitMetaPub({ address, metaPub, signature })
      toast({ title: 'Success', description: 'MetaPub registered. HR can now generate your stealth address.' })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to submit metaPub.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmittingMetaPub(false)
    }
  }

  const handleLoadPayrollItems = async () => {
    try {
      setPayrollLoading(true)
      const items = await apis.transaction.getMyPayrollItems()
      setPayrollItems(items)
      setPayrollLoaded(true)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load payroll items.',
        variant: 'destructive'
      })
    } finally {
      setPayrollLoading(false)
    }
  }

  const handleClaim = async (item: StealthPayrollItem) => {
    const recipient = recipientInputs[item.id]
    if (!recipient?.trim()) {
      toast({ description: 'Please enter the recipient address.', variant: 'destructive' })
      return
    }
    if (!address || !walletProvider) {
      toast({ description: 'Please connect your wallet first.', variant: 'destructive' })
      return
    }
    try {
      setClaimingItemId(item.id)

      // 1. 钱包签名 → 确定性 metaPrivKey → 恢复隐匿私钥
      const { metaPrivKey } = await deriveMetaPrivKey(walletProvider, address)
      const stealthPrivHex = recoverStealthPrivateKey(metaPrivKey, item.ephemeralPub)
      const stealthAccount = privateKeyToAccount(stealthPrivHex as `0x${string}`)

      // 2. 构建 EIP-712 数据
      const fee = '0'
      const deadline = Math.floor(Date.now() / 1000) + 3600

      const chainIdNum = item.caipChainId
        ? parseInt(item.caipChainId.split(':')[1] ?? '1', 10)
        : 1

      const domain = {
        name: 'StealthPay',
        version: '1',
        chainId: chainIdNum,
        verifyingContract: (item.vaultAddress ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
      } as const

      const types = {
        ClaimRequest: [
          { name: 'stealthAddress', type: 'address' },
          { name: 'token',          type: 'address' },
          { name: 'amount',         type: 'uint256' },
          { name: 'recipient',      type: 'address' },
          { name: 'feeAmount',      type: 'uint256' },
          { name: 'deadline',       type: 'uint256' },
        ],
      } as const

      const message = {
        stealthAddress: item.stealthAddress as `0x${string}`,
        token:          item.tokenAddress as `0x${string}`,
        amount:         BigInt(item.amount),
        recipient:      recipient.trim() as `0x${string}`,
        feeAmount:      BigInt(fee),
        deadline:       BigInt(deadline),
      } as const

      // 3. 用隐匿私钥本地签名（无需 MetaMask 确认）
      const signature = await stealthAccount.signTypedData({ domain, types, primaryType: 'ClaimRequest', message })

      // 4. 提交 claim
      await apis.transaction.submitClaim({
        payrollItemId: item.id,
        recipient: recipient.trim(),
        fee,
        deadline,
        signature,
        proof: item.proof,
      })
      toast({ title: 'Claim Submitted', description: 'Your claim has been submitted. The relayer will process it shortly.' })
      await handleLoadPayrollItems()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to submit claim.',
        variant: 'destructive'
      })
    } finally {
      setClaimingItemId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{orgName}</h1>
          <Badge variant="success" className="text-xs">Active</Badge>
        </div>
        <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>Manage</Button>
      </div>

      {/* StealthPay 配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconKey className="h-5 w-5 text-primary" />
            <CardTitle>StealthPay Setup</CardTitle>
          </div>
          <CardDescription>
            Sign once with your wallet to register your stealth identity. Your private key is derived locally and never sent to the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSubmitMetaPub}
              disabled={isSubmittingMetaPub || !address}
            >
              {isSubmittingMetaPub ? 'Signing & Registering...' : 'Sign & Register Identity'}
            </Button>
            {!address && (
              <p className="text-sm text-muted-foreground">Connect your wallet to continue.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This will prompt a wallet signature. The signature deterministically derives your meta key — no private key is ever transmitted.
          </p>
        </CardContent>
      </Card>

      {/* 工资明细 & Claim */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Payroll Claims</CardTitle>
              <CardDescription className="mt-1">
                View your claimable payroll payments and claim them to your chosen address.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLoadPayrollItems} disabled={payrollLoading}>
              {payrollLoading ? 'Loading...' : payrollLoaded ? 'Refresh' : 'Load Payroll'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!payrollLoaded ? (
            <div className="py-8 text-center text-muted-foreground">
              Click "Load Payroll" to view your payroll items.
            </div>
          ) : payrollItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No payroll items found.</div>
          ) : (
            <div className="space-y-4">
              {payrollItems.map(item => (
                <div key={item.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {item.amount} {item.tokenAddress.slice(0, 6)}...
                    </div>
                    <Badge variant={item.status === 'claimed' ? 'success' : item.status === 'failed' ? 'destructive' : 'warning'}>
                      {item.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground font-mono">
                    Stealth: {item.stealthAddress.slice(0, 10)}...{item.stealthAddress.slice(-6)}
                  </div>

                  {item.status === 'pending' && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs">Recipient Address</Label>
                        <Input
                          placeholder="0x... (where to receive funds)"
                          value={recipientInputs[item.id] || ''}
                          onChange={e => setRecipientInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="font-mono text-xs h-8"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClaim(item)}
                        disabled={claimingItemId === item.id || !address}
                      >
                        {claimingItemId === item.id ? 'Signing & Claiming...' : 'Claim Payment'}
                      </Button>
                    </div>
                  )}

                  {item.status === 'claimed' && item.recipient && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      Sent to: <span className="font-mono">{item.recipient}</span>
                      <a
                        href={`https://etherscan.io/address/${item.recipient}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <IconExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SettingsDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        organizationName={orgName}
        displayName={displayName}
        setDisplayName={setDisplayName}
        walletAddress=""
        formatAddress={(addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-'}
        handleCopy={() => {}}
        onOpenUpdateWallet={() => {}}
      />
    </div>
  )
}
