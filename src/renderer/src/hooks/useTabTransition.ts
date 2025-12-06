import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { TabId } from '../types'
import { useActiveTab, useSetActiveTab } from '../stores/useUIStore'

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const supportsViewTransitions = () => {
  if (typeof document === 'undefined') return false
  if (prefersReducedMotion()) return false
  return typeof document.startViewTransition === 'function'
}

/**
 * Wraps tab changes in the View Transition API when available.
 * Falls back to a normal state update when unsupported or when reduced motion is enabled.
 */
export const useTabTransition = () => {
  const activeTab = useActiveTab()
  const setActiveTab = useSetActiveTab()

  return useCallback(
    (nextTab: TabId) => {
      if (nextTab === activeTab) return

      const applyTabChange = () => {
        flushSync(() => {
          setActiveTab(nextTab)
        })
      }

      if (!supportsViewTransitions()) {
        applyTabChange()
        return
      }

      const startViewTransition = document.startViewTransition
      if (typeof startViewTransition !== 'function') {
        applyTabChange()
        return
      }

      try {
        startViewTransition(() => {
          applyTabChange()
        })
      } catch {
        applyTabChange()
      }
    },
    [activeTab, setActiveTab]
  )
}
