import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Snackbar from '@renderer/shared/ui/feedback/Snackbar'
import {
  useSnackbarNotifications,
  useRemoveSnackbar,
  useShowNotification,
  SnackbarType
} from '@renderer/features/system/useSnackbarStore'
import { useHasActiveHeader } from '@renderer/shared/ui/navigation/PageHeaderPortal'

/**
 * SnackbarContainer renders all snackbar notifications from the Zustand store.
 * Place this component once at the root of your app (in App.tsx).
 *
 * This replaces the NotificationProvider from NotificationContext.
 */
const SnackbarContainer: React.FC = () => {
  const notifications = useSnackbarNotifications()
  const removeNotification = useRemoveSnackbar()
  const showNotification = useShowNotification()
  const hasFloatingBar = useHasActiveHeader()

  // Listen for IPC notifications from main process
  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'show-notification',
      (
        _event,
        { message, type, duration }: { message: string; type?: SnackbarType; duration?: number }
      ) => {
        showNotification(message, type, duration)
      }
    )

    return () => {
      removeListener()
    }
  }, [showNotification])

  return (
    <div
      className={`fixed inset-x-0 z-[100] pointer-events-none transition-all duration-200 ${hasFloatingBar ? 'bottom-[82px]' : 'bottom-6'}`}
    >
      <motion.div layout className="flex w-full flex-col-reverse items-center gap-2 px-4">
        <AnimatePresence initial={false} mode="popLayout">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              layout="position"
              transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
              className="pointer-events-auto flex w-full justify-center"
            >
              <Snackbar
                id={notification.id}
                message={notification.message}
                type={notification.type}
                duration={notification.duration}
                onClose={removeNotification}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default SnackbarContainer

