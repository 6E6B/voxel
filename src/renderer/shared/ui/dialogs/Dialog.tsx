import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'

// Global modal stack to track which modal is on top
const modalStack: (() => void)[] = []

const registerModal = (onClose: () => void) => {
  modalStack.push(onClose)
  return () => {
    const index = modalStack.indexOf(onClose)
    if (index > -1) {
      modalStack.splice(index, 1)
    }
  }
}

const isTopModal = (onClose: () => void) => {
  return modalStack.length > 0 && modalStack[modalStack.length - 1] === onClose
}

// Export for Sheet.tsx to use
export { registerModal, isTopModal }

const DialogContext = React.createContext<{
  isOpen: boolean
  onClose: () => void
} | null>(null)

const useDialog = () => {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog')
  }
  return context
}

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  overlayClassName?: string
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children, overlayClassName }) => {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      return undefined
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  React.useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = ''
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  // Register with modal stack
  React.useEffect(() => {
    if (isOpen) {
      const unregister = registerModal(onClose)
      return unregister
    }
    return undefined
  }, [isOpen, onClose])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && isTopModal(onClose)) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, onClose])

  if (!isVisible) return null

  return (
    <DialogContext.Provider value={{ isOpen, onClose }}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0, backdropFilter: 'blur(16px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            style={{
              willChange: 'opacity, backdrop-filter',
              transform: 'translateZ(0)'
            }}
            className={cn(
              'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50',
              overlayClassName
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose()
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  )
}

const DialogContent = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ className, children, onContextMenu, ...props }, ref) => {
    const { isOpen } = useDialog()
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.97,
          y: isOpen ? 0 : 8
        }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
        className={cn(
          'w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] overflow-hidden text-[var(--color-text-secondary)]',
          className
        )}
        onContextMenu={(e) => {
          e.stopPropagation()
          onContextMenu?.(e)
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between pl-[18px] pr-3 py-3 border-b border-[var(--color-border)]',
        className
      )}
      {...props}
    />
  )
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-[13px] font-semibold text-[var(--color-text-primary)]', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[var(--color-text-muted)] mt-0.5', className)}
      {...props}
    />
  )
)
DialogDescription.displayName = 'DialogDescription'

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const { onClose } = useDialog()
  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        onClose()
      }}
      className={cn(
        'pressable flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children || <X size={15} />}
    </button>
  )
})
DialogClose.displayName = 'DialogClose'

const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('px-5 py-4', className)} {...props} />
)
DialogBody.displayName = 'DialogBody'

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex gap-2.5 pt-4', className)} {...props} />
  )
)
DialogFooter.displayName = 'DialogFooter'

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogBody, DialogFooter }
