import apis from '@/apis'
import type { BatchClaimResponse, StealthPayrollItem } from '@/apis/transaction.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { recoverStealthPrivateKey } from '@/lib/stealth-key'
import useChainAssetStore from '@/stores/chain-asset'
import type { Provider } from '@reown/appkit/react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react'
import { ethers, formatUnits } from 'ethers'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { privateKeyToAccount } from 'viem/accounts'

const PAGE_SIZE = 10

type StatusTab = 'pending' | 'failed'

async function deriveMetaPrivKey(walletProvider: Provider, address: string): Promise<`0x${string}`> {
  const { signMessage } = await apis.auth.getMySignMessage()
  const sig = await walletProvider.request<string>({
    method: 'personal_sign',
    params: [signMessage, address],
  }) as `0x${string}`
  return ethers.keccak256(ethers.getBytes(sig)) as `0x${string}`
}

export default function ClaimPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')

  const [activeTab, setActiveTab] = useState<StatusTab>('pending')
  const [items, setItems] = useState<StealthPayrollItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [recipient, setRecipient] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<BatchClaimResponse | null>(null)
  const { getTokenDecimals, getTokenSymbol, fetchChainAssets, fetchChains } = useChainAssetStore()

  useEffect(() => {
    if (address) setRecipient(address)
  }, [address])

  useEffect(() => {
    fetchChainAssets()
    fetchChains()
  }, [])

  useEffect(() => {
    loadItems(activeTab, page)
  }, [activeTab, page])

  const loadItems = async (status: StatusTab, p: number) => {
    try {
      setLoading(true)
      setSelectedIds(new Set())
      const data = await apis.transaction.getMyPayrollItems({ status, page: p, pageSize: PAGE_SIZE })
      setItems(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load payroll items.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab)
    setPage(1)
    setClaimResult(null)
  }

  const handlePageChange = (p: number) => setPage(p)

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map(i => i.id)))
  }

  const handleClaim = async () => {
    if (!recipient.trim()) {
      toast({ description: 'Please enter a recipient address.', variant: 'destructive' })
      return
    }
    if (!address || !walletProvider) {
      toast({ description: 'Please connect your wallet first.', variant: 'destructive' })
      return
    }
    const selected = items.filter(i => selectedIds.has(i.id))
    if (selected.length === 0) {
      toast({ description: 'No items selected.' })
      return
    }

    try {
      setClaiming(true)

      const chains = await apis.chainAsset.getChains()
      const caipToChain: Record<string, { chainIdNum: number; vaultAddress: string }> = {}
      for (const chain of chains) {
        if (chain.vaultAddress) {
          caipToChain[chain.caipChainId] = {
            chainIdNum: parseInt(chain.chainId, 10),
            vaultAddress: chain.vaultAddress,
          }
        }
      }

      const metaPrivKey = await deriveMetaPrivKey(walletProvider, address)
      const deadline = Math.floor(Date.now() / 1000) + 3600
      const fee = '0'

      const signedItems: { payrollItemId: string; recipient: string; fee: string; deadline: number; signature: string }[] = []
      const skipped: string[] = []

      for (const item of selected) {
        try {
          const stealthPrivHex = recoverStealthPrivateKey(metaPrivKey, item.batch.ephemeralPub)
          const stealthAccount = privateKeyToAccount(stealthPrivHex as `0x${string}`)

          if (stealthAccount.address.toLowerCase() !== item.stealthAddress.toLowerCase()) {
            console.warn(`[claim] stealthAddress mismatch for item ${item.id}`)
            skipped.push(item.id)
            continue
          }

          const chainInfo = caipToChain[item.batch.caipChainId]
          if (!chainInfo) {
            console.warn(`[claim] chain info not found for caipChainId=${item.batch.caipChainId}`)
            skipped.push(item.id)
            continue
          }

          const domain = {
            name: 'StealthPay',
            version: '1',
            chainId: chainInfo.chainIdNum,
            verifyingContract: chainInfo.vaultAddress as `0x${string}`,
          } as const

          const types = {
            ClaimRequest: [
              { name: 'stealthAddress', type: 'address' },
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'recipient', type: 'address' },
              { name: 'feeAmount', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          } as const

          const message = {
            stealthAddress: stealthAccount.address as `0x${string}`,
            token: item.batch.tokenAddress as `0x${string}`,
            amount: BigInt(item.amount),
            recipient: recipient.trim() as `0x${string}`,
            feeAmount: BigInt(fee),
            deadline: BigInt(deadline),
          } as const

          const signature = await stealthAccount.signTypedData({ domain, types, primaryType: 'ClaimRequest', message })
          signedItems.push({ payrollItemId: item.id, recipient: recipient.trim(), fee, deadline, signature })
        } catch (err) {
          console.error(`[claim] failed to sign item ${item.id}:`, err)
          skipped.push(item.id)
        }
      }

      if (signedItems.length === 0) {
        toast({
          title: 'Nothing to claim',
          description: `All ${skipped.length} item(s) were skipped (key mismatch).`,
          variant: 'destructive',
        })
        return
      }

      const result = await apis.transaction.batchClaim({ items: signedItems })
      setClaimResult(result)
      await loadItems(activeTab, page)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || error?.response?.data?.message || 'Failed to submit batch claim.',
        variant: 'destructive',
      })
    } finally {
      setClaiming(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/member/dashboard')} aria-label="Back">
          <IconArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">Claim Payroll</h1>
      </div>

      {/* Recipient Address */}
      <div className="max-w-lg space-y-1">
        <Label htmlFor="recipient">Recipient Address</Label>
        <Input
          id="recipient"
          placeholder="0x..."
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          className="font-mono"
        />
        <p className="text-muted-foreground text-xs">Funds will be sent to this address.</p>
      </div>

      {/* Claim result */}
      {claimResult && (
        <div className="space-y-3">
          {claimResult.succeeded.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-green-800">
                {claimResult.succeeded.length} item{claimResult.succeeded.length !== 1 ? 's' : ''} succeeded
              </p>
              <ul className="space-y-1">
                {claimResult.succeeded.map(s => (
                  <li key={s.payrollItemId} className="flex items-center justify-between text-sm">
                    <span className="text-green-700">{s.transactionName || s.payrollItemId}</span>
                    <a
                      href={s.txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 underline hover:text-green-800 font-mono"
                    >
                      View on Explorer ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {claimResult.failed.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-red-800">
                {claimResult.failed.length} item{claimResult.failed.length !== 1 ? 's' : ''} failed
              </p>
              <ul className="space-y-1">
                {claimResult.failed.map(f => (
                  <li key={f.payrollItemId} className="text-sm text-red-700">
                    <span className="font-mono text-xs">{f.payrollItemId}</span>
                    {' — '}{f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabs + table */}
      <div className="rounded-lg border">
        {/* Tab bar + actions */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-1">
            {(['pending', 'failed'] as StatusTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{total} item{total !== 1 ? 's' : ''}</span>
            <Button variant="outline" size="sm" onClick={() => loadItems(activeTab, page)} disabled={loading}>
              {loading ? <IconLoader2 className="size-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Button
              size="sm"
              onClick={handleClaim}
              disabled={claiming || loading || selectedIds.size === 0 || !address}
            >
              {claiming ? 'Signing & Claiming...' : `Claim Selected (${selectedIds.size})`}
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleAll}
                  className="accent-primary h-4 w-4 cursor-pointer"
                />
              </TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Pay Period</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <IconLoader2 className="size-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  No {activeTab} payroll items.
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => toggleItem(item.id)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="accent-primary h-4 w-4 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.organizationName ?? '-'}</TableCell>
                  <TableCell>{item.transactionName ?? '-'}</TableCell>
                  <TableCell className="font-medium">
                    {formatUnits(BigInt(item.amount || '0'), getTokenDecimals(item.batch.caipChainId, item.batch.tokenAddress))}{' '}
                    {getTokenSymbol(item.batch.caipChainId, item.batch.tokenAddress) ?? ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.batch?.payPeriod ? new Date(item.batch.payPeriod).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {item.status === 'failed'
                      ? <Badge variant="destructive">Failed</Badge>
                      : <Badge variant="warning">Pending</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-sm">
              Page {page} of {totalPages}
            </span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  )
}
