import { useRef, useState, useCallback, useEffect, RefObject } from 'react'

interface UseHorizontalScrollOptions {
  onNearEnd?: () => void
  nearEndThreshold?: number
}

interface UseHorizontalScrollReturn {
  scrollRef: RefObject<HTMLDivElement | null>
  canScrollLeft: boolean
  canScrollRight: boolean
  scroll: (direction: 'left' | 'right') => void
  checkScroll: () => void
}

export function useHorizontalScroll(
  deps: unknown[] = [],
  options: UseHorizontalScrollOptions = {}
): UseHorizontalScrollReturn {
  const { onNearEnd, nearEndThreshold = 200 } = options

  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    // Cancel any pending RAF to avoid stacking
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!scrollRef.current) return

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      const newCanScrollLeft = scrollLeft > 0
      const newCanScrollRight = scrollLeft + clientWidth < scrollWidth - 1

      // Only update state if values actually changed
      setCanScrollLeft((prev) => (prev !== newCanScrollLeft ? newCanScrollLeft : prev))
      setCanScrollRight((prev) => (prev !== newCanScrollRight ? newCanScrollRight : prev))

      // Trigger onNearEnd callback if scrolled near end
      if (onNearEnd && scrollWidth - (scrollLeft + clientWidth) < nearEndThreshold) {
        onNearEnd()
      }
    })
  }, [onNearEnd, nearEndThreshold])

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 300
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }, [])

  useEffect(() => {
    // Defer initial check to avoid layout thrashing during mount
    const timeoutId = setTimeout(checkScroll, 0)
    const el = scrollRef.current

    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true })
      window.addEventListener('resize', checkScroll)
    }

    return () => {
      clearTimeout(timeoutId)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (el) el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, checkScroll])

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    checkScroll
  }
}
