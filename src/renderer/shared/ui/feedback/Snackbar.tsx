import React, { useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
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
  const handleClose = useCallback(() => {
    onClose(id)
  }, [id, onClose])

  useEffect(() => {
    if (duration <= 0) {
      return
    }

    const timer = setTimeout(() => {
      handleClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, handleClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-emerald-400" />
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400" />
      case 'info':
      default:
        return <Info size={16} className="text-[var(--accent-color)]" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 8, scale: 0.95, filter: 'blur(8px)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
      className="
        flex items-center gap-2.5 pl-3.5 pr-2 py-2 rounded-full
        bg-neutral-900/95 backdrop-blur-md border border-white/[0.08]
        shadow-[0_4px_24px_rgba(0,0,0,0.4)] text-neutral-200
      "
      role="alert"
    >
      <div className="shrink-0">{getIcon()}</div>
      <p className="text-[13px] font-medium leading-tight whitespace-nowrap">{message}</p>
      <button
        onClick={handleClose}
        className="pressable shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors ml-0.5"
        aria-label="Close notification"
      >
        <X size={14} className="opacity-50 hover:opacity-100" />
      </button>
    </motion.div>
  )
}

export default Snackbar
