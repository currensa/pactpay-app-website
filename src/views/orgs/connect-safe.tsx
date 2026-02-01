import api from '@/apis'
import { SafeWalletApi } from '@/apis/safe-wallet.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import Safe from '@safe-global/protocol-kit'
import { IconArrowLeft, IconArrowRight, IconCheck, IconLoader2, IconShield } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Chain {
  id: string
  key: string
  name: string
  iconUrl: string
  chainId: string
  ecosystem: string
  caipChainId: string
}

interface SafeInfo {
  address: string
  threshold: number
  owners: string[]
  version: string
}

export default function ConnectSafeWallet() {
  const navigate = useNavigate()
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')

  const [chains, setChains] = useState<Chain[]>([])
  const [loadingChains, setLoadingChains] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<string>('')
  const [safeInfos, setSafeInfos] = useState<SafeInfo[]>([])
  const [loadingSafes, setLoadingSafes] = useState(false)
  const [inputSafeAddress, setInputSafeAddress] = useState('')
  const [selectedSafeAddress, setSelectedSafeAddress] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Get organizationId from localStorage
  const organizationId = localStorage.getItem('organizationId')

  useEffect(() => {
    if (!organizationId) {
      navigate('/account/identity', { replace: true })
      return
    }
    loadChains()
  }, [organizationId, navigate])

  // Load Safe addresses when network is selected and wallet is connected
  useEffect(() => {
    if (selectedNetwork && isConnected && address) {
      loadSafeAddresses()
    } else {
      setSafeInfos([])
      setSelectedSafeAddress('')
      setInputSafeAddress('')
      setVerifyError('')
    }
  }, [selectedNetwork, isConnected, address])

  const loadChains = async () => {
    try {
      setLoadingChains(true)
      const data = await api.chainAsset.getChains()
      setChains(data)
      // Set first chain as default selection
      if (data.length > 0) {
        setSelectedNetwork(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load chains:', error)
    } finally {
      setLoadingChains(false)
    }
  }

  const loadSafeAddresses = async () => {
    if (!address || !selectedNetwork) {
      return
    }

    const selectedChain = chains.find(chain => chain.id === selectedNetwork)
    if (!selectedChain) {
      return
    }

    try {
      setLoadingSafes(true)
      const chainId = BigInt(selectedChain.chainId)
      const safeApi = new SafeWalletApi(chainId)
      const response = await safeApi.getSafesByOwner(address)

      // getSafesByOwner returns { safes: string[] }
      const safeAddresses = response.safes || []

      // Fetch detailed info for each Safe using protocol-kit
      const safeInfoPromises = safeAddresses.map(async safeAddress => {
        try {
          if (!walletProvider || !address) {
            throw new Error('Wallet provider or address not available')
          }
          const protocolKit = await Safe.init({
            provider: walletProvider as any,
            signer: address,
            safeAddress: safeAddress
          })
          const threshold = await protocolKit.getThreshold()
          const ownerAddresses = await protocolKit.getOwners()
          const contractVersion = protocolKit.getContractVersion()
          return {
            address: safeAddress,
            threshold: Number(threshold),
            owners: ownerAddresses,
            version: contractVersion
          }
        } catch (error) {
          console.error(`Failed to load info for Safe ${safeAddress}:`, error)
          // Return basic info if detailed fetch fails
          return {
            address: safeAddress,
            threshold: 0,
            owners: [],
            version: 'Unknown'
          }
        }
      })

      const safeInfos = await Promise.all(safeInfoPromises)
      setSafeInfos(safeInfos)

      // Auto-select if only one Safe
      if (safeInfos.length === 1) {
        setSelectedSafeAddress(safeInfos[0].address)
      }
    } catch (error) {
      console.error('Failed to load Safe addresses:', error)
      setSafeInfos([])
    } finally {
      setLoadingSafes(false)
    }
  }

  const handleBack = () => {
    navigate('/account/organization/create')
  }

  const handleVerifyAndAddSafe = async () => {
    if (!inputSafeAddress.trim() || !selectedNetwork) {
      return
    }

    const selectedChain = chains.find(chain => chain.id === selectedNetwork)
    if (!selectedChain) {
      return
    }

    setIsVerifying(true)
    setVerifyError('')

    try {
      const chainId = BigInt(selectedChain.chainId)
      const safeApi = new SafeWalletApi(chainId)

      // Verify if the address is a valid Safe wallet
      const safeInfo = await safeApi.getSafeInfo(inputSafeAddress.trim())

      // Check if this Safe is already in the list
      const existingIndex = safeInfos.findIndex(info => info.address.toLowerCase() === safeInfo.address.toLowerCase())

      if (existingIndex >= 0) {
        // If already exists, just select it
        setSelectedSafeAddress(safeInfo.address)
        setInputSafeAddress('')
      } else {
        // Add to list and select it
        const newSafeInfo: SafeInfo = {
          address: safeInfo.address,
          threshold: safeInfo.threshold,
          owners: safeInfo.owners,
          version: safeInfo.version
        }
        setSafeInfos(prev => [...prev, newSafeInfo])
        setSelectedSafeAddress(safeInfo.address)
        setInputSafeAddress('')
      }
    } catch (error: any) {
      console.error('Failed to verify Safe wallet:', error)
      setVerifyError(error?.message || 'Invalid Safe wallet address. Please check the address and network.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConnectSafe = async () => {
    if (!selectedSafeAddress || !selectedNetwork || !organizationId) {
      return
    }

    const selectedChain = chains.find(chain => chain.id === selectedNetwork)
    if (!selectedChain) {
      return
    }

    setIsConnecting(true)
    try {
      // Call bindPaymentAccount API
      await api.organization.bindPaymentAccount({
        address: selectedSafeAddress,
        caipChainId: selectedChain.caipChainId
      })

      // Navigate to dashboard after successful connection
      navigate('/orgs/dashboard', { replace: true })
    } catch (error) {
      console.error('Failed to connect Safe wallet:', error)
      // TODO: Show error message to user
    } finally {
      setIsConnecting(false)
    }
  }

  if (!organizationId) {
    return null
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connect your Safe Wallet</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your Safe Wallet will be used for all payouts. Funds stay in your wallet, PactPay never holds custody.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connect Safe Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Select Network */}
            <div className="space-y-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Select Network</h3>
                {loadingChains ? (
                  <div className="flex items-center justify-center py-6">
                    <IconLoader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                      {chains.map(chain => {
                        const isSelected = selectedNetwork === chain.id
                        return (
                          <button
                            key={chain.id}
                            type="button"
                            onClick={() => setSelectedNetwork(chain.id)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
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
                    <p className="text-muted-foreground mt-2 text-xs">
                      The network you choose determines which blockchain your transactions will occur on.
                    </p>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Safe Wallet Address */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Safe Wallet Address</h3>

              {loadingSafes ? (
                <div className="flex items-center justify-center py-6">
                  <IconLoader2 className="text-muted-foreground size-5 animate-spin" />
                  <span className="text-muted-foreground ml-2 text-sm">Loading Safe addresses...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Safe Wallet List */}
                  {safeInfos.length > 0 && (
                    <div className="grid gap-2">
                      {safeInfos.map((safeInfo, index) => {
                        const isSelected = selectedSafeAddress === safeInfo.address
                        return (
                          <button
                            key={`${safeInfo.address}-${index}`}
                            type="button"
                            onClick={() => {
                              setSelectedSafeAddress(safeInfo.address)
                              setInputSafeAddress('')
                              setVerifyError('')
                            }}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all',
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30 hover:bg-muted/50'
                            )}
                          >
                            <div
                              className={cn(
                                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                                isSelected
                                  ? 'border-primary text-primary-foreground bg-primary'
                                  : 'border-muted-foreground/30'
                              )}
                            >
                              {isSelected && <IconCheck className="size-3 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-sm break-all">{safeInfo.address}</div>
                              <div className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Owners:</span>
                                  <span>{safeInfo.owners.length}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Threshold:</span>
                                  <span>
                                    {safeInfo.threshold} of {safeInfo.owners.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Version:</span>
                                  <span>{safeInfo.version}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Add Custom Safe Address */}
                  <div className="space-y-2">
                    {safeInfos.length > 0 && (
                      <div className="text-muted-foreground text-xs">Or enter a custom Safe address to add</div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter Safe Wallet address"
                        value={inputSafeAddress}
                        onChange={e => {
                          setInputSafeAddress(e.target.value)
                          setVerifyError('')
                        }}
                        className={cn(verifyError && 'border-destructive')}
                        disabled={isVerifying}
                      />
                      <Button
                        onClick={handleVerifyAndAddSafe}
                        disabled={!inputSafeAddress.trim() || isVerifying || !selectedNetwork}
                        variant="outline"
                      >
                        {isVerifying ? (
                          <>
                            <IconLoader2 className="mr-2 size-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Add'
                        )}
                      </Button>
                    </div>
                    {verifyError && <p className="text-destructive text-xs">{verifyError}</p>}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Why Safe Wallet? */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <IconShield className="text-primary size-4" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-semibold">Why Safe Wallet?</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Safe (formerly Gnosis Safe) is a multi-signature wallet that provides enhanced security for your
                    organization's funds. Multiple approvals are required for transactions.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={handleBack}>
            <IconArrowLeft className="mr-2 size-4" />
            Back
          </Button>
          <Button onClick={handleConnectSafe} disabled={!selectedSafeAddress || isConnecting} size="lg">
            {isConnecting ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Safe Wallet
                <IconArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
