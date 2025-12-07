import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { TabId } from '../types'
import { useActiveTab, useSetActiveTab } from '../stores/useUIStore'

type TransitionRoot =
  | Document
  | (HTMLElement & { startViewTransition?: Document['startViewTransition'] })

const isViewTransitionCapable = (
  el: HTMLElement
): el is HTMLElement & { startViewTransition?: Document['startViewTransition'] } =>
  'startViewTransition' in el

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const getTransitionRoot = (): TransitionRoot | null => {
  if (typeof document === 'undefined') return null

  // Prefer the tab surface for scoped transitions when supported
  const scopedSurface = document.querySelector<HTMLElement>('.tab-transition-surface')
  if (scopedSurface && isViewTransitionCapable(scopedSurface)) {
    return scopedSurface
  }

  return document
}

const getStartTransition = () => {
  const root = getTransitionRoot()
  const scopedStart = root ? (root as any).startViewTransition : undefined
  if (typeof scopedStart === 'function') {
    return scopedStart.bind(root)
  }

  const docStart =
    typeof document !== 'undefined' ? (document as any).startViewTransition : undefined
  if (typeof docStart === 'function') {
    return docStart.bind(document)
  }

  return null
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

      if (prefersReducedMotion()) {
        applyTabChange()
        return
      }

      const startTransition = getStartTransition()
      if (typeof startTransition !== 'function') {
        applyTabChange()
        return
      }

      try {
        startTransition(() => {
          applyTabChange()
        })
      } catch {
        applyTabChange()
      }
    },
    [activeTab, setActiveTab]
  )
}
