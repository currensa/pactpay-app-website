import api from '@/apis'
import type { Chain } from '@/apis/orgnization.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useAppKit, useAppKitAccount, useAppKitNetwork, useAppKitProvider } from '@reown/appkit/react'
import Safe, { PredictedSafeProps } from '@safe-global/protocol-kit'
import { IconAlertCircle, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { Address, Chain as ViemChain, createPublicClient, custom, formatEther } from 'viem'

interface CreateSafeWalletWizardProps {
  open: boolean
  chains: Chain[]
  canManage: boolean
  onSuccess: () => void | Promise<void>
  onDone: () => void
}

export function CreateSafeWalletWizard({
  open,
  chains,
  canManage,
  onSuccess,
  onDone
}: CreateSafeWalletWizardProps) {
  const { open: openAppKit } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId: currentWalletChainId } = useAppKitNetwork()
  const { walletProvider } = useAppKitProvider('eip155')

  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState('')

  // Multi-sig states from demo
  interface SafeOwner {
    address: string
    email: string
    description: string
  }
  const [owners, setOwners] = useState<SafeOwner[]>([])
  const [threshold, setThreshold] = useState<number>(1)
  
  // New owner input states
  const [newOwnerAddress, setNewOwnerAddress] = useState<string>('')
  const [newOwnerEmail, setNewOwnerEmail] = useState<string>('')
  const [newOwnerDescription, setNewOwnerDescription] = useState<string>('')

  const selectedChain = useMemo(() => chains.find(c => c.id === selectedNetworkId), [chains, selectedNetworkId])
  const selectedChainIdNumber = selectedChain ? Number(selectedChain.chainId) : undefined

  useEffect(() => {
    if (!open) {
      setSelectedNetworkId('')
      setIsCreating(false)
      setStatus('')
      setOwners([])
      setThreshold(1)
      setNewOwnerAddress('')
      setNewOwnerEmail('')
      setNewOwnerDescription('')
      return
    }
    if (!selectedNetworkId && chains.length > 0) {
      setSelectedNetworkId(chains[0].id)
    }
  }, [open, chains, selectedNetworkId])

  // Automatically set current user as the first owner
  useEffect(() => {
    if (address && owners.length === 0) {
      setOwners([{ address, email: '', description: 'Initial Owner' }])
    }
  }, [address, owners.length])

  const addOwner = () => {
    if (newOwnerAddress && /^0x[a-fA-F0-9]{40}$/.test(newOwnerAddress) && !owners.some(o => o.address.toLowerCase() === newOwnerAddress.toLowerCase())) {
      setOwners([...owners, { 
        address: newOwnerAddress, 
        email: newOwnerEmail, 
        description: newOwnerDescription 
      }])
      setNewOwnerAddress('')
      setNewOwnerEmail('')
      setNewOwnerDescription('')
    } else if (newOwnerAddress) {
      toast({
        variant: 'destructive',
        title: 'Invalid address or duplicate',
        description: 'Please enter a valid unique EVM address.'
      })
    }
  }

  const removeOwner = (index: number) => {
    const newOwners = owners.filter((_, i) => i !== index)
    setOwners(newOwners)
    if (threshold > newOwners.length) {
      setThreshold(Math.max(1, newOwners.length))
    }
  }

  const getViemChain = (chainData: Chain): ViemChain => ({
    id: Number(chainData.chainId),
    name: chainData.name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [chainData.rpcUrls?.[0] || ''] },
      public: { http: [chainData.rpcUrls?.[0] || ''] }
    },
    blockExplorers: {
      default: { name: 'Explorer', url: chainData.explorerUrls?.[0] || '' }
    }
  })

  const handleCreate = async () => {
    if (!canManage) {
      toast({
        variant: 'destructive',
        title: 'Permission denied',
        description: 'Only Owner or Pay Admin can create Safe Wallet.'
      })
      return
    }

    if (!isConnected || !walletProvider || !address) {
      openAppKit()
      return
    }

    if (!selectedChain || !selectedChainIdNumber) {
      toast({
        variant: 'destructive',
        title: 'Network required',
        description: 'Please select a network.'
      })
      return
    }

    // B. Validate Owners and Threshold
    const uniqueOwners = Array.from(new Set(owners.map(o => o.address).filter(addr => /^0x[a-fA-F0-9]{40}$/.test(addr))))
    if (uniqueOwners.length < threshold) {
      toast({
        variant: 'destructive',
        title: 'Invalid configuration',
        description: 'Valid owners count is less than the signature threshold.'
      })
      return
    }

    setIsCreating(true)
    setStatus('Initializing...')

    try {
      // A. Network switch (if needed)
      if (currentWalletChainId !== selectedChainIdNumber) {
        setStatus('Switching network in wallet...')
        await (walletProvider as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${selectedChainIdNumber.toString(16)}` }]
        })
      }

      const viemChain = getViemChain(selectedChain)
      const publicClient = createPublicClient({ chain: viemChain, transport: custom(walletProvider as any) })

      setStatus('Predicting Safe address...')

      const predictedSafe: PredictedSafeProps = {
        safeAccountConfig: { owners: uniqueOwners, threshold },
        safeDeploymentConfig: { safeVersion: '1.4.1' }
      }

      const protocolKit = await Safe.init({
        provider: walletProvider as any,
        signer: address,
        predictedSafe
      })

      const predictedAddress = await protocolKit.getAddress()

      // B. Deploy if not deployed
      const isDeployed = await protocolKit.isSafeDeployed()
      if (!isDeployed) {
        // D. Gas check from demo
        setStatus('Checking gas balance...')
        const deployTx = await protocolKit.createSafeDeploymentTransaction()
        const userBalance = await publicClient.getBalance({ address: address as Address })
        const gasPrice = await publicClient.getGasPrice()
        const estimatedGasLimit = 500000n // Roughly 300k-500k gas for deployment
        const totalCost = gasPrice * estimatedGasLimit

        if (userBalance < totalCost) {
          throw new Error(
            `Insufficient balance for gas. Need ~${formatEther(totalCost)} ETH, but have ${formatEther(userBalance)} ETH`
          )
        }

        const client = await protocolKit.getSafeProvider().getExternalSigner()

        setStatus('Requesting wallet signature for deployment...')
        const txHash = (await (client as any).sendTransaction({
          to: deployTx.to,
          value: BigInt(deployTx.value),
          data: deployTx.data,
          chain: viemChain
        })) as `0x${string}`

        setStatus('Waiting for deployment confirmation...')
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 })
      }

      // C. Save to organization config
      // TODO: Backend might need owners and threshold info, currently only address and caipChainId are sent
      await api.organization.bindPaymentAccount({
        address: predictedAddress,
        caipChainId: selectedChain.caipChainId,
        owners: owners.map(o => ({
          address: o.address,
          email: o.email,
          description: o.description
        }))
      })

      toast({
        title: 'Safe Wallet created successfully',
        description: predictedAddress
      })

      setStatus('Safe Wallet created successfully')
      await onSuccess()
      onDone()
    } catch (e: any) {
      console.error('Safe creation error:', e)
      const msg = e?.message || 'Failed to create Safe Wallet'
      toast({
        variant: 'destructive',
        title: 'Create failed',
        description: msg
      })
      setStatus('')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-100">
        <div className="flex items-center gap-2">
          <IconAlertCircle className="size-4 shrink-0" />
          <span>Gas fee required for Safe Wallet creation</span>
        </div>
      </div>

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
                disabled={isCreating}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                  isCreating && 'cursor-not-allowed opacity-50'
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
          The network you choose determines which blockchain your Safe Wallet will be deployed on.
        </p>
      </div>

      <Separator />

      {/* Owners Management */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Owners</Label>
        <div className="space-y-3">
          {owners.map((owner, index) => (
            <div key={index} className="flex flex-col gap-2 border p-3 rounded-md bg-muted/20">
              <div className="flex gap-2 items-center">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">Owner {index + 1}</span>
                <Input
                  value={owner.address}
                  disabled={true} // Address is not editable once added to list for simplicity, remove and add again to change
                  placeholder="0x..."
                  className="font-mono text-sm h-8"
                  readOnly
                />
                {owners.length > 1 && index !== 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => removeOwner(index)}
                    disabled={isCreating}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                 <Input 
                   placeholder="Email" 
                   value={owner.email} 
                   onChange={(e) => {
                     const newOwners = [...owners]
                     newOwners[index].email = e.target.value
                     setOwners(newOwners)
                   }}
                   className="h-8 text-sm"
                   disabled={isCreating}
                 />
                 <Input 
                   placeholder="Description" 
                   value={owner.description} 
                   onChange={(e) => {
                     const newOwners = [...owners]
                     newOwners[index].description = e.target.value
                     setOwners(newOwners)
                   }}
                   className="h-8 text-sm"
                   disabled={isCreating}
                 />
              </div>
            </div>
          ))}
          
          {/* Add New Owner Section */}
          <div className="border border-dashed p-3 rounded-md space-y-3 mt-4">
            <Label className="text-sm text-muted-foreground">Add New Owner</Label>
            <div className="space-y-2">
              <Input
                placeholder="Owner Address (0x...)"
                value={newOwnerAddress}
                onChange={e => setNewOwnerAddress(e.target.value)}
                disabled={isCreating}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Email"
                  value={newOwnerEmail}
                  onChange={e => setNewOwnerEmail(e.target.value)}
                  disabled={isCreating}
                  className="text-sm"
                />
                <Input
                  placeholder="Description"
                  value={newOwnerDescription}
                  onChange={e => setNewOwnerDescription(e.target.value)}
                  disabled={isCreating}
                  className="text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOwner()
                    }
                  }}
                />
              </div>
              <Button variant="secondary" className="w-full" onClick={addOwner} disabled={isCreating || !newOwnerAddress}>
                <IconPlus className="mr-2 size-4" /> Add Owner
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Selection */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label className="text-base font-semibold">Threshold</Label>
          <span className="text-muted-foreground text-sm">
            {threshold} of {owners.length} owner(s)
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Any transaction requires the confirmation of {threshold} owner(s).
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max={owners.length || 1}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary disabled:cursor-not-allowed"
            disabled={isCreating}
          />
        </div>
      </div>

      {status && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-blue-600 animate-pulse">
          <IconLoader2 className="size-4 animate-spin" />
          {status}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onDone} disabled={isCreating}>
          Cancel
        </Button>
        <Button type="button" onClick={handleCreate} disabled={isCreating || !selectedChain}>
          {isCreating ? 'Deploying...' : 'Create & Deploy'}
        </Button>
      </div>
    </div>
  )
}

