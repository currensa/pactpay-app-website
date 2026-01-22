import api from '@/apis'
import type { Chain } from '@/apis/orgnization.api'
import { SafeWalletApi } from '@/apis/safe-wallet.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconLoader2 } from '@tabler/icons-react'
import { verifyMessage } from 'ethers'
import { useEffect, useMemo, useState } from 'react'

interface BindSafeWalletFormProps {
  open: boolean
  organizationId: string
  chains: Chain[]
  canManage: boolean
  onSuccess: () => void | Promise<void>
  onDone: () => void
}

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

export function BindSafeWalletForm({ open, organizationId, chains, canManage, onSuccess, onDone }: BindSafeWalletFormProps) {
  const { open: openAppKit } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')

  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('')
  const [safeAddressInput, setSafeAddressInput] = useState('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedChain = useMemo(() => chains.find(c => c.id === selectedNetworkId), [chains, selectedNetworkId])

  useEffect(() => {
    if (!open) {
      setSelectedNetworkId('')
      setSafeAddressInput('')
      setError('')
      setIsSubmitting(false)
      return
    }
    // default select first chain when opening
    if (!selectedNetworkId && chains.length > 0) {
      setSelectedNetworkId(chains[0].id)
    }
  }, [open, chains, selectedNetworkId])

  const validateAddressFormat = (addr: string) => {
    return EVM_ADDRESS_REGEX.test(addr.trim())
  }

  const handleVerifyAndConnect = async () => {
    if (!canManage) {
      toast({
        variant: 'destructive',
        title: 'Permission denied',
        description: 'Only Owner or Pay Admin can bind Safe Wallet.'
      })
      return
    }

    const safeAddress = safeAddressInput.trim()
    if (!validateAddressFormat(safeAddress)) {
      setError('Invalid Safe Wallet address format')
      return
    }

    if (!selectedChain) {
      setError('Please select a network')
      return
    }

    if (!isConnected || !address || !walletProvider) {
      openAppKit()
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // 1) Network existence & Safe validity
      const safeApi = new SafeWalletApi(BigInt(selectedChain.chainId))
      let safeInfo: any
      try {
        safeInfo = await safeApi.getSafeInfo(safeAddress)
      } catch {
        setError('Address does not exist on the selected network, please check address and network')
        return
      }

      // 2) Ownership check (owner list)
      const owners: string[] = safeInfo?.owners || []
      const isOwner = owners.some(o => o.toLowerCase() === address.toLowerCase())
      if (!isOwner) {
        setError('You are not the Owner of this Safe Wallet, cannot bind')
        return
      }

      // 3) Signature verification (message signed by connected wallet)
      const message = [
        'PactPay Safe Wallet Binding',
        `Organization: ${organizationId}`,
        `Safe: ${safeInfo.address}`,
        `Network: ${selectedChain.caipChainId}`,
        `Timestamp: ${Date.now()}`
      ].join('\n')

      let signature: string
      try {
        signature = (await (walletProvider as any).request({
          method: 'personal_sign',
          params: [message, address]
        })) as string
      } catch (e) {
        throw new Error((e as any)?.message || 'Signature request was rejected')
      }

      const recovered = verifyMessage(message, signature)
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        setError('You are not the Owner of this Safe Wallet, cannot bind')
        return
      }

      // 4) Save to organization configuration
      await api.organization.bindPaymentAccount({
        address: safeInfo.address,
        caipChainId: selectedChain.caipChainId
      })

      toast({
        title: 'Safe Wallet connected',
        description: 'Safe Wallet address saved'
      })

      await onSuccess()
      onDone()
    } catch (e: any) {
      const msg = e?.message || 'Failed to bind Safe Wallet'
      toast({
        variant: 'destructive',
        title: 'Bind failed',
        description: msg
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Network</Label>
        <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a network" />
          </SelectTrigger>
          <SelectContent>
            {chains.map(chain => (
              <SelectItem key={chain.id} value={chain.id}>
                {chain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Safe Wallet Address</Label>
        <Input
          placeholder="0x..."
          value={safeAddressInput}
          onChange={e => {
            setSafeAddressInput(e.target.value)
            if (error) setError('')
          }}
          className={cn(error && 'border-destructive')}
          disabled={isSubmitting}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleVerifyAndConnect} disabled={isSubmitting || !safeAddressInput.trim()}>
          {isSubmitting ? (
            <>
              <IconLoader2 className="mr-2 size-4 animate-spin" />
              Verifying & Connecting...
            </>
          ) : (
            'Verify & Connect'
          )}
        </Button>
      </div>
    </div>
  )
}

