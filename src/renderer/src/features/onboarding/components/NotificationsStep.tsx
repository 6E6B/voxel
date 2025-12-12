import React from 'react'
import { motion } from 'framer-motion'
import { Bell, Check } from 'lucide-react'
import CustomCheckbox from '@renderer/components/UI/buttons/CustomCheckbox'
import {
  useNotificationTrayStore,
  useNotifyFriendOnline,
  useNotifyFriendInGame,
  useNotifyFriendRemoved,
  useNotifyServerLocation
} from '@renderer/features/system/stores/useNotificationTrayStore'

interface NotificationsStepProps {
  onComplete: () => void
}

const NotificationsStep: React.FC<NotificationsStepProps> = ({ onComplete }) => {
  const notifyFriendOnline = useNotifyFriendOnline()
  const notifyFriendInGame = useNotifyFriendInGame()
  const notifyFriendRemoved = useNotifyFriendRemoved()
  const notifyServerLocation = useNotifyServerLocation()

  const setNotifyFriendOnline = useNotificationTrayStore((state) => state.setNotifyFriendOnline)
  const setNotifyFriendInGame = useNotificationTrayStore((state) => state.setNotifyFriendInGame)
  const setNotifyFriendRemoved = useNotificationTrayStore((state) => state.setNotifyFriendRemoved)
  const setNotifyServerLocation = useNotificationTrayStore((state) => state.setNotifyServerLocation)

  const notifications = [
    {
      id: 'friendOnline',
      label: 'Friend Online Notifications',
      description: 'Get notified when your friends come online.',
      checked: notifyFriendOnline,
      onChange: () => setNotifyFriendOnline(!notifyFriendOnline)
    },
    {
      id: 'friendInGame',
      label: 'Friend In-Game Notifications',
      description: 'Get notified when your friends start playing a game.',
      checked: notifyFriendInGame,
      onChange: () => setNotifyFriendInGame(!notifyFriendInGame)
    },
    {
      id: 'friendRemoved',
      label: 'Friend Removed Notifications',
      description: 'Get notified when someone unfriends you.',
      checked: notifyFriendRemoved,
      onChange: () => setNotifyFriendRemoved(!notifyFriendRemoved)
    },
    {
      id: 'serverLocation',
      label: 'Server Location Notifications',
      description: 'Get notified of the server location when joining a game.',
      checked: notifyServerLocation,
      onChange: () => setNotifyServerLocation(!notifyServerLocation)
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
          <Bell className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Notifications</h3>
        <p className="text-sm text-neutral-500">
          Choose which notifications you&apos;d like to receive
        </p>
      </div>

      <div className="space-y-3">
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-3 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
            onClick={notification.onChange}
          >
            <div className="mt-0.5">
              <CustomCheckbox checked={notification.checked} onChange={notification.onChange} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-neutral-300 block mb-0.5 cursor-pointer">
                {notification.label}
              </label>
              <p className="text-xs text-neutral-500 leading-relaxed">{notification.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)]"
      >
        <Check size={18} />
        <span>Complete Setup</span>
      </button>
    </div>
  )
}

export default NotificationsStep
