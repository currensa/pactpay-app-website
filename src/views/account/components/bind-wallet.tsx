import api from '@/apis'
import useAuthStore from '@/stores/auth'
import { getMetaPublicKey } from '@/lib/stealth-key'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconLoader2, IconWallet } from '@tabler/icons-react'
import { ethers } from 'ethers'
import { useState } from 'react'

interface BindWalletProps {
  onSuccess: () => void
}

export default function BindWallet({ onSuccess }: BindWalletProps) {
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setMetaPubSubmitted = useAuthStore(s => s.setMetaPubSubmitted)

  const shortAddress = address ? address.slice(0, 6) + '...' + address.slice(-4) : ''

  const handleConnect = () => {
    open({ view: 'Connect', namespace: 'eip155' })
  }

  const handleSubmit = async () => {
    if (!address || !walletProvider) return
    setError('')
    setLoading(true)
    try {
      // Step 1: sign a fixed seed to derive metaPriv deterministically
      const seedSig = await walletProvider.request<string>({
        method: 'personal_sign',
        params: ['PactPay MetaKey v1', address]
      })
      const metaPriv = ethers.keccak256(ethers.getBytes(seedSig))
      const metaPub = getMetaPublicKey(metaPriv)

      // Step 2: sign metaPub so backend can verify ownership.
      // Wrap in a readable prefix and hex-encode the UTF-8 bytes so MetaMask
      // displays human-readable text instead of raw binary gibberish.
      const metaPubMessage = `PactPay MetaKey Registration:\n${metaPub}`
      const metaPubSig = await walletProvider.request<string>({
        method: 'personal_sign',
        params: [ethers.hexlify(ethers.toUtf8Bytes(metaPubMessage)), address]
      })

      await api.auth.submitMetaPub({ address, metaPub, signature: metaPubSig })
      setMetaPubSubmitted(true)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-[60px] px-4 py-8 lg:gap-[80px] lg:px-[80px] lg:py-[80px]">
      <div className="flex flex-col gap-[8px]">
        <h1 className="text-[32px] font-bold leading-[48px] text-[#1c1c26]">
          Bind Your Wallet
        </h1>
        <p className="text-[16px] leading-[24px] text-[#606067]">
          To receive payments via StealthPay, you need to register your wallet's meta public key.
          This is a one-time setup that enables privacy-preserving payroll.
        </p>
      </div>

      <div className="flex flex-col gap-[24px]">
        {isConnected && address ? (
          <div className="flex items-center gap-[12px] rounded-[16px] border border-[#d9d9db] px-[16px] py-[14px]">
            <div className="size-[10px] shrink-0 rounded-full bg-green-500" />
            <span className="text-[16px] leading-[24px] text-[#1c1c26]">{shortAddress}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            className="flex items-center justify-center gap-[8px] rounded-full border border-[#d9d9db] bg-white px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-[#1c1c26] transition-opacity hover:opacity-90"
          >
            <IconWallet className="h-[24px] w-[24px]" />
            <span>Connect Wallet</span>
          </button>
        )}

        {error && <p className="text-[14px] text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isConnected || !address || loading}
          className="flex items-center justify-center gap-[8px] rounded-full bg-[#875dff] px-[24px] py-[14px] text-[16px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <IconLoader2 className="h-[24px] w-[24px] animate-spin" />
          ) : (
            <span>Register MetaKey</span>
          )}
        </button>

        <p className="text-[13px] leading-[20px] text-[#8d8d93]">
          This will prompt two wallet signatures: one to derive your meta key, and one to prove ownership.
          No transaction will be sent.
        </p>
      </div>
    </div>
  )
}
