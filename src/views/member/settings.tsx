import api from '@/apis'
import type { FavoriteAddressItem } from '@/apis/favorite-address.api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { LANGUAGE_OPTIONS } from '@/i18n/messages'
import useAuthStore from '@/stores/auth'
import useChainAssetStore from '@/stores/chain-asset'
import usePreferenceStore from '@/stores/preference'
import { useTranslation } from '@/utils/i18n'
import AddressBookDialog from '@/views/member/components/address-book-dialog'
import ChangeEmailDialog from '@/views/member/components/change-email-dialog'
import type { Provider } from '@reown/appkit/react'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { IconChevronDown, IconCopy, IconEye, IconEyeOff, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import axios from 'axios'
import { isAddress } from 'ethers'
import { useEffect, useState } from 'react'

const NOTIFICATION_ITEMS = [
  { key: 'paymentsClaim', labelKey: 'settings.notification.paymentsClaim' },
  { key: 'organizationInvitesUpdates', labelKey: 'settings.notification.organizationInvitesUpdates' },
  { key: 'securityLogin', labelKey: 'settings.notification.securityLogin' },
] as const

type NotificationStateKey = (typeof NOTIFICATION_ITEMS)[number]['key']

function maskAddress(address: string) {
  if (address.length <= 6) return address
  return address.slice(0, 3) + '*'.repeat(Math.max(address.length - 6, 5)) + address.slice(-3)
}
function maskSecretValue(value?: string | null) {
  if (!value) return '—'
  if (value.length <= 30) return value
  return `${value.slice(0, 10)}${'*'.repeat(10)}${value.slice(-10)}`
}

export default function MemberSettings() {
  const { open } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const { toast } = useToast()
  const gravArcUserInfo = useAuthStore(s => s.gravArcUserInfo)
  const chains = useChainAssetStore(s => s.chains)
  const fetchChains = useChainAssetStore(s => s.fetchChains)
  const { t } = useTranslation()
  const notifications = usePreferenceStore(s => s.notifications)
  const language = usePreferenceStore(s => s.language)
  const preferencesLoading = usePreferenceStore(s => s.loading)
  const fetchPreferences = usePreferenceStore(s => s.fetchPreferences)
  const updatePreferences = usePreferenceStore(s => s.updatePreferences)
  const updatePreferenceLanguage = usePreferenceStore(s => s.updateLanguage)

  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showUid, setShowUid] = useState(false)
  const [showAddress, setShowAddress] = useState(false)
  const [updatingNotificationKey, setUpdatingNotificationKey] = useState<NotificationStateKey | null>(null)
  const [languageUpdating, setLanguageUpdating] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

  const [email, setEmail] = useState('')
  const [uid, setUid] = useState('')
  const [walletAddress, setWalletAddress] = useState('')

  const [favoriteAddresses, setFavoriteAddresses] = useState<FavoriteAddressItem[]>([])
  const [favoriteAddressesLoading, setFavoriteAddressesLoading] = useState(true)
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [addressDialogMode, setAddressDialogMode] = useState<'create' | 'edit'>('create')
  const [editingAddress, setEditingAddress] = useState<FavoriteAddressItem | null>(null)
  const [addressDialogSaving, setAddressDialogSaving] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [addressToRemove, setAddressToRemove] = useState<FavoriteAddressItem | null>(null)
  const [removingAddress, setRemovingAddress] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    api.auth.getUserAuths().then(list => {
      for (const item of list) {
        if (item.type === 'email') setEmail(item.account)
        if (item.type === 'wallet') setWalletAddress(item.account)
      }
      setUid(userId)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    fetchPreferences().catch(() => { })
  }, [fetchPreferences])

  useEffect(() => {
    fetchChains().catch(() => { })
  }, [fetchChains])

  useEffect(() => {
    let active = true

    api.favoriteAddress.getList({ page: 1, pageSize: 100 })
      .then(data => {
        if (!active) return
        setFavoriteAddresses(data.data ?? [])
      })
      .catch(() => {
        if (!active) return
      })
      .finally(() => {
        if (active) setFavoriteAddressesLoading(false)
      })

    return () => {
      active = false
    }
  }, [toast])

  const addressBookChains = chains.map(chain => ({
    caipChainId: chain.caipChainId,
    name: chain.name,
    iconUrl: chain.iconUrl,
    ecosystem: chain.ecosystem,
  }))

  const getChainName = (caipChainId: string) => {
    return chains.find(chain => chain.caipChainId === caipChainId)?.name ?? caipChainId
  }

  const validateFavoriteAddress = ({ caipChainId, address }: { caipChainId: string; address: string }) => {
    if (!caipChainId) return t('settings.networkRequired')
    if (!address) return t('settings.addressRequired')
    const matchedChain = chains.find(chain => chain.caipChainId === caipChainId)
    if (!matchedChain) return t('settings.networkMissing')
    if (matchedChain.ecosystem?.toLowerCase() === 'evm' && !isAddress(address)) {
      return t('settings.invalidAddress')
    }
    return null
  }

  const handleCopySecretValue = async (value?: string | null) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast({ description: t('settings.copied') })
  }

  const toggleNotification = async (key: NotificationStateKey) => {
    if (preferencesLoading || updatingNotificationKey) return

    try {
      setUpdatingNotificationKey(key)
      await updatePreferences({ notifications: { [key]: !notifications[key] } })
    } catch {
      // request interceptor handles API errors
    } finally {
      setUpdatingNotificationKey(null)
    }
  }

  const updateLanguage = async (nextLanguage: (typeof LANGUAGE_OPTIONS)[number]['value']) => {
    if (languageUpdating || nextLanguage === language) {
      setShowLanguageDropdown(false)
      return
    }

    try {
      setLanguageUpdating(true)
      await updatePreferenceLanguage(nextLanguage)
      setShowLanguageDropdown(false)
    } catch {
      // request interceptor handles API errors
    } finally {
      setLanguageUpdating(false)
    }
  }

  const openCreateAddressDialog = () => {
    setAddressDialogMode('create')
    setEditingAddress(null)
    setAddressDialogOpen(true)
  }

  const openEditAddressDialog = (item: FavoriteAddressItem) => {
    setAddressDialogMode('edit')
    setEditingAddress(item)
    setAddressDialogOpen(true)
  }

  const handleSaveAddress = async (payload: { caipChainId: string; address: string; remark: string }) => {
    try {
      setAddressDialogSaving(true)

      if (addressDialogMode === 'create') {
        const created = await api.favoriteAddress.create(payload)
        setFavoriteAddresses(prev => [created, ...prev])
        toast({ description: t('settings.addressAdded') })
      } else if (editingAddress) {
        const updated = await api.favoriteAddress.update(editingAddress.id, { remark: payload.remark })
        setFavoriteAddresses(prev => prev.map(item => item.id === updated.id ? updated : item))
        toast({ description: t('settings.addressUpdated') })
      }

      setAddressDialogOpen(false)
      setEditingAddress(null)
    } catch {
      // request interceptor handles common API errors
    } finally {
      setAddressDialogSaving(false)
    }
  }

  const handleConfirmRemoveAddress = async () => {
    if (!addressToRemove) return

    try {
      setRemovingAddress(true)
      await api.favoriteAddress.remove(addressToRemove.id)
      setFavoriteAddresses(prev => prev.filter(item => item.id !== addressToRemove.id))
      toast({ description: t('settings.addressRemoved') })
      setRemoveDialogOpen(false)
      setAddressToRemove(null)
    } catch {
      // request interceptor handles common API errors
    } finally {
      setRemovingAddress(false)
    }
  }

  const currentLanguageOption = LANGUAGE_OPTIONS.find(option => option.value === language)

  return (
    <div className="flex flex-col gap-[24px] md:gap-[32px]">
      {/* Account */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">{t('common.account')}</p>
        <div className="flex flex-col gap-[16px] rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:gap-[20px] md:pr-[24px] xl:flex-row xl:items-start xl:p-0 xl:pl-0">
          {/* Account info card */}
          <div className="flex flex-1 flex-col gap-[24px] md:p-[24px]">
            {/* Login Email */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('settings.loginEmail')}</p>
              <div className="flex items-center gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">{email || '—'}</p>
                <button
                  onClick={() => setShowChangeEmail(true)}
                  className="text-[14px] leading-[22px] text-[#5e85ee] hover:opacity-80 transition-opacity"
                >
                  {email ? t('common.change') : t('common.bind')}
                </button>
              </div>
            </div>

            {/* UID */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('settings.uid')}</p>
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
              <p className="text-[14px] leading-[22px] text-[#8d8d93]">{t('settings.boundWalletAddress')}</p>
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

          {/* Privacy Identity cards */}
          <div className="my-[auto] grid w-full shrink-0 gap-[12px] md:grid-cols-1 xl:flex-[0.5] mr-4 ">
            <div className="flex flex-col gap-[16px] rounded-[20px] bg-[rgba(94,133,238,0.08)] p-[20px]">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] font-bold leading-[24px] text-[#1c1c26]">{t('settings.encryptionKeys')}</p>
                <p className="text-[13px] leading-[20px] text-[#606067]">{t('settings.encryptionKeysDescription')}</p>
              </div>
              <div className="flex flex-col gap-[10px]">
                <div className="flex flex-col gap-[4px]">
                  <p className="text-[12px] leading-[18px] text-[#8d8d93]">encPubkey</p>
                  <div className="flex items-center gap-[8px] rounded-[12px] bg-white px-[12px] py-[8px]">
                    <p className="min-w-0 flex-1 font-mono text-[12px] leading-[18px] text-[#1c1c26]">
                      {maskSecretValue(gravArcUserInfo?.encPubkey)}
                    </p>
                    <button
                      type="button"
                      onClick={() => { void handleCopySecretValue(gravArcUserInfo?.encPubkey) }}
                      disabled={!gravArcUserInfo?.encPubkey}
                      className="shrink-0 text-[#8d8d93] transition-colors hover:text-[#1c1c26] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <IconCopy className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-[4px]">
                  <p className="text-[12px] leading-[18px] text-[#8d8d93]">encryptedSecret</p>
                  <div className="flex items-center gap-[8px] rounded-[12px] bg-white px-[12px] py-[8px]">
                    <p className="min-w-0 flex-1 font-mono text-[12px] leading-[18px] text-[#1c1c26]">
                      {maskSecretValue(gravArcUserInfo?.encryptedSecret)}
                    </p>
                    <button
                      type="button"
                      onClick={() => { void handleCopySecretValue(gravArcUserInfo?.encryptedSecret) }}
                      disabled={!gravArcUserInfo?.encryptedSecret}
                      className="shrink-0 text-[#8d8d93] transition-colors hover:text-[#1c1c26] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <IconCopy className="h-[16px] w-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Address Book */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">{t('settings.addressBook')}</p>
        <div className="flex flex-col gap-[20px] rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:p-[24px]">
          <div className="flex flex-col gap-[12px] md:flex-row md:items-start md:justify-between md:gap-[16px]">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.savedAddresses')}</p>
              <p className="text-[14px] leading-[22px] text-[#606067]">
                {t('settings.savedAddressesDescription')}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateAddressDialog}
              disabled={addressBookChains.length === 0}
              className="shrink-0 flex items-center gap-[6px] rounded-[12px] bg-[#5e85ee] px-[14px] py-[8px] text-[13px] leading-[20px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <IconPlus className="h-[14px] w-[14px]" />
              {t('settings.addAddress')}
            </button>
          </div>

          {favoriteAddressesLoading ? (
            <div className="flex min-h-[120px] items-center justify-center text-[13px] text-[#8d8d93]">
              {t('common.loading')}
            </div>
          ) : favoriteAddresses.length === 0 ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-[8px] rounded-[20px] border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-[24px] text-center">
              <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.noSavedAddresses')}</p>
              <p className="text-[13px] leading-[20px] text-[#8d8d93]">
                {t('settings.noSavedAddressesDescription')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {favoriteAddresses.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-[12px] py-[16px] md:flex-row md:items-start md:justify-between md:gap-[16px] ${index < favoriteAddresses.length - 1 ? 'border-b border-[rgba(0,0,0,0.12)]' : ''}`}
                >
                  <div className="min-w-0 flex-1 flex flex-col gap-[6px]">
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <p className="text-[16px] font-medium leading-[24px] text-[#1c1c26]">{item.remark || '-'}</p>
                      <span className="rounded-[999px] bg-[rgba(94,133,238,0.08)] px-[10px] py-[2px] text-[12px] leading-[20px] text-[#5e85ee]">
                        {getChainName(item.caipChainId)}
                      </span>
                    </div>
                    <p className="break-all text-[14px] leading-[22px] text-[#606067]">{item.address}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-[8px]">
                    <button
                      type="button"
                      onClick={() => openEditAddressDialog(item)}
                      className="flex items-center gap-[4px] rounded-[10px] border border-[rgba(0,0,0,0.12)] px-[12px] py-[8px] text-[13px] leading-[20px] text-[#1c1c26] transition-colors hover:bg-[#f5f5f5]"
                    >
                      <IconPencil className="h-[14px] w-[14px]" />
                      {t('settings.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddressToRemove(item); setRemoveDialogOpen(true) }}
                      className="flex items-center gap-[4px] rounded-[10px] border border-[rgba(217,43,43,0.2)] px-[12px] py-[8px] text-[13px] leading-[20px] text-[#d92b2b] transition-colors hover:bg-[rgba(217,43,43,0.06)]"
                    >
                      <IconTrash className="h-[14px] w-[14px]" />
                      {t('common.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">{t('settings.notifications')}</p>
        <div className="flex min-h-[152px] flex-col gap-[16px] rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:p-[24px]">
          {preferencesLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-[13px] text-[#8d8d93]">{t('common.loading')}</div>
            </div>
          ) : (
            NOTIFICATION_ITEMS.map(({ key, labelKey }, i, arr) => {
              const disabled = updatingNotificationKey !== null

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between ${i < arr.length - 1 ? 'pb-[16px] border-b border-[rgba(0,0,0,0.12)]' : ''}`}
                >
                  <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t(labelKey)}</p>
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
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">{t('settings.language')}</p>
        <div className="rounded-[24px] bg-white p-[16px] md:rounded-[32px] md:p-[24px]">
          <div className="flex flex-col gap-[12px] md:flex-row md:items-center md:justify-between">
            <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.preferredLanguage')}</p>
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(v => !v)}
                className="flex items-center gap-[8px] justify-between min-w-[140px] px-[16px] py-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] text-[16px] leading-[24px] text-[#1c1c26]"
              >
                <span>{currentLanguageOption ? t(currentLanguageOption.labelKey) : language}</span>
                <IconChevronDown className={`h-[20px] w-[20px] text-[#1c1c26] transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageDropdown && (
                <div className="absolute right-0 bottom-full mb-[4px] min-w-[140px] bg-white rounded-[12px] border border-[rgba(0,0,0,0.12)] shadow-lg z-10 overflow-hidden">
                  {LANGUAGE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      disabled={languageUpdating}
                      onClick={() => { void updateLanguage(option.value) }}
                      className={`w-full text-left px-[16px] py-[10px] text-[16px] leading-[24px] hover:bg-[#f5f5f5] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${option.value === language ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}
                    >
                      {t(option.labelKey)}
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

      <AddressBookDialog
        open={addressDialogOpen}
        mode={addressDialogMode}
        value={editingAddress}
        chains={addressBookChains}
        loading={addressDialogSaving}
        onClose={() => {
          setAddressDialogOpen(false)
          setEditingAddress(null)
        }}
        onSubmit={handleSaveAddress}
        validateAddress={validateFavoriteAddress}
      />

      <Dialog open={removeDialogOpen} onOpenChange={openState => { if (!removingAddress) { setRemoveDialogOpen(openState); if (!openState) setAddressToRemove(null) } }}>
        <DialogContent className="max-w-[416px]">
          <DialogHeader>
            <DialogTitle>{t('settings.removeAddress')}</DialogTitle>
            <DialogDescription>
              {addressToRemove ? t('settings.removeAddressDescription', { name: addressToRemove.remark || addressToRemove.address }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveDialogOpen(false); setAddressToRemove(null) }} disabled={removingAddress}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemoveAddress} disabled={removingAddress}>
              {t('common.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
