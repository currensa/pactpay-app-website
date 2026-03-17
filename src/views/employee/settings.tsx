import api from '@/apis'
import ChangeEmailDialog from '@/views/employee/components/change-email-dialog'
import { IconChevronDown, IconEye, IconEyeOff } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

const LANGUAGES = ['English']

function maskAddress(address: string) {
  if (address.length <= 6) return address
  return address.slice(0, 3) + '*'.repeat(Math.max(address.length - 6, 5)) + address.slice(-3)
}

export default function EmployeeSettings() {
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showUid, setShowUid] = useState(true)
  const [showAddress, setShowAddress] = useState(false)
  const [notifications, setNotifications] = useState({
    payments: true,
    invites: true,
    security: true,
  })
  const [language, setLanguage] = useState('English')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)

  const [email, setEmail] = useState('')
  const [uid, setUid] = useState('')
  const [walletAddress, setWalletAddress] = useState('')

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
  }, [])

  const toggleNotification = (key: keyof typeof notifications) =>
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="flex flex-col gap-[32px]">
      {/* Account */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">Account</p>
        <div className="bg-white rounded-[32px] p-[24px] flex flex-col gap-[24px]">
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
            <p className="text-[14px] leading-[22px] text-[#8d8d93]">Login address</p>
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
      </section>

      {/* Notifications */}
      <section className="flex flex-col gap-[12px]">
        <p className="font-['Poppins',sans-serif] text-[18px] leading-[28px] text-[#1c1c26]">Notifications</p>
        <div className="bg-white rounded-[32px] p-[24px] flex flex-col gap-[16px]">
          {[
            { key: 'payments' as const, label: 'Payments & claim' },
            { key: 'invites' as const, label: 'Organization invites & updates' },
            { key: 'security' as const, label: 'Security & login' },
          ].map(({ key, label }, i, arr) => (
            <div
              key={key}
              className={`flex items-center justify-between ${i < arr.length - 1 ? 'pb-[16px] border-b border-[rgba(0,0,0,0.12)]' : ''}`}
            >
              <p className="text-[16px] leading-[24px] text-[#1c1c26]">{label}</p>
              <button
                onClick={() => toggleNotification(key)}
                className={`relative h-[28px] w-[50px] rounded-full transition-colors ${notifications[key] ? 'bg-[#5e85ee]' : 'bg-[rgba(0,0,0,0.12)]'}`}
              >
                <span
                  className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white transition-all ${notifications[key] ? 'right-[2px]' : 'left-[2px]'}`}
                />
              </button>
            </div>
          ))}
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
        currentEmail={email}
        mode={email ? 'change' : 'bind'}
      />
    </div>
  )
}
