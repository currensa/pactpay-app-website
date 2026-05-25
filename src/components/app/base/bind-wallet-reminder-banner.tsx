import apis from '@/apis'
import { useTranslation } from '@/utils/i18n'
import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface BindWalletReminderBannerProps {
  dismissStorageKey: string
  redirectTo: string
  bindWalletRoute?: string
  title?: string
  description?: string
  actionLabel?: string
}

export default function BindWalletReminderBanner({
  dismissStorageKey,
  redirectTo,
  bindWalletRoute = '/welcome/bind-wallet',
  title,
  description,
  actionLabel,
}: BindWalletReminderBannerProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  const isDismissed = useMemo(() => localStorage.getItem(dismissStorageKey) === '1', [dismissStorageKey])

  useEffect(() => {
    let active = true

    const checkMetaPubStatus = async () => {
      try {
        const { submitted } = await apis.auth.getMetaPubStatus()
        if (!active) return

        if (submitted) {
          localStorage.removeItem(dismissStorageKey)
          setVisible(false)
          return
        }

        setVisible(!isDismissed)
      } catch {
        if (active) setVisible(false)
      }
    }

    checkMetaPubStatus()

    return () => {
      active = false
    }
  }, [dismissStorageKey, isDismissed])

  const handleDismiss = () => {
    localStorage.setItem(dismissStorageKey, '1')
    setVisible(false)
  }

  const handleNavigate = () => {
    navigate(bindWalletRoute, { state: { redirectTo } })
  }

  if (!visible) return null

  const resolvedTitle = title ?? t('banner.bindWallet.title')
  const resolvedDescription = description ?? t('banner.bindWallet.description')
  const resolvedActionLabel = actionLabel ?? t('banner.bindWallet.action')

  return (
    <div className="flex flex-col gap-[12px] rounded-[20px] border border-[#d7e3ff] bg-[#f4f7ff] px-[16px] py-[14px] lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold leading-[24px] text-[#1c1c26]">
          {resolvedTitle}
        </div>
        <p className="mt-[2px] text-[13px] leading-[20px] text-[#606067]">
          {resolvedDescription}
        </p>
      </div>
      <div className="flex items-center justify-end gap-[8px] lg:shrink-0">
        <button
          type="button"
          onClick={handleNavigate}
          className="inline-flex h-[34px] items-center rounded-[10px] bg-[#5e85ee] px-[12px] text-[13px] font-medium leading-[20px] text-white transition-opacity hover:opacity-90"
        >
          {resolvedActionLabel}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-[10px] p-[6px] text-[#8d8d93] transition-colors hover:bg-white hover:text-[#1c1c26]"
          aria-label={t('banner.bindWallet.dismiss')}
        >
          <X className="h-[16px] w-[16px]" />
        </button>
      </div>
    </div>
  )
}
