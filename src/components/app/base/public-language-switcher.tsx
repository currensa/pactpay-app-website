import { LANGUAGE_OPTIONS } from '@/i18n/messages'
import usePreferenceStore from '@/stores/preference'
import { useTranslation } from '@/utils/i18n'

export default function PublicLanguageSwitcher() {
  const { t } = useTranslation()
  const language = usePreferenceStore(s => s.language)
  const setGuestLanguage = usePreferenceStore(s => s.setGuestLanguage)

  return (
    <div className="flex items-center rounded-full border border-white/30 bg-white/70 px-[6px] py-[4px] shadow-sm backdrop-blur-md">
      {LANGUAGE_OPTIONS.map(option => {
        const active = option.value === language

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setGuestLanguage(option.value)}
            className={`rounded-full px-[12px] py-[6px] text-[12px] font-medium transition-colors ${
              active ? 'bg-[#1c1c26] text-white' : 'text-[#606067] hover:text-[#1c1c26]'
            }`}
          >
            {t(option.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
