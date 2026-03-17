import ModalContainer from '@/components/ui/modal-container'
import { IconCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

interface ChangeEmailDialogProps {
  open: boolean
  onClose: () => void
  currentEmail?: string
  /** 'change' = 修改已有邮箱（需先验证旧邮箱），'bind' = 绑定新邮箱（直接进入输入新邮箱步骤） */
  mode?: 'change' | 'bind'
}

type Step = 'verify' | 'newEmail'

export default function ChangeEmailDialog({ open, onClose, currentEmail = '', mode = 'change' }: ChangeEmailDialogProps) {
  const [step, setStep] = useState<Step>('verify')
  const [verifyCode, setVerifyCode] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newEmailCode, setNewEmailCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [newEmailCountdown, setNewEmailCountdown] = useState(0)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(mode === 'bind' ? 'newEmail' : 'verify')
      setVerifyCode('')
      setNewEmail('')
      setNewEmailCode('')
      setCountdown(0)
      setNewEmailCountdown(0)
    }
  }, [open])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    if (newEmailCountdown <= 0) return
    const t = setTimeout(() => setNewEmailCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [newEmailCountdown])

  function handleSendCode() {
    if (countdown > 0) return
    setCountdown(60)
  }

  function handleSendNewEmailCode() {
    if (newEmailCountdown > 0) return
    setNewEmailCountdown(60)
  }

  function handleVerify() {
    if (!verifyCode) return
    setStep('newEmail')
  }

  function handleConfirm() {
    if (!newEmail || !newEmailCode) return
    onClose()
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
        <p className="font-bold text-[18px] leading-[28px] text-[#1c1c26]">{mode === 'bind' ? 'Bind Email' : 'Change Email'}</p>

        {/* Stepper — bind 模式只有一步，不显示 */}
        {mode === 'change' && <div className="flex items-center gap-[24px] py-[8px]">
          <div className="flex items-center gap-[8px]">
            <StepIndicator active={step === 'verify'} completed={step === 'newEmail'} number={1} />
            <span className={`text-[16px] leading-[24px] whitespace-nowrap ${step === 'verify' || step === 'newEmail' ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
              Verify current email
            </span>
          </div>
          <div className="flex-1 h-px bg-[rgba(0,0,0,0.12)]" />
          <div className="flex items-center gap-[8px]">
            <StepIndicator active={step === 'newEmail'} number={2} />
            <span className={`text-[16px] leading-[24px] whitespace-nowrap ${step === 'newEmail' ? 'text-[#5e85ee]' : 'text-[#1c1c26]'}`}>
              Enter new email
            </span>
          </div>
        </div>
        }

        {step === 'verify' ? (
          <>
            <p className="text-[16px] leading-[24px] text-[#1c1c26]">
              Verify your current email. We'll send a 6-digit code to
            </p>
            <div className="flex flex-col gap-[24px]">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">Current Email</p>
                <div className="flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px]">
                  <p className="text-[16px] leading-[24px] text-[#1c1c26] truncate flex-1">{currentEmail}</p>
                  <button
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className={`shrink-0 text-[14px] font-semibold leading-[22px] ${countdown > 0 ? 'text-[#8d8d93]' : 'text-[#5e85ee]'}`}
                  >
                    {countdown > 0 ? `${countdown}s` : 'Send Code'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">Verification Code</p>
                <input
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value)}
                  placeholder="Enter Code"
                  className="bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-[12px]">
              <button
                onClick={onClose}
                className="px-[16px] py-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[14px] leading-[22px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                disabled={!verifyCode}
                className={`px-[16px] py-[10px] rounded-[12px] bg-[#5e85ee] text-[14px] leading-[22px] text-white transition-opacity ${!verifyCode ? 'opacity-25' : 'hover:opacity-90'}`}
              >
                Verify
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-[24px] text-[#1c1c26]">
              Enter your new email. We'll send a code there to confirm.
            </p>
            <div className="flex flex-col gap-[24px]">
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">New Email</p>
                <div className="flex items-center justify-between bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px]">
                  <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="New email"
                    className="flex-1 bg-transparent text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none"
                  />
                  <button
                    onClick={handleSendNewEmailCode}
                    disabled={newEmailCountdown > 0}
                    className={`shrink-0 text-[14px] font-semibold leading-[22px] ${newEmailCountdown > 0 ? 'text-[#8d8d93]' : 'text-[#5e85ee]'}`}
                  >
                    {newEmailCountdown > 0 ? `${newEmailCountdown}s` : 'Send Code'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-[8px]">
                <p className="text-[16px] leading-[24px] text-[#1c1c26]">Verification Code</p>
                <input
                  value={newEmailCode}
                  onChange={e => setNewEmailCode(e.target.value)}
                  placeholder="Enter Code"
                  className="bg-[#f5f5f5] rounded-[12px] px-[16px] py-[12px] text-[16px] leading-[24px] text-[#1c1c26] placeholder:text-[#8d8d93] outline-none w-full"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-[12px]">
              <button
                onClick={onClose}
                className="px-[16px] py-[10px] rounded-[12px] border border-[rgba(0,0,0,0.12)] bg-white text-[14px] leading-[22px] text-[#1c1c26] hover:bg-[#f5f5f5] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!newEmail || !newEmailCode}
                className={`px-[16px] py-[10px] rounded-[12px] bg-[#5e85ee] text-[14px] leading-[22px] text-white transition-opacity ${!newEmail || !newEmailCode ? 'opacity-25' : 'hover:opacity-90'}`}
              >
                Verify
              </button>
            </div>
          </>
        )}
      </div>
    </ModalContainer>
  )
}
