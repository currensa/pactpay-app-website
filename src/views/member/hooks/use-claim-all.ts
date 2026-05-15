import apis from '@/apis'
import { useToast } from '@/components/ui/use-toast'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import axios from 'axios'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useClaimAll() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { open } = useAppKit()
  const { address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const userAction = useRef(false)
  const [verifying, setVerifying] = useState(false)

  const runClaimAll = async (provider: Provider, addr: string) => {
    try {
      setVerifying(true)
      const { nonce } = await apis.auth.getNonce()
      const signature = await provider.request<string>({
        method: 'personal_sign',
        params: [nonce, addr],
      })
      const result = await apis.auth.verifyMetaPub({ address: addr, nonce, signature })
      if (!result.verified) {
        toast({ title: 'Verification failed', description: result.reason, variant: 'destructive' })
        return
      }
      sessionStorage.setItem('metapub-verify-token', result.token)
      navigate('/member/claim')
    } catch (error: any) {
      if (axios.isAxiosError(error)) return
      toast({
        title: 'Error',
        description: error?.message || 'Wallet verification failed.',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleClaimAll = () => {
    if (!address || !walletProvider) {
      open({ view: 'Connect', namespace: 'eip155' })
      userAction.current = true
      return
    }
    runClaimAll(walletProvider, address)
  }

  return { verifying, userAction, address, walletProvider, handleClaimAll, runClaimAll }
}
