import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  User,
  Gamepad2,
  LogIn,
  LogOut,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  UserMinus
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '../display/Avatar'
import {
  useNotificationTrayStore,
  useNotifications,
  useUnreadCount,
  useIsTrayOpen,
  TrayNotification,
  NotificationType
} from '@renderer/stores/useNotificationTrayStore'

// Format relative time (e.g., "2m ago", "1h ago")
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Get icon and color for notification type
const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'friend_online':
      return {
        icon: LogIn,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
      }
    case 'friend_offline':
      return {
        icon: LogOut,
        color: 'text-neutral-400',
        bg: 'bg-neutral-500/10',
        border: 'border-neutral-500/20'
      }
    case 'friend_ingame':
      return {
        icon: Gamepad2,
        color: 'text-[var(--accent-color)]',
        bg: 'bg-[var(--accent-color-faint)]',
        border: 'border-[var(--accent-color-border)]'
      }
    case 'friend_removed':
      return {
        icon: UserMinus,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20'
      }
    case 'success':
      return {
        icon: CheckCircle,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20'
      }
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20'
      }
    case 'info':
    default:
      return {
        icon: Info,
        color: 'text-[var(--accent-color)]',
        bg: 'bg-[var(--accent-color-faint)]',
        border: 'border-[var(--accent-color-border)]'
      }
  }
}

interface NotificationTrayProps {
  onOpenUserProfile?: (userId: string) => void
}

interface NotificationItemProps {
  notification: TrayNotification
  onRemove: (id: string) => void
  onOpenProfile?: (userId: string) => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove,
  onOpenProfile
}) => {
  const style = getNotificationStyle(notification.type)
  const Icon = style.icon
  const isUserNotification = Boolean(notification.userId && onOpenProfile)

  const handleOpenProfile = () => {
    if (!notification.userId || !onOpenProfile) return
    onOpenProfile(notification.userId)
  }

  // Color code based on notification type
  const getTitleColor = () => {
    switch (notification.type) {
      case 'friend_online':
        return 'text-neutral-200'
      case 'friend_ingame':
        return 'text-neutral-200'
      case 'friend_removed':
        return 'text-red-400'
      default:
        return 'text-neutral-200'
    }
  }

  return (
    <motion.div
      role={isUserNotification ? 'button' : undefined}
      tabIndex={isUserNotification ? 0 : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        relative p-3 rounded-lg border transition-all group
        ${
          notification.read
            ? 'bg-[var(--color-surface-muted)] border-[var(--color-border-subtle)] opacity-70'
            : 'bg-[var(--color-surface-strong)] border-[var(--color-border)]'
        }
        ${
          isUserNotification
            ? 'cursor-pointer hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]'
            : ''
        }
      `}
      onClick={isUserNotification ? handleOpenProfile : undefined}
      onKeyDown={
        isUserNotification
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleOpenProfile()
              }
            }
          : undefined
      }
    >
      <div className="flex gap-3">
        {/* Avatar or Icon */}
        {notification.avatarUrl ? (
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={notification.avatarUrl} />
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-neutral-800">
            <Icon className={`h-5 w-5 ${style.color}`} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 h-5">
            <p className={`text-sm font-medium truncate flex-1 ${getTitleColor()}`}>
              {notification.title}
            </p>
            {/* Container */}
            <div className="relative shrink-0 h-5">
              {/* Timestamp */}
              <span className="text-xs text-[var(--color-text-muted)] h-5 flex items-center transition-opacity duration-200 group-hover:opacity-0 group-hover:pointer-events-none whitespace-nowrap">
                {formatRelativeTime(notification.timestamp)}
              </span>
              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(notification.id)
                }}
                className="absolute right-0 top-0 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all duration-200 flex items-center justify-center"
                title="Dismiss"
              >
                <X className="h-4 w-5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          {notification.gameInfo && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Gamepad2 className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 truncate">
                {notification.gameInfo.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const NotificationTray: React.FC<NotificationTrayProps> = ({ onOpenUserProfile }) => {
  const notifications = useNotifications()
  const unreadCount = useUnreadCount()
  const isOpen = useIsTrayOpen()
  const { setIsOpen, markAllAsRead, removeNotification, clearAll } = useNotificationTrayStore()

  const trayRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        trayRef.current &&
        !trayRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setIsOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, setIsOpen])

  const handleOpenProfile = onOpenUserProfile
    ? (userId: string) => {
        onOpenUserProfile(userId)
        setIsOpen(false)
      }
    : undefined

  return (
    <div className="relative z-50">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`
          relative p-2 rounded-md transition-all
          ${
            isOpen
              ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
          }
        `}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-color)] text-[10px] font-bold text-[var(--accent-color-foreground)] flex items-center justify-center pointer-events-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Tray Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={trayRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-strong)]/90 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--color-text-muted)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    ({unreadCount} unread)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-1.5 rounded hover:bg-red-500/15 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[400px] p-2 space-y-2">
              <AnimatePresence mode="popLayout">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRemove={removeNotification}
                      onOpenProfile={handleOpenProfile}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-neutral-500"
                  >
                    <Bell className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No notifications</p>
                    <p className="text-xs mt-1 opacity-60">You&apos;re all caught up!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationTray
export { NotificationTray }
