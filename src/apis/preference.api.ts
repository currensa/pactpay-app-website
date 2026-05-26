import { AxiosInstance } from 'axios'

export type PreferenceLanguage = 'zh-CN' | 'en-US'

export type UserPreferenceKey =
  | 'notification.payments_claim'
  | 'notification.organization_invites_updates'
  | 'notification.security_login'
  | 'app.language'

export interface UserPreference {
  key: UserPreferenceKey
  value: string
}

export interface UserPreferencesResponse {
  preferences: UserPreference[]
}

export interface UpdateNotificationPreferencesPayload {
  paymentsClaim?: boolean
  organizationInvitesUpdates?: boolean
  securityLogin?: boolean
}

export interface UpdateUserPreferencesPayload {
  notifications?: UpdateNotificationPreferencesPayload
  language?: PreferenceLanguage
}

export class PreferenceApi {
  constructor(private readonly request: AxiosInstance) {}

  async getPreferences() {
    const res = await this.request.get<UserPreferencesResponse>('/auth/me/preferences')
    return res.data
  }

  async updatePreferences(payload: UpdateUserPreferencesPayload) {
    const res = await this.request.patch<UserPreferencesResponse>('/auth/me/preferences', payload)
    return res.data
  }
}
