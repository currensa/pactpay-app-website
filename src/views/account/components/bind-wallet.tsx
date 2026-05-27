import api from '@/apis'
import { prepareMetaPubSubmission } from '@/lib/meta-pub'
import useAuthStore from '@/stores/auth'
import { usePublicCopy } from '@/views/public/copy'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconLoader2, IconWallet } from '@tabler/icons-react'
import axios from 'axios'
import { useEffect, useState } from 'react'

interface BindWalletProps {
  onSuccess: () => void
}

export default function BindWallet({ onSuccess }: BindWalletProps) {
  const { copy } = usePublicCopy()
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('')
  const [checking, setChecking] = useState(true)
  const metaPubSubmitted = useAuthStore(s => s.metaPubSubmitted)
  const checkMetaPub = useAuthStore(s => s.checkMetaPub)
  const setMetaPubSubmitted = useAuthStore(s => s.setMetaPubSubmitted)
  const setMetaPub = useAuthStore(s => s.setMetaPub)

  // Guard: if wallet already bound, skip this step
  useEffect(() => {
    const guard = async () => {
      // If already known to be submitted, redirect immediately
      if (metaPubSubmitted === true) {
        onSuccess()
        return
      }
      // If unknown (null), fetch from server
      if (metaPubSubmitted === null) {
        const submitted = await checkMetaPub()
        if (submitted) {
          onSuccess()
          return
        }
      }
      setChecking(false)
    }
    guard()
  }, [])

  const shortAddress = address ? address.slice(0, 6) + '...' + address.slice(-4) : ''

  const handleConnect = () => {
    open({ view: 'Connect', namespace: 'eip155' })
  }

  const handleSubmit = async () => {
    if (!address || !walletProvider) return
    setError('')
    setLoading(true)
    try {
      const { metaPub, signMessage, metaPubSignature } = await prepareMetaPubSubmission(
        walletProvider,
        address,
        setStep,
      )
      await api.auth.submitMetaPub({ address, metaPub, signMessage, metaPubSignature })
      setMetaPub(metaPub)
      setMetaPubSubmitted(true)
      onSuccess()
    } catch (err: any) {
      if (axios.isAxiosError(err)) return
      setError(err?.message || copy.bindWallet.submitFailed)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <IconLoader2 className="size-7 animate-spin text-[#77777d]" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[56px]">
      {/* Heading */}
      <div className="text-center">
        <p
          className="text-[44px] leading-[56px] tracking-[-0.88px] text-[#bbbbbe]"
          style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
        >
          {copy.bindWallet.titleTop}
        </p>
        <p
          className="text-[72px] font-bold leading-none tracking-[-1.44px] text-[#1c1c26]"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {copy.bindWallet.titleBottom}
        </p>
      </div>

      {/* Card */}
      <div className="flex w-[420px] flex-col gap-[26px] rounded-[32px] bg-white p-[26px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
        {/* Info box */}
        <div className="flex flex-col gap-[24px] rounded-[24px] bg-[#f5f5f5] p-[20px]">
          {/* Header row */}
          <div className="flex items-center justify-between rounded-full bg-white px-[14px] py-[7px]">
            <span className="text-[18px] font-bold leading-[28px] text-[#1c1c26]">{copy.bindWallet.cardTitle}</span>
            <IconWallet className="size-[20px] text-[#1c1c26]" />
          </div>
          {/* Bullet list */}
          <ul className="list-disc space-y-[2px] pl-[20px] text-[14px] leading-[22px] text-[#606067]">
            <span>{copy.bindWallet.description}</span>
          </ul>
        </div>

        {/* Connected address indicator */}
        {isConnected && address && (
          <div className="flex items-center gap-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[14px] py-[11px]">
            <div className="size-[8px] shrink-0 rounded-full bg-[#5ddd22]" />
            <span className="text-[14px] leading-[22px] text-[#1c1c26]">{shortAddress}</span>
          </div>
        )}

        {/* Step hint */}
        {step && !error && <p className="text-[13px] leading-[20px] text-[#606067]">{step}</p>}

        {/* Error */}
        {error && <p className="text-[13px] leading-[20px] text-[#d92b2b]">{error}</p>}

        {/* Button */}
        {!isConnected ? (
          <button
            type="button"
            onClick={handleConnect}
            className="flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[#5e85ee] text-[15px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90"
          >
            {copy.bindWallet.connectWallet}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex h-[50px] w-full items-center justify-center gap-[8px] rounded-[14px] bg-[#5e85ee] text-[15px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <IconLoader2 className="size-[20px] animate-spin" /> : copy.bindWallet.confirm}
          </button>
        )}
      </div>
    </div>
  )
}
