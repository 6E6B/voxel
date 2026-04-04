import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type NotificationType =
  | 'friend_online'
  | 'friend_offline'
  | 'friend_ingame'
  | 'friend_removed'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

export interface TrayNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  avatarUrl?: string
  userId?: string
  gameInfo?: {
    name: string
    placeId: string
  }
}

interface NotificationTrayState {
  notifications: TrayNotification[]
  isOpen: boolean
  // Settings
  notifyFriendOnline: boolean
  notifyFriendInGame: boolean
  notifyFriendRemoved: boolean
  maxNotifications: number
}

interface NotificationTrayActions {
  addNotification: (notification: Omit<TrayNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  setIsOpen: (isOpen: boolean) => void
  toggleOpen: () => void
  setNotifyFriendOnline: (enabled: boolean) => void
  setNotifyFriendInGame: (enabled: boolean) => void
  setNotifyFriendRemoved: (enabled: boolean) => void
}

type NotificationTrayStore = NotificationTrayState & NotificationTrayActions

const initialState: NotificationTrayState = {
  notifications: [],
  isOpen: false,
  notifyFriendOnline: true,
  notifyFriendInGame: true,
  notifyFriendRemoved: true,
  maxNotifications: 50
}

export const useNotificationTrayStore = create<NotificationTrayStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        addNotification: (notification) => {
          const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`
          const newNotification: TrayNotification = {
            ...notification,
            id,
            timestamp: Date.now(),
            read: false
          }

          set(
            (state) => {
              const updated = [newNotification, ...state.notifications]
              // Keep only the most recent notifications
              return {
                notifications: updated.slice(0, state.maxNotifications)
              }
            },
            false,
            'addNotification'
          )
        },

        markAsRead: (id) =>
          set(
            (state) => ({
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              )
            }),
            false,
            'markAsRead'
          ),

        markAllAsRead: () =>
          set(
            (state) => ({
              notifications: state.notifications.map((n) => ({ ...n, read: true }))
            }),
            false,
            'markAllAsRead'
          ),

        removeNotification: (id) =>
          set(
            (state) => ({
              notifications: state.notifications.filter((n) => n.id !== id)
            }),
            false,
            'removeNotification'
          ),

        clearAll: () => set({ notifications: [] }, false, 'clearAll'),

        setIsOpen: (isOpen) => set({ isOpen }, false, 'setIsOpen'),

        toggleOpen: () => set((state) => ({ isOpen: !state.isOpen }), false, 'toggleOpen'),

        setNotifyFriendOnline: (notifyFriendOnline) =>
          set({ notifyFriendOnline }, false, 'setNotifyFriendOnline'),

        setNotifyFriendInGame: (notifyFriendInGame) =>
          set({ notifyFriendInGame }, false, 'setNotifyFriendInGame'),

        setNotifyFriendRemoved: (notifyFriendRemoved) =>
          set({ notifyFriendRemoved }, false, 'setNotifyFriendRemoved')
      }),
      {
        name: 'notification-tray-storage',
        partialize: (state) => ({
          notifyFriendOnline: state.notifyFriendOnline,
          notifyFriendInGame: state.notifyFriendInGame,
          notifyFriendRemoved: state.notifyFriendRemoved
          // Don't persist notifications - they should be fresh each session
        })
      }
    ),
    { name: 'NotificationTrayStore' }
  )
)

// Selectors
export const useNotifications = () => useNotificationTrayStore((state) => state.notifications)
export const useUnreadCount = () =>
  useNotificationTrayStore((state) => state.notifications.filter((n) => !n.read).length)
export const useIsTrayOpen = () => useNotificationTrayStore((state) => state.isOpen)
export const useNotifyFriendOnline = () =>
  useNotificationTrayStore((state) => state.notifyFriendOnline)
export const useNotifyFriendInGame = () =>
  useNotificationTrayStore((state) => state.notifyFriendInGame)
export const useNotifyFriendRemoved = () =>
  useNotificationTrayStore((state) => state.notifyFriendRemoved)
