import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type SnackbarType = 'success' | 'error' | 'info' | 'warning'

export interface SnackbarProps {
  id: string
  message: string
  type: SnackbarType
  duration?: number
  onClose: (id: string) => void
}

const Snackbar: React.FC<SnackbarProps> = ({ id, message, type, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true))

    if (duration <= 0) {
      return
    }

    const timer = setTimeout(() => {
      handleClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsVisible(false)
    // Wait for exit animation
    setTimeout(() => onClose(id), 300)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-emerald-400" />
      case 'error':
        return <AlertCircle size={20} className="text-red-400" />
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-400" />
      case 'info':
      default:
        return <Info size={20} className="text-[var(--accent-color)]" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-neutral-900 border-emerald-500/20 text-neutral-200'
      case 'error':
        return 'bg-neutral-900 border-red-500/20 text-neutral-200'
      case 'warning':
        return 'bg-neutral-900 border-yellow-500/20 text-neutral-200'
      case 'info':
      default:
        return 'bg-neutral-900 border-[var(--accent-color-border)] text-neutral-200'
    }
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl min-w-[300px] max-w-[400px]
        transition-all duration-300 transform
        ${getStyles()}
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
      `}
      role="alert"
    >
      <div className="shrink-0">{getIcon()}</div>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={handleClose}
        className="pressable shrink-0 p-1 rounded hover:bg-[rgba(var(--accent-color-rgb),0.1)] transition-colors"
        aria-label="Close notification"
      >
        <X size={16} className="opacity-60 hover:opacity-100" />
      </button>
    </div>
  )
}

export default Snackbar
