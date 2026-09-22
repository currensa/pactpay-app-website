import api from '@/apis'
import { deriveNaclKeyPair, secretboxEncryptWithKey } from '@/lib/gravarc/naclCrypto'
import { poseidonHash, secretStringToField } from '@/lib/gravarc/poseidon'
import useAuthStore from '@/stores/auth'
import { usePublicCopy } from '@/views/public/copy'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { IconLoader2, IconWallet } from '@tabler/icons-react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useWalletClient } from 'wagmi'
import { privacyProfilePayloadHash, signWalletChallenge } from '@/lib/wallet-authorization'

interface BindWalletProps {
  onSuccess: () => void
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')
}

export default function BindWallet({ onSuccess }: BindWalletProps) {
  const { copy } = usePublicCopy()
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { data: walletClient } = useWalletClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [rememberLocally, setRememberLocally] = useState(false)
  const checkPrivacyProfile = useAuthStore(s => s.checkPrivacyProfile)
  const setGravArcUserInfo = useAuthStore(s => s.setGravArcUserInfo)
  const gravArcUserInfo = useAuthStore(s => s.gravArcUserInfo)

  // Guard: if wallet already bound, skip this step
  useEffect(() => {
    if (gravArcUserInfo !== null) {
      onSuccess()
    }
  }, [])

  const shortAddress = address ? address.slice(0, 6) + '...' + address.slice(-4) : ''

  const handleConnect = () => {
    open({ view: 'Connect', namespace: 'eip155' })
  }

  const handleSubmit = async () => {
    if (!address || !walletClient) return
    if (!passwordInput) { setError('Password cannot be empty'); return }

    setError('')
    setLoading(true)
    try {
      setStep('Signing with wallet…')
      // One EIP-712 sign → seed used for both secretbox key and box key pair
      const keyPair = await deriveNaclKeyPair(passwordInput, walletClient as Parameters<typeof deriveNaclKeyPair>[1])

      // Generate 31 chars of random printable ASCII for full entropy
      const charset = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join('')
      const secretBytes = crypto.getRandomValues(new Uint8Array(31))
      const actualSecret = Array.from(secretBytes).map(b => charset[b % charset.length]).join('')

      setStep('Computing secret hash…')
      const field = await secretStringToField(actualSecret)
      const hashBigint = await poseidonHash([field])
      const secretHash = '0x' + hashBigint.toString(16).padStart(64, '0')

      const encryptedSecret = secretboxEncryptWithKey(actualSecret, keyPair.secretKey)
      const encPubkey = bytesToHex(keyPair.publicKey)

      setStep('Saving…')
      const payloadHash = privacyProfilePayloadHash(encryptedSecret, secretHash, encPubkey)
      const challenge = await api.auth.getWalletChallenge({
        address,
        family: 'evm',
        action: 'privacy-profile-register',
        payloadHash,
      })
      const signature = await signWalletChallenge(
        walletClient as unknown as Parameters<typeof signWalletChallenge>[0],
        address,
        challenge,
      )
      await api.auth.saveGravArcUserInfo({
        address,
        family: 'evm',
        encryptedSecret,
        secretHash,
        encPubkey,
        authorization: { nonce: challenge.nonce, signature },
      })

      const info = {
        userId: localStorage.getItem('userId') ?? '',
        address,
        encryptedSecret,
        secretHash,
        encPubkey,
      }
      if (rememberLocally) {
        localStorage.setItem('gravArcUserInfo', JSON.stringify(info))
      }
      setGravArcUserInfo(info)
      await checkPrivacyProfile()
      onSuccess()
    } catch (err: any) {
      if (axios.isAxiosError(err)) return
      setError(err?.message || copy.bindWallet.submitFailed)
    } finally {
      setLoading(false)
      setStep('')
    }
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

        {/* Form inputs — only shown when wallet is connected */}
        {isConnected && (
          <div className="flex flex-col gap-[12px]">
            <input
              type="password"
              placeholder="Password (for key derivation)"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              autoComplete="new-password"
              className="h-[46px] rounded-[12px] border border-[rgba(0,0,0,0.12)] px-[14px] text-[14px] leading-[22px] text-[#1c1c26] outline-none placeholder:text-[#8d8d93] focus:border-[#5e85ee]"
            />
            <label className="flex cursor-pointer select-none items-center gap-[8px]">
              <input
                type="checkbox"
                checked={rememberLocally}
                onChange={e => setRememberLocally(e.target.checked)}
                className="size-[16px] cursor-pointer accent-[#5e85ee]"
              />
              <span className="text-[13px] leading-[20px] text-[#606067]">
                {copy.bindWallet.rememberLocally}
              </span>
            </label>
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
            disabled={loading || !walletClient}
            className="flex h-[50px] w-full items-center justify-center gap-[8px] rounded-[14px] bg-[#5e85ee] text-[15px] font-bold leading-[24px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <IconLoader2 className="size-[20px] animate-spin" /> : copy.bindWallet.confirm}
          </button>
        )}
      </div>
    </div>
  )
}
