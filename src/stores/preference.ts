import apis from '@/apis'
import type { PreferenceLanguage, UpdateUserPreferencesPayload, UserPreference } from '@/apis/preference.api'
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@/i18n/messages'
import { create } from 'zustand'

type NotificationSettingsState = {
  paymentsClaim: boolean
  organizationInvitesUpdates: boolean
  securityLogin: boolean
}

interface PreferenceState {
  language: PreferenceLanguage
  notifications: NotificationSettingsState
  initialized: boolean
  loading: boolean
  setLanguage: (language: PreferenceLanguage) => void
  setGuestLanguage: (language: PreferenceLanguage) => void
  setFromPreferences: (preferences: UserPreference[]) => void
  fetchPreferences: () => Promise<void>
  hydrateAfterLogin: () => Promise<void>
  updatePreferences: (payload: UpdateUserPreferencesPayload) => Promise<void>
  updateLanguage: (language: PreferenceLanguage) => Promise<void>
}

export const DEFAULT_NOTIFICATIONS: NotificationSettingsState = {
  paymentsClaim: true,
  organizationInvitesUpdates: true,
  securityLogin: true,
}

const NOTIFICATION_PREFERENCE_KEYS = {
  paymentsClaim: 'notification.payments_claim',
  organizationInvitesUpdates: 'notification.organization_invites_updates',
  securityLogin: 'notification.security_login',
} as const

const LANGUAGE_STORAGE_KEY = 'pactpay_language'
const LANGUAGE_SYNC_STORAGE_KEY = 'pactpay_language_pending_sync'

function getInitialLanguage(): PreferenceLanguage {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isSupportedLanguage(saved) ? saved : DEFAULT_LANGUAGE
}

function mapPreferencesToLanguage(preferences: UserPreference[]): PreferenceLanguage {
  const language = preferences.find(preference => preference.key === 'app.language')?.value
  return isSupportedLanguage(language) ? language : getInitialLanguage()
}

function mapPreferencesToNotificationState(preferences: UserPreference[]): NotificationSettingsState {
  const nextState = { ...DEFAULT_NOTIFICATIONS }

  for (const preference of preferences) {
    const matched = Object.entries(NOTIFICATION_PREFERENCE_KEYS).find(([, apiKey]) => apiKey === preference.key)
    if (!matched) continue
    nextState[matched[0] as keyof NotificationSettingsState] = preference.value === 'true'
  }

  return nextState
}

function getPendingLanguageSync(): PreferenceLanguage | null {
  const pending = localStorage.getItem(LANGUAGE_SYNC_STORAGE_KEY)
  return isSupportedLanguage(pending) ? pending : null
}

function clearPendingLanguageSync() {
  localStorage.removeItem(LANGUAGE_SYNC_STORAGE_KEY)
}

function persistLanguage(language: PreferenceLanguage, options?: { markPendingSync?: boolean }) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  if (options?.markPendingSync) {
    localStorage.setItem(LANGUAGE_SYNC_STORAGE_KEY, language)
  }
  document.documentElement.lang = language
}

const usePreferenceStore = create<PreferenceState>((set, get) => ({
  language: getInitialLanguage(),
  notifications: DEFAULT_NOTIFICATIONS,
  initialized: false,
  loading: false,
  setLanguage: language => {
    persistLanguage(language)
    set({ language })
  },
  setGuestLanguage: language => {
    persistLanguage(language, { markPendingSync: true })
    set({ language })
  },
  setFromPreferences: preferences => {
    const language = mapPreferencesToLanguage(preferences)
    persistLanguage(language)
    set({
      language,
      notifications: mapPreferencesToNotificationState(preferences),
      initialized: true,
    })
  },
  fetchPreferences: async () => {
    if (!localStorage.getItem('token')) {
      set({ initialized: true, loading: false })
      return
    }

    set({ loading: true })
    try {
      const data = await apis.preference.getPreferences()
      get().setFromPreferences(data.preferences)
    } finally {
      set({ loading: false, initialized: true })
    }
  },
  hydrateAfterLogin: async () => {
    await get().fetchPreferences()

    const pendingLanguage = getPendingLanguageSync()
    if (!pendingLanguage || pendingLanguage === get().language) {
      clearPendingLanguageSync()
      return
    }

    const data = await apis.preference.updatePreferences({ language: pendingLanguage })
    clearPendingLanguageSync()
    get().setFromPreferences(data.preferences)
  },
  updatePreferences: async payload => {
    const data = await apis.preference.updatePreferences(payload)
    get().setFromPreferences(data.preferences)
  },
  updateLanguage: async language => {
    await get().updatePreferences({ language })
  },
}))

persistLanguage(usePreferenceStore.getState().language)

export default usePreferenceStore
