import api from '@/apis'
import ModalContainer from '@/components/ui/modal-container'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from '@/utils/i18n'
import { IconCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

interface ChangeEmailDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (email: string) => void
  userId: string
  currentEmail?: string
  /** 'change' = 换绑已有邮箱（需验证旧邮箱），'bind' = 绑定新邮箱（直接输入新邮箱） */
  mode?: 'change' | 'bind'
}

type Step = 'verify' | 'newEmail'

export default function ChangeEmailDialog({ open, onClose, onSuccess, userId, currentEmail = '', mode = 'change' }: ChangeEmailDialogProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('verify')
  const [oldCode, setOldCode] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newEmailCode, setNewEmailCode] = useState('')
  const [oldCodeCountdown, setOldCodeCountdown] = useState(0)
  const [newEmailCountdown, setNewEmailCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(mode === 'bind' ? 'newEmail' : 'verify')
      setOldCode('')
      setNewEmail('')
      setNewEmailCode('')
      setOldCodeCountdown(0)
      setNewEmailCountdown(0)
    }
  }, [open])

  useEffect(() => {
    if (oldCodeCountdown <= 0) return
    const t = setTimeout(() => setOldCodeCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [oldCodeCountdown])

  useEffect(() => {
    if (newEmailCountdown <= 0) return
    const t = setTimeout(() => setNewEmailCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [newEmailCountdown])

  async function handleSendOldCode() {
    if (oldCodeCountdown > 0) return
    try {
      await api.auth.sendCurrentEmailCode()
      setOldCodeCountdown(60)
    } catch {
      // request interceptor handles API errors
    }
  }

  async function handleSendNewEmailCode() {
    if (newEmailCountdown > 0 || !newEmail) return
    try {
      await api.auth.getEmailCode(newEmail)
      setNewEmailCountdown(60)
    } catch {
      // request interceptor handles API errors
    }
  }

  function handleVerify() {
    if (!oldCode) return
    setStep('newEmail')
  }

  async function handleConfirm() {
    if (!newEmail || !newEmailCode) return
    try {
      setLoading(true)
      await api.auth.bindEmail(newEmail, newEmailCode, mode === 'change' ? oldCode : undefined)
      toast({ description: mode === 'change' ? t('settings.changeEmail.emailChangedSuccessfully') : t('settings.changeEmail.emailBoundSuccessfully') })
      onSuccess?.(newEmail)
      onClose()
    } catch {
      // toast({ description: 'Failed to verify code.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const StepIndicator = ({ active, completed, number }: { active: boolean; completed?: boolean; number: number }) => (
    <div
      className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full ${active || completed ? 'bg-[#5e85ee]' : 'bg-[rgba(0,0,0,0.12)]'}`}
    >
      {completed
        ? <IconCheck className="h-[16px] w-[16px] text-white" />
        : <span className="font-bold text-[16px] leading-[24px] text-white">{number}</span>
      }
    </div>
  )

  return (
    <ModalContainer open={open} onClose={onClose} className="max-w-[560px]">
      <div className="flex flex-col gap-[24px] pr-[32px]">
        {/* Title */}
        <p className="font-bold text-[18px] leading-[28px] text-[#1c1c26]">{mode === 'bind' ? t('settings.changeEmail.bindTitle') : t('settings.changeEmail.changeTitle')}</p>

        {/* Stepper — bind 模式只有一步，不显示 */}
        {mode === 'change' && (
          <div className="flex items-center gap-[24px] py-[8px]">
            <div className="flex items-center gap-[8px]">
              <StepIndicator active={step === 'verify'} completed={step === 'newEmail'} number={1} />
              <span className={`text-[16px] leading-[24px] whitespace-nowrap ${step === 'verify' || step === 'newEmail' ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
                {t('settings.changeEmail.verifyCurrentEmail')}
              </span>
            </div>
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.12)]" />
            <div className="flex items-center gap-[8px]">
              <StepIndicator active={step === 'newEmail'} number={2} />
              <span className={`text-[16px] leading-[24px] whitespace-nowrap ${step === 'newEmail' ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
                {t('settings.changeEmail.enterNewEmail')}
              </span>
            </div>
          </div>
        )}

        {step === 'verify' ? (
          <>
            <p className="text-[16px] leading-[24px] text-[#1c1c26]">
              {t('settings.changeEmail.verifyCurrentDescription')}
            </p>
            <div className="flex flex-col gap-[24px]">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.changeEmail.currentEmail')}</p>
                <div className="flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px]">
                  <p className="text-[16px] leading-[24px] text-[#1c1c26] truncate flex-1">{currentEmail}</p>
                  <button
                    onClick={handleSendOldCode}
                    disabled={oldCodeCountdown > 0}
                    className={`shrink-0 text-[14px] font-semibold leading-[22px] ${oldCodeCountdown > 0 ? 'text-[#8d8d93]' : 'text-[#5e85ee]'}`}
                  >
                    {oldCodeCountdown > 0 ? `${oldCodeCountdown}s` : t('settings.changeEmail.sendCode')}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.changeEmail.verificationCode')}</p>
                <input
                  value={oldCode}
                  onChange={e => setOldCode(e.target.value)}
                  placeholder={t('settings.changeEmail.enterCodePlaceholder')}
                  className="bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-[12px]">
              <button
                onClick={onClose}
                className="px-[16px] py-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[14px] leading-[22px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleVerify}
                disabled={!oldCode}
                className={`px-[16px] py-[10px] rounded-[12px] bg-[#5e85ee] text-[14px] leading-[22px] text-white transition-opacity ${!oldCode ? 'opacity-25' : 'hover:opacity-90'}`}
              >
                {t('settings.changeEmail.verify')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-[24px] text-[#1c1c26]">
              {t('settings.changeEmail.newEmailDescription')}
            </p>
            <div className="flex flex-col gap-[24px]">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.changeEmail.newEmail')}</p>
                <div className="flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px]">
                  <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder={t('settings.changeEmail.newEmailPlaceholder')}
                    className="flex-1 bg-transparent text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
                  />
                  <button
                    onClick={handleSendNewEmailCode}
                    disabled={newEmailCountdown > 0 || !newEmail}
                    className={`shrink-0 text-[14px] font-semibold leading-[22px] ${newEmailCountdown > 0 || !newEmail ? 'text-[#8d8d93]' : 'text-[#5e85ee]'}`}
                  >
                    {newEmailCountdown > 0 ? `${newEmailCountdown}s` : t('settings.changeEmail.sendCode')}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">{t('settings.changeEmail.verificationCode')}</p>
                <input
                  value={newEmailCode}
                  onChange={e => setNewEmailCode(e.target.value)}
                  placeholder={t('settings.changeEmail.enterCodePlaceholder')}
                  className="bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-[12px]">
              <button
                onClick={onClose}
                className="px-[16px] py-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[14px] leading-[22px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!newEmail || !newEmailCode || loading}
                className={`px-[16px] py-[10px] rounded-[12px] bg-[#5e85ee] text-[14px] leading-[22px] text-white transition-opacity ${!newEmail || !newEmailCode || loading ? 'opacity-25' : 'hover:opacity-90'}`}
              >
                {loading ? t('settings.changeEmail.verifying') : t('settings.changeEmail.verify')}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalContainer>
  )
}
