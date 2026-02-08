import api from '@/apis'
import type { Chain } from '@/apis/orgnization.api'
import { SafeWalletApi } from '@/apis/safe-wallet.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface SafeOwnerDetails {
  address: string
  email: string
  description: string
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
  
  // New state for owner details
  const [verifiedSafeInfo, setVerifiedSafeInfo] = useState<any>(null)
  const [ownersDetails, setOwnersDetails] = useState<SafeOwnerDetails[]>([])

  const selectedChain = useMemo(() => chains.find(c => c.id === selectedNetworkId), [chains, selectedNetworkId])

  useEffect(() => {
    if (!open) {
      setSelectedNetworkId('')
      setSafeAddressInput('')
      setError('')
      setIsSubmitting(false)
      setVerifiedSafeInfo(null)
      setOwnersDetails([])
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

  const handleVerify = async () => {
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
        console.log('Safe Info:', safeInfo)
      } catch {
        setError('Address does not exist on the selected network, please check address and network')
        setIsSubmitting(false)
        return
      }

      // 2) Ownership check (owner list)
      const owners: string[] = safeInfo?.owners || []
      const isOwner = owners.some(o => o.toLowerCase() === address.toLowerCase())
      if (!isOwner) {
        setError('You are not the Owner of this Safe Wallet, cannot bind')
        setIsSubmitting(false)
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
        setIsSubmitting(false)
        return
      }

      // Verification success, prepare for details input
      setVerifiedSafeInfo(safeInfo)
      setOwnersDetails(owners.map(addr => ({
        address: addr,
        email: '',
        description: ''
      })))
      
    } catch (e: any) {
      const msg = e?.message || 'Failed to verify Safe Wallet'
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: msg
      })
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBind = async () => {
    if (!verifiedSafeInfo || !selectedChain) return
    
    setIsSubmitting(true)
    try {
      // 4) Save to organization configuration
      await api.organization.bindPaymentAccount({
        address: verifiedSafeInfo.address,
        caipChainId: selectedChain.caipChainId,
        owners: ownersDetails
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

  if (verifiedSafeInfo) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="text-sm font-semibold mb-1">Verified Safe Wallet</div>
          <div className="text-xs text-muted-foreground font-mono">{verifiedSafeInfo.address}</div>
          <div className="text-xs text-muted-foreground mt-1">Network: {selectedChain?.name}</div>
        </div>

        <div className="space-y-4">
          <Label>Owner Details (Required for transaction notifications)</Label>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {ownersDetails.map((owner, index) => (
              <div key={owner.address} className="p-3 border rounded-md space-y-2">
                <div className="text-xs font-mono bg-muted px-2 py-1 rounded w-fit mb-2">
                  {owner.address}
                </div>
                <div className="grid gap-2">
                  <Input 
                    placeholder="Email" 
                    value={owner.email}
                    onChange={(e) => {
                      const newOwners = [...ownersDetails]
                      newOwners[index].email = e.target.value
                      setOwnersDetails(newOwners)
                    }}
                    className="h-8 text-sm"
                  />
                  <Input 
                    placeholder="Description (e.g. Name or Role)" 
                    value={owner.description}
                    onChange={(e) => {
                      const newOwners = [...ownersDetails]
                      newOwners[index].description = e.target.value
                      setOwnersDetails(newOwners)
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={() => setVerifiedSafeInfo(null)} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="button" onClick={handleBind} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                Binding...
              </>
            ) : (
              'Confirm & Bind'
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Network</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {chains.map(chain => {
            const isSelected = selectedNetworkId === chain.id
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => setSelectedNetworkId(chain.id)}
                disabled={isSubmitting}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                  isSubmitting && 'cursor-not-allowed opacity-50'
                )}
              >
                <img
                  src={chain.iconUrl}
                  alt={chain.name}
                  className={cn('size-4', isSelected ? 'opacity-100' : 'opacity-60')}
                />
                <span
                  className={cn(
                    'text-center text-xs font-medium',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {chain.name}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          The network you choose determines which blockchain your transactions will occur on.
        </p>
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
        <Button type="button" onClick={handleVerify} disabled={isSubmitting || !safeAddressInput.trim()}>
          {isSubmitting ? (
            <>
              <IconLoader2 className="mr-2 size-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </div>
    </div>
  )
}

