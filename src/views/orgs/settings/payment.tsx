import api from '@/apis'
import type { Chain, OrganizationPaymentAccount } from '@/apis/orgnization.api'
import { PayrollBatch } from '@/apis/transaction.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { hasPermission, MemberRole, Permission } from '@/utils/permissions'
import { SafeWalletConfigDialog } from '@/views/orgs/components/safe-wallet/safe-wallet-config-dialog'
import { SafeWalletSetupDialog, type SafeWalletSetupMode } from '@/views/orgs/components/safe-wallet/safe-wallet-setup-dialog'
import { IconAlertTriangle, IconExternalLink } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PaymentSettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // Safe Wallet info
  const [safeWallet, setSafeWallet] = useState<OrganizationPaymentAccount | null>(null)
  const [pendingSafeTx, setPendingSafeTx] = useState<PayrollBatch | null>(null)
  const [networkName, setNetworkName] = useState<string>('')
  const [chains, setChains] = useState<Chain[]>([])
  const [canManageSafeWallet, setCanManageSafeWallet] = useState(false)
  const [safeWalletDialogOpen, setSafeWalletDialogOpen] = useState(false)
  const [safeWalletDialogMode, setSafeWalletDialogMode] = useState<SafeWalletSetupMode>('bind')
  const [safeWalletConfigDialogOpen, setSafeWalletConfigDialogOpen] = useState(false)

  const organizationId = localStorage.getItem('organizationId')

  useEffect(() => {
    if (!organizationId) {
      navigate('/account/identity', { replace: true })
      return
    }
    loadData()
  }, [organizationId, navigate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [chainsData, orgsData, paymentAccountsData] = await Promise.all([
        api.chainAsset.getChains(),
        api.organization.getOrganizations(),
        api.organization.getOrganizationPaymentAccounts()
      ])

      setChains(chainsData || [])

      // Find Safe Wallet from payment accounts API
      const safeAccount = paymentAccountsData.list?.find(account => account.type === 'safe_wallet')
      if (safeAccount) {
        setSafeWallet(safeAccount)
        // Check for pending transactions immediately
        try {
          const pendingTx = await api.transaction.getPendingSafeTransaction(safeAccount.id)
          setPendingSafeTx(pendingTx)
        } catch (error) {
          console.error('Failed to check pending transactions:', error)
        }

        // Find network name from chains
        const network = chainsData.find(
          chain =>
            chain.caipChainId === safeAccount.config.caipChainId ||
            chain.chainId === safeAccount.config.chainId ||
            chain.id === safeAccount.config.chainId
        )
        setNetworkName(network?.name || safeAccount.config.caipChainId || 'Unknown Network')
      } else {
        setSafeWallet(null)
        setNetworkName('')
      }

      // 根据用户的角色判断是否有权限管理 Safe Wallet
      const currentItem = (orgsData || []).find((item: any) => item?.organization?.orgId === organizationId)
      const userRoles: MemberRole[] = currentItem?.member?.roles?.map((r: any) => r.role as MemberRole) || []
      // 检查是否有绑定 Safe Wallet 的权限
      setCanManageSafeWallet(hasPermission(userRoles, Permission.BIND_SAFE_WALLET))
    } catch (error) {
      console.error('Failed to load payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeSafeWallet = async () => {
    if (!safeWallet) {
      setSafeWalletDialogMode('bind')
      setSafeWalletDialogOpen(true)
      return
    }

    if (pendingSafeTx) {
      alert('Cannot modify Safe Wallet configuration while a transaction is pending.')
      return
    }

    setSafeWalletConfigDialogOpen(true)
  }

  const handleRevokeTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this transaction?')) return

    try {
      setLoading(true)
      await api.transaction.deleteTransactionPlan(id)

      // Refresh pending status
      if (safeWallet) {
        const pendingTx = await api.transaction.getPendingSafeTransaction(safeWallet.id)
        setPendingSafeTx(pendingTx)
      }
    } catch (error) {
      console.error('Failed to revoke transaction:', error)
      alert('Failed to revoke transaction. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Safe Wallet</CardTitle>
          <CardDescription>Manage your organization's multi-signature wallet address and network</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {safeWallet ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Current Safe Wallet</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSafeWalletDialogMode('bind')
                      setSafeWalletDialogOpen(true)
                    }}
                  >
                    Change
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg border p-4">
                  <div className="text-lg font-semibold">{safeWallet.config.address}</div>
                  <div className="text-muted-foreground mt-1 text-sm">{networkName}</div>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/20">
                <div className="flex gap-3">
                  <IconAlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-600 dark:text-yellow-500" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-semibold">Important:</span> Changing your Safe Wallet address requires
                    verification through signature. Make sure you have access to the Safe Wallet you want to connect.
                  </div>
                </div>
              </div>

              {pendingSafeTx ? (
                <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/10">
                  <div className="flex items-start gap-3">
                    <IconAlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-600 dark:text-orange-500" />
                    <div className="space-y-2">
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        {pendingSafeTx.transactionType === 'safe_config'
                          ? 'There is a pending configuration change transaction.'
                          : 'Cannot change settings while a payment transaction is pending.'}
                      </p>

                      {pendingSafeTx.transactionType === 'safe_config' && (
                        <div className="flex gap-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeTransaction(pendingSafeTx.id)}
                          >
                            Revoke
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/transaction/${pendingSafeTx.transactionId}`)}
                          >
                            Sign
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {pendingSafeTx.transactionType === 'safe_transaction' && (
                    <div className="flex items-center gap-4 pt-2">
                      <Button disabled className="opacity-50">
                        Safe Wallet Config
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Button onClick={handleChangeSafeWallet}>Safe Wallet Config</Button>
                  <a
                    href="https://safe.global/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                  >
                    Learn about Safe Wallet Multi-sig
                    <IconExternalLink className="size-4" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="text-muted-foreground">No Safe Wallet connected. Please connect a Safe Wallet first.</div>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setSafeWalletDialogMode('create')
                    setSafeWalletDialogOpen(true)
                  }}
                >
                  Create Safe Wallet
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSafeWalletDialogMode('bind')
                    setSafeWalletDialogOpen(true)
                  }}
                >
                  Verify & Connect
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {organizationId && (
        <SafeWalletSetupDialog
          open={safeWalletDialogOpen}
          mode={safeWalletDialogMode}
          onModeChange={setSafeWalletDialogMode}
          onOpenChange={setSafeWalletDialogOpen}
          organizationId={organizationId}
          chains={chains}
          canManage={canManageSafeWallet}
          onSuccess={loadData}
        />
      )}

      {safeWallet && (
        <SafeWalletConfigDialog
          open={safeWalletConfigDialogOpen}
          onOpenChange={setSafeWalletConfigDialogOpen}
          paymentAccount={safeWallet}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
