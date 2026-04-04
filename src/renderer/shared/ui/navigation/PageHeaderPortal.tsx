import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState
} from 'react'
import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { cn } from '@renderer/shared/lib/utils'

interface PageHeaderContextValue {
  hostElement: HTMLDivElement | null
  setHostElement: (element: HTMLDivElement | null) => void
  hasActiveHeader: boolean
  registerHeader: () => () => void
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null)

const usePageHeaderContext = () => {
  const context = useContext(PageHeaderContext)

  if (!context) {
    throw new Error('Page header components must be used within PageHeaderProvider.')
  }

  return context
}

export const PageHeaderProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [hostElement, setHostElement] = useState<HTMLDivElement | null>(null)
  const [activeHeaderCount, setActiveHeaderCount] = useState(0)

  const hasActiveHeader = activeHeaderCount > 0

  const registerHeader = useCallback(() => {
    setActiveHeaderCount((count) => count + 1)

    return () => {
      setActiveHeaderCount((count) => Math.max(0, count - 1))
    }
  }, [])

  const value = useMemo<PageHeaderContextValue>(
    () => ({
      hostElement,
      setHostElement,
      hasActiveHeader,
      registerHeader
    }),
    [hasActiveHeader, hostElement, registerHeader]
  )

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>
}

export const PageHeaderHost: React.FC<{ className?: string }> = ({ className }) => {
  const { setHostElement, hasActiveHeader } = usePageHeaderContext()

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: hasActiveHeader ? 1 : 0,
        y: hasActiveHeader ? 0 : 12,
        scale: hasActiveHeader ? 1 : 0.96,
        filter: hasActiveHeader ? 'blur(0px)' : 'blur(8px)'
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
      className={cn('fixed bottom-5 right-6 z-50', className)}
      style={{ pointerEvents: hasActiveHeader ? 'auto' : 'none' }}
      aria-hidden={!hasActiveHeader}
    >
      <motion.div
        layout
        ref={setHostElement}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="flex min-h-[50px] items-center flex-row-reverse gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-[5px] py-1 shadow-[0_8px_40px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
      />
    </motion.div>
  )
}

export const useHasActiveHeader = () => usePageHeaderContext().hasActiveHeader

export const PageHeaderPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hostElement, registerHeader } = usePageHeaderContext()

  useLayoutEffect(() => registerHeader(), [registerHeader])

  if (!hostElement) {
    return null
  }

  return createPortal(children, hostElement)
}
