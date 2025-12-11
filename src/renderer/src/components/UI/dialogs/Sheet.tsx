import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { registerModal, isTopModal } from './Dialog'

const SheetContext = React.createContext<{
  isOpen: boolean
  onClose: () => void
  dragControls: ReturnType<typeof useDragControls> | null
  shouldRenderContent: boolean
} | null>(null)

const useSheet = () => {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error('Sheet components must be used within a Sheet')
  }
  return context
}

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

const SHEET_MARGIN_TOP = 48 // px from top when fully open
const DRAG_CLOSE_THRESHOLD = 150 // px drag distance to trigger close
const DRAG_VELOCITY_THRESHOLD = 500 // velocity to trigger close
const CONTENT_RENDER_DELAY = 50 // ms delay before rendering heavy content

// Track open sheets to handle nested sheets properly
let openSheetsCount = 0

const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, children, className }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [shouldRenderContent, setShouldRenderContent] = React.useState(false)
  const dragControls = useDragControls()
  const constraintsRef = React.useRef<HTMLDivElement>(null)
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const prevIsOpenRef = React.useRef(false)
  const fallbackTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Handle open/close transitions and sheet stack management
  React.useEffect(() => {
    const wasOpen = prevIsOpenRef.current
    prevIsOpenRef.current = isOpen

    if (isOpen && !wasOpen) {
      openSheetsCount++
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
      document.body.setAttribute('data-sheet-open', 'true')
      // Defer heavy content rendering to allow animation to start smoothly
      const contentTimer = setTimeout(() => {
        setShouldRenderContent(true)
      }, CONTENT_RENDER_DELAY)

      return () => clearTimeout(contentTimer)
    } else if (!isOpen && wasOpen) {
      // Closing: immediately hide content, delay container
      setShouldRenderContent(false)
      openSheetsCount = Math.max(0, openSheetsCount - 1)
      document.body.removeAttribute('data-sheet-open')

      // Closing: delay hiding to allow animation
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (openSheetsCount === 0) {
          document.body.style.overflow = ''
        }
      }, 400)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen])

  // if the deferred timer fails, force-enable content shortly after open.
  React.useEffect(() => {
    if (!isOpen || shouldRenderContent) return
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)

    fallbackTimerRef.current = setTimeout(() => {
      setShouldRenderContent(true)
    }, 200)

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [isOpen, shouldRenderContent])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      openSheetsCount = Math.max(0, openSheetsCount - 1)
      setShouldRenderContent(false)

      if (openSheetsCount === 0) {
        document.body.style.overflow = ''
        document.body.removeAttribute('data-sheet-open')
      }
    }
  }, [])

  // Register with modal stack
  React.useEffect(() => {
    if (isOpen) {
      const unregister = registerModal(onClose)
      return unregister
    }
    return undefined
  }, [isOpen, onClose])

  // Handle escape key - only close if topmost modal
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

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose =
      info.offset.y > DRAG_CLOSE_THRESHOLD || info.velocity.y > DRAG_VELOCITY_THRESHOLD

    if (shouldClose) {
      onClose()
    }
  }

  if (!isVisible) return null

  // Use portal to render outside of #app-container so it's not affected by the zoom
  return createPortal(
    <SheetContext.Provider value={{ isOpen, onClose, dragControls, shouldRenderContent }}>
      <div
        ref={constraintsRef}
        className="fixed inset-0 z-[60] overflow-hidden"
        data-sheet-active={isOpen ? 'true' : 'false'}
        data-sheet-container="true"
      >
        {/* Window drag region */}
        <div
          className="absolute top-0 left-0 right-0 h-[30px] z-[70] pointer-events-auto"
          style={{ WebkitAppRegion: 'drag', background: 'transparent' } as React.CSSProperties}
        />

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              />

              {/* Sheet Container */}
              <motion.div
                ref={sheetRef}
                initial={{ y: window.innerHeight }}
                animate={{ y: 0 }}
                exit={{ y: window.innerHeight }}
                transition={{
                  type: 'spring',
                  damping: 30,
                  stiffness: 300,
                  mass: 0.8
                }}
                drag="y"
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.5 }}
                onDragEnd={handleDragEnd}
                dragListener={false}
                style={{
                  top: SHEET_MARGIN_TOP
                }}
                className={cn('absolute inset-x-0 bottom-0 flex flex-col', className)}
              >
                {children}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </SheetContext.Provider>,
    document.body
  )
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col h-full bg-[var(--color-surface)] rounded-t-[20px] shadow-2xl overflow-hidden',
          'border-t border-x border-[var(--color-border)]',
          'ring-1 ring-[var(--accent-color-ring)]',
          className
        )}
        onContextMenu={(e) => {
          // Stop context menu from propagating to elements behind the sheet
          e.stopPropagation()
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SheetContent.displayName = 'SheetContent'

const SheetHandle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { dragControls } = useSheet()

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Start dragging the sheet when handle is pressed
      if (dragControls) {
        dragControls.start(e)
      }
      props.onPointerDown?.(e)
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none',
          className
        )}
        onPointerDown={handlePointerDown}
        {...props}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-[var(--color-border-strong)]/60" />
      </div>
    )
  }
)
SheetHandle.displayName = 'SheetHandle'

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex-shrink-0 flex items-center justify-between px-6 pb-4 border-b border-[var(--color-border)]',
        className
      )}
      {...props}
    />
  )
)
SheetHeader.displayName = 'SheetHeader'

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-xl font-bold text-[var(--color-text-primary)]', className)}
      {...props}
    />
  )
)
SheetTitle.displayName = 'SheetTitle'

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const { onClose } = useSheet()
  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        onClose()
      }}
      className={cn(
        'pressable p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] rounded transition-colors',
        className
      )}
      {...props}
    >
      {children || <X size={24} />}
    </button>
  )
})
SheetClose.displayName = 'SheetClose'

const SheetBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { shouldRenderContent } = useSheet()

    return (
      <div
        ref={ref}
        className={cn('flex-1 overflow-y-auto overflow-x-hidden', className)}
        {...props}
      >
        {shouldRenderContent ? (
          children
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    )
  }
)
SheetBody.displayName = 'SheetBody'

export {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
  useSheet
}
