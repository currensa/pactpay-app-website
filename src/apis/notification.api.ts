import { AxiosInstance } from 'axios'

export interface NotificationItem {
  id: string
  sceneId: string
  title: string
  body: string
  orgId: string | null
  readAt: string | null
  createdAt: string
}

export interface NotificationListResponse {
  data: NotificationItem[]
  page: number
  pageSize: number
  total: number
}

export type NotificationPreferenceKey =
  | 'payments_claim'
  | 'organization_invites_updates'
  | 'security_login'

export interface NotificationPreference {
  key: NotificationPreferenceKey
  label: string
  enabled: boolean
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[]
}

export interface UpdateNotificationPreferencesPayload {
  paymentsClaim?: boolean
  organizationInvitesUpdates?: boolean
  securityLogin?: boolean
}

export class NotificationApi {
  constructor(private readonly request: AxiosInstance) {}

  async getList(params: {
    orgId?: string
    page?: number
    pageSize?: number
    unreadOnly?: boolean
  } = {}) {
    const res = await this.request.get<NotificationListResponse>('/notifications', { params })
    return res.data
  }

  async getUnreadCount(params: { orgId?: string } = {}) {
    const res = await this.request.get<{ count: number }>('/notifications/unread-count', { params })
    return res.data.count
  }

  async markRead(id: string) {
    await this.request.patch(`/notifications/${id}/read`)
  }

  async markAllRead(params: { orgId?: string } = {}) {
    const res = await this.request.patch<{ count: number }>('/notifications/read-all', null, { params })
    return res.data.count
  }

  async getPreferences() {
    const res = await this.request.get<NotificationPreferencesResponse>('/notifications/preferences')
    return res.data
  }

  async updatePreferences(payload: UpdateNotificationPreferencesPayload) {
    const res = await this.request.patch<NotificationPreferencesResponse>('/notifications/preferences', payload)
    return res.data
  }
}
