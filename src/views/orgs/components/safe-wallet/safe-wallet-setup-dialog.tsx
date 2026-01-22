import type { Chain } from '@/apis/orgnization.api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { BindSafeWalletForm } from '@/views/orgs/components/safe-wallet/bind-safe-wallet-form'
import { CreateSafeWalletWizard } from '@/views/orgs/components/safe-wallet/create-safe-wallet-wizard'

export type SafeWalletSetupMode = 'create' | 'bind'

interface SafeWalletSetupDialogProps {
  open: boolean
  mode: SafeWalletSetupMode
  onModeChange: (mode: SafeWalletSetupMode) => void
  onOpenChange: (open: boolean) => void
  organizationId: string
  chains: Chain[]
  canManage: boolean
  onSuccess: () => void | Promise<void>
}

export function SafeWalletSetupDialog({
  open,
  mode,
  onModeChange,
  onOpenChange,
  organizationId,
  chains,
  canManage,
  onSuccess
}: SafeWalletSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Safe Wallet' : 'Bind Safe Wallet'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Deploy a new Safe Wallet on-chain and save it to your organization.'
              : 'Verify an existing Safe Wallet and connect it to your organization.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'create' ? 'default' : 'outline'}
            onClick={() => onModeChange('create')}
            className={cn('flex-1', mode !== 'create' && 'text-muted-foreground')}
          >
            Create Safe Wallet
          </Button>
          <Button
            type="button"
            variant={mode === 'bind' ? 'default' : 'outline'}
            onClick={() => onModeChange('bind')}
            className={cn('flex-1', mode !== 'bind' && 'text-muted-foreground')}
          >
            Verify & Connect
          </Button>
        </div>

        {!canManage && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-100">
            只有 Owner 或 Pay Admin 可以创建或绑定 Safe Wallet。
          </div>
        )}

        {mode === 'create' ? (
          <CreateSafeWalletWizard
            open={open}
            chains={chains}
            canManage={canManage}
            onSuccess={onSuccess}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <BindSafeWalletForm
            open={open}
            organizationId={organizationId}
            chains={chains}
            canManage={canManage}
            onSuccess={onSuccess}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

