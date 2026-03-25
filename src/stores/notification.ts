import apis from '@/apis'
import { create } from 'zustand'

interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
  fetchUnreadCount: (orgId?: string) => Promise<void>
}

const useNotificationStore = create<NotificationState>(set => ({
  unreadCount: 0,
  setUnreadCount: count => set({ unreadCount: count }),
  fetchUnreadCount: async (orgId?: string) => {
    try {
      const count = await apis.notification.getUnreadCount(orgId ? { orgId } : {})
      set({ unreadCount: count })
    } catch {
      // silent — don't break the UI if polling fails
    }
  },
}))

export default useNotificationStore
