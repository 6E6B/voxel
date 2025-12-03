import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../../lib/utils'

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
            animate={{ opacity: isOpen ? 1 : 0, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            // GPU acceleration for overlay
            style={{
              willChange: 'opacity, backdrop-filter',
              transform: 'translateZ(0)'
            }}
            className={cn(
              'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 [perspective:800px] [transform-style:preserve-3d]',
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
        initial={{ opacity: 0, scale: 0.5, rotateX: 40, y: 40 }}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.8,
          rotateX: isOpen ? 0 : 10,
          y: isOpen ? 0 : 20
        }}
        exit={{ opacity: 0, scale: 0.8, rotateX: 10, y: 20 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        // GPU acceleration: force compositor layer for smoother animations
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
        className={cn(
          'w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-[var(--accent-color-ring)]',
          className
        )}
        onContextMenu={(e) => {
          // Stop context menu from propagating to elements behind the dialog
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
        'flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950',
        className
      )}
      {...props}
    />
  )
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-xl font-semibold text-white pl-2', className)} {...props} />
  )
)
DialogTitle.displayName = 'DialogTitle'

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onClose } = useDialog()
  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        onClose()
      }}
      className={cn(
        'pressable p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      <X size={20} />
    </button>
  )
})
DialogClose.displayName = 'DialogClose'

const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6', className)} {...props} />
)
DialogBody.displayName = 'DialogBody'

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex gap-3 mt-8', className)} {...props} />
  )
)
DialogFooter.displayName = 'DialogFooter'

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogBody, DialogFooter }
