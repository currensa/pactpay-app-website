import api from '@/apis'
import type { NotificationPreference, UpdateNotificationPreferencesPayload } from '@/apis/notification.api'
import { useToast } from '@/components/ui/use-toast'
import { getMetaPublicKey } from '@/lib/stealth-key'
import { formatDateTime } from '@/lib/utils'
import ChangeEmailDialog from '@/views/member/components/change-email-dialog'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconChevronDown, IconEye, IconEyeOff, IconRefresh } from '@tabler/icons-react'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'

const LANGUAGES = ['English']

const NOTIFICATION_ITEMS = [
  { key: 'paymentsClaim', apiKey: 'payments_claim', label: 'Payments & claim' },
  { key: 'organizationInvitesUpdates', apiKey: 'organization_invites_updates', label: 'Organization invites & updates' },
  { key: 'securityLogin', apiKey: 'security_login', label: 'Security & login' },
] as const

type NotificationStateKey = (typeof NOTIFICATION_ITEMS)[number]['key']

type NotificationSettingsState = Record<NotificationStateKey, boolean>

const DEFAULT_NOTIFICATIONS: NotificationSettingsState = {
  paymentsClaim: true,
  organizationInvitesUpdates: true,
  securityLogin: true,
}

function mapPreferencesToState(preferences: NotificationPreference[]): NotificationSettingsState {
  const nextState = { ...DEFAULT_NOTIFICATIONS }

  for (const preference of preferences) {
    const item = NOTIFICATION_ITEMS.find(entry => entry.apiKey === preference.key)
    if (!item) continue
    nextState[item.key] = preference.enabled
  }

  return nextState
}

function maskAddress(address: string) {
  if (address.length <= 6) return address
  return address.slice(0, 3) + '*'.repeat(Math.max(address.length - 6, 5)) + address.slice(-3)
}

export default function MemberSettings() {
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const { toast } = useToast()

  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showUid, setShowUid] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSettingsState>(DEFAULT_NOTIFICATIONS)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [updatingNotificationKey, setUpdatingNotificationKey] = useState<NotificationStateKey | null>(null)
  const [language, setLanguage] = useState('English')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

  const [email, setEmail] = useState('')
  const [uid, setUid] = useState('')
  const [walletAddress, setWalletAddress] = useState('')

  // Personal Token
  const [personalToken, setPersonalToken] = useState('')
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<Date | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    api.auth.getUserAuths(userId).then(list => {
      for (const item of list) {
        if (item.type === 'email') setEmail(item.account)
        if (item.type === 'wallet') setWalletAddress(item.account)
      }
      setUid(userId)
    }).catch(console.error)

    api.auth.getMySignMessage().then(data => {
      setPersonalToken(data.signMessage)
      setTokenUpdatedAt(new Date(data.updatedAt))
    }).catch(() => { })
  }, [])

  useEffect(() => {
    let active = true

    api.notification.getPreferences()
      .then(data => {
        if (!active) return
        setNotifications(mapPreferencesToState(data.preferences))
      })
      .catch((error: any) => {
        if (!active || error?.response?.status === 401) return
        toast({ description: error?.response?.data?.message || 'Failed to load notification preferences.', variant: 'destructive' })
      })
      .finally(() => {
        if (active) setNotificationsLoading(false)
      })

    return () => {
      active = false
    }
  }, [toast])

  const handleGenerateToken = async () => {
    if (!isConnected || !address || !walletProvider) {
      open({ view: 'Connect', namespace: 'eip155' })
      return
    }
    setTokenLoading(true)
    try {
      // Step 1: get signMessage from server
      const { signMessage } = await api.auth.getMetaPubSignMessage()

      // Step 2: sign → derive metaPriv → derive metaPub
      const signature = await walletProvider.request<string>({
        method: 'personal_sign',
        params: [signMessage, address]
      })
      const metaPriv = ethers.keccak256(ethers.getBytes(signature))
      const metaPub = getMetaPublicKey(metaPriv)

      // Step 3: submit
      await api.auth.submitMetaPub({ address, signMessage, signature, metaPub })

      // Step 4: fetch updated token
      const data = await api.auth.getMySignMessage()
      setPersonalToken(data.signMessage)
      setTokenUpdatedAt(new Date(data.updatedAt))
      toast({ description: (data as any).message || 'Updated successfully!' })
    } catch (err: any) {
      toast({ description: err?.response?.data?.message || 'Failed to generate token. Please try again.', variant: 'destructive' })
    } finally {
      setTokenLoading(false)
    }
  }

  const toggleNotification = async (key: NotificationStateKey) => {
    if (notificationsLoading || updatingNotificationKey) return

    const payload = { [key]: !notifications[key] } as UpdateNotificationPreferencesPayload

    try {
      setUpdatingNotificationKey(key)
      const data = await api.notification.updatePreferences(payload)
      setNotifications(mapPreferencesToState(data.preferences))
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 400) return
      toast({ description: error?.response?.data?.message || 'Failed to update notification preferences.', variant: 'destructive' })
    } finally {
      setUpdatingNotificationKey(null)
    }
  }

  return (
    <div className="flex flex-col gap-[32px]">
      {/* Account */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">Account</p>
        <div className="flex gap-[20px] items-start bg-white rounded-[32px] pr-[24px]">
          {/* Account info card */}
          <div className="flex-1  p-[24px] flex flex-col gap-[24px]">
            {/* Login Email */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">Login Email</p>
              <div className="flex items-center gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">{email || '—'}</p>
                <button
                  onClick={() => setShowChangeEmail(true)}
                  className="text-[14px] leading-[22px] text-[#5e85ee] hover:opacity-80 transition-opacity"
                >
                  {email ? 'Change' : 'Bind'}
                </button>
              </div>
            </div>

            {/* UID */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">UID</p>
              <div className="flex items-center gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">
                  {uid ? (showUid ? uid : '••••••••••••••') : '—'}
                </p>
                {uid && (
                  <button
                    onClick={() => setShowUid(v => !v)}
                    className="flex items-center text-[#8d8d93] hover:text-[#1c1c26] transition-colors"
                  >
                    {showUid
                      ? <IconEye className="h-[20px] w-[20px]" />
                      : <IconEyeOff className="h-[20px] w-[20px]" />
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Login address */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">Bound Wallet Address (For login and fund claim)</p>
              <div className="flex items-center gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">
                  {walletAddress
                    ? (showAddress ? walletAddress : maskAddress(walletAddress))
                    : '—'}
                </p>
                {walletAddress && (
                  <button
                    onClick={() => setShowAddress(v => !v)}
                    className="flex items-center text-[#8d8d93] hover:text-[#1c1c26] transition-colors"
                  >
                    {showAddress
                      ? <IconEye className="h-[20px] w-[20px]" />
                      : <IconEyeOff className="h-[20px] w-[20px]" />
                    }
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Personal Token card */}
          <div className="w-[420px] shrink-0 bg-[rgba(94,133,238,0.08)] rounded-[20px] p-[20px] flex flex-col gap-[16px] my-[auto]">
            {/* Header */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between">
                <p className="text-[16px] font-bold leading-[24px] text-[#1c1c26]">Privacy Identity</p>
                {tokenUpdatedAt && (
                  <span className="flex items-center border border-[rgba(0,0,0,0.12)] rounded-[100px] px-[10px] py-[2px] text-[12px] leading-[20px] whitespace-nowrap">
                    <span className="text-[#8d8d93]">Last updated </span>
                    <span className="text-[#1c1c26] ml-[2px]">{formatDateTime(tokenUpdatedAt)}</span>
                  </span>
                )}
              </div>
              <p className="text-[13px] leading-[20px] text-[#606067]">
                Update your privacy identity credential to keep your on-chain activity private. This privacy identity links your wallet to the organization without revealing your identity. Refresh it periodically for better security.
              </p>
            </div>
            {/* Refresh button */}
            <button
              onClick={handleGenerateToken}
              disabled={tokenLoading}
              className="flex items-center justify-center gap-[6px] w-full py-[8px] rounded-[12px] bg-[#5e85ee] text-white text-[13px] leading-[20px] hover:opacity-90 transition-opacity disabled:opacity-60"
              title="Refresh token"
            >
              <IconRefresh className={`h-[14px] w-[14px] ${tokenLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">Notifications</p>
        <div className="bg-white rounded-[32px] p-[24px] flex flex-col gap-[16px] min-h-[152px]">
          {notificationsLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-[13px] text-[#8d8d93]">Loading...</div>
            </div>
          ) : (
            NOTIFICATION_ITEMS.map(({ key, label }, i, arr) => {
              const disabled = updatingNotificationKey !== null

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between ${i < arr.length - 1 ? 'pb-[16px] border-b border-[rgba(0,0,0,0.12)]' : ''}`}
                >
                  <p className="text-[16px] leading-[24px] text-[#1c1c26]">{label}</p>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleNotification(key)}
                    className={`relative h-[28px] w-[50px] rounded-full transition-colors ${notifications[key] ? 'bg-[#5e85ee]' : 'bg-[rgba(0,0,0,0.12)]'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span
                      className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white transition-all ${notifications[key] ? 'right-[2px]' : 'left-[2px]'}`}
                    />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Language */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">Language</p>
        <div className="bg-white rounded-[32px] p-[24px]">
          <div className="flex items-center justify-between">
            <p className="text-[16px] leading-[24px] text-[#1c1c26]">Preferred language</p>
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(v => !v)}
                className="flex items-center gap-[8px] justify-between min-w-[140px] px-[16px] py-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] text-[16px] leading-[24px] text-[#1c1c26]"
              >
                <span>{language}</span>
                <IconChevronDown className={`h-[20px] w-[20px] text-[#1c1c26] transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageDropdown && (
                <div className="absolute right-0 bottom-full mb-[4px] min-w-[140px] bg-white rounded-[12px] border border-[rgba(0,0,0,0.12)] shadow-lg z-10 overflow-hidden">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLanguageDropdown(false) }}
                      className={`w-full text-left px-[16px] py-[10px] text-[16px] leading-[24px] hover:bg-[#f5f5f5] transition-colors ${lang === language ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <ChangeEmailDialog
        open={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        onSuccess={(boundEmail) => setEmail(boundEmail)}
        userId={uid}
        currentEmail={email}
        mode={email ? 'change' : 'bind'}
      />
    </div>
  )
}
