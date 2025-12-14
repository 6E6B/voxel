import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../../lib/utils'

interface TooltipContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  rect: DOMRect | null
  setRect: (rect: DOMRect | null) => void
  anchorEl: HTMLElement | null
  setAnchorEl: (el: HTMLElement | null) => void
}

const TooltipContext = React.createContext<TooltipContextType | null>(null)

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, rect, setRect, anchorEl, setAnchorEl }}>
      {children}
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<HTMLElement, any>(
  ({ children, asChild, className, ...props }, ref) => {
    const context = React.useContext(TooltipContext)

    // Handle case where TooltipTrigger is used without Tooltip
    if (!context) return children

    const { setIsOpen, setRect, setAnchorEl } = context

    const handleMouseEnter = (e: React.MouseEvent) => {
      const el = e.currentTarget as HTMLElement
      setAnchorEl(el)
      setRect(el.getBoundingClientRect())
      setIsOpen(true)
    }

    const handleMouseLeave = () => {
      setIsOpen(false)
      setRect(null)
      setAnchorEl(null)
    }

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>
      return React.cloneElement(child, {
        ...props,
        ref,
        onMouseEnter: (e: React.MouseEvent) => {
          handleMouseEnter(e)
          child.props.onMouseEnter?.(e)
        },
        onMouseLeave: (e: React.MouseEvent) => {
          handleMouseLeave()
          child.props.onMouseLeave?.(e)
        }
      })
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn('pressable', className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

const ANIMATION_DURATION = 150
const TOOLTIP_MAX_WIDTH = 320
const VIEWPORT_PADDING = 8
const TOOLTIP_Z_INDEX = 12000 // Must sit above modals (z-[9999]) so tips remain visible

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const TooltipContent = React.forwardRef<HTMLDivElement, any>(
  (
    { className, side = 'top', sideOffset = 4, children, style: contentStyleProp, ...props },
    forwardedRef
  ) => {
    const context = React.useContext(TooltipContext)
    const rect = context?.rect ?? null
    const isOpen = context?.isOpen ?? false
    const anchorEl = context?.anchorEl ?? null
    const setRect = context?.setRect
    const tooltipRef = React.useRef<HTMLDivElement | null>(null)
    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        tooltipRef.current = node
        if (typeof forwardedRef === 'function') {
          forwardedRef(node)
        } else if (forwardedRef) {
          ;(forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      },
      [forwardedRef]
    )

    const [cachedRect, setCachedRect] = React.useState<DOMRect | null>(null)
    const resolvedRect = rect ?? cachedRect
    const [isVisible, setIsVisible] = React.useState(false)
    const [animationState, setAnimationState] = React.useState<'enter' | 'exit'>('exit')
    const [maxWidthPx, setMaxWidthPx] = React.useState(TOOLTIP_MAX_WIDTH)
    const [tooltipSize, setTooltipSize] = React.useState({ width: 0, height: 0 })

    React.useEffect(() => {
      if (rect) {
        setCachedRect(rect)
      }
    }, [rect])

    React.useEffect(() => {
      if (!isOpen || !anchorEl || !setRect) return

      let rafId = 0
      const update = () => {
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          setRect(anchorEl.getBoundingClientRect())
        })
      }

      update()
      window.addEventListener('scroll', update, true)
      window.addEventListener('resize', update)

      const resizeObserver = new ResizeObserver(update)
      resizeObserver.observe(anchorEl)

      return () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('scroll', update, true)
        window.removeEventListener('resize', update)
        resizeObserver.disconnect()
      }
    }, [anchorEl, isOpen, setRect])

    const shouldRender = Boolean(resolvedRect && (isOpen || isVisible))

    React.useEffect(() => {
      if (!resolvedRect) return

      let frame: number | null = null
      let timeout: ReturnType<typeof setTimeout> | null = null

      if (isOpen) {
        setIsVisible(true)
        setAnimationState('exit')
        frame = requestAnimationFrame(() => setAnimationState('enter'))
      } else if (isVisible) {
        setAnimationState('exit')
        timeout = setTimeout(() => setIsVisible(false), ANIMATION_DURATION)
      }

      return () => {
        if (frame) cancelAnimationFrame(frame)
        if (timeout) clearTimeout(timeout)
      }
    }, [isOpen, isVisible, resolvedRect])

    React.useLayoutEffect(() => {
      if (!shouldRender || !tooltipRef.current || !resolvedRect) return
      const updateMetrics = () => {
        if (!tooltipRef.current) return

        const { offsetWidth, offsetHeight } = tooltipRef.current
        setTooltipSize((prev) =>
          prev.width === offsetWidth && prev.height === offsetHeight
            ? prev
            : { width: offsetWidth, height: offsetHeight }
        )

        const boundedWidth = Math.min(
          TOOLTIP_MAX_WIDTH,
          Math.max(1, window.innerWidth - VIEWPORT_PADDING * 2)
        )

        setMaxWidthPx((prev) => (prev === boundedWidth ? prev : boundedWidth))
      }

      updateMetrics()
      window.addEventListener('resize', updateMetrics)
      return () => window.removeEventListener('resize', updateMetrics)
    }, [children, resolvedRect, shouldRender, side])

    if (!resolvedRect || !shouldRender) return null

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: TOOLTIP_Z_INDEX,
      pointerEvents: 'none'
    }

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
    const measuredWidth = tooltipSize.width || maxWidthPx
    const measuredHeight = tooltipSize.height || 0
    let baseTransform = ''

    if (side === 'top' || side === 'bottom') {
      const mid = resolvedRect.left + resolvedRect.width / 2
      const left = clamp(
        mid - measuredWidth / 2,
        VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, viewportWidth - VIEWPORT_PADDING - measuredWidth)
      )

      style.left = left
      style.top = side === 'top' ? resolvedRect.top - sideOffset : resolvedRect.bottom + sideOffset
      baseTransform = side === 'top' ? 'translateY(-100%)' : ''
    } else {
      const centerY = resolvedRect.top + resolvedRect.height / 2
      const top = clamp(
        centerY - measuredHeight / 2,
        VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, viewportHeight - VIEWPORT_PADDING - measuredHeight)
      )

      style.top = top
      style.left =
        side === 'left'
          ? resolvedRect.left - sideOffset - measuredWidth
          : resolvedRect.right + sideOffset
      baseTransform = side === 'left' ? '' : ''
    }

    const animationOffset: Record<string, { enter: string; exit: string }> = {
      top: { enter: 'translateY(0)', exit: 'translateY(6px)' },
      bottom: { enter: 'translateY(0)', exit: 'translateY(-6px)' },
      left: { enter: 'translateX(0)', exit: 'translateX(6px)' },
      right: { enter: 'translateX(0)', exit: 'translateX(-6px)' }
    }

    const transforms = [
      baseTransform,
      animationOffset[side]?.[animationState] || animationOffset.top[animationState]
    ].filter(Boolean)

    style.transform = transforms.join(' ')
    style.opacity = animationState === 'enter' ? 1 : 0
    style.transition = `opacity ${ANIMATION_DURATION}ms ease, transform ${ANIMATION_DURATION}ms ease`

    return createPortal(
      <div style={style}>
        <div
          ref={mergedRef}
          data-side={side}
          data-state={animationState}
          className={cn(
            'whitespace-normal break-words text-left rounded-md border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] shadow-md leading-tight',
            className
          )}
          style={{
            width: 'max-content',
            maxWidth: `${maxWidthPx}px`,
            ...contentStyleProp
          }}
          {...props}
        >
          {children}
        </div>
      </div>,
      document.body
    )
  }
)

TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
