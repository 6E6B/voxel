import { useEffect, RefObject } from 'react'

export const useClickOutside = (
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  additionalCondition?: boolean
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
      if (additionalCondition) {
        const target = event.target as HTMLElement
        if (!target.closest('[data-menu-id]')) {
          handler()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    if (additionalCondition) {
      window.addEventListener('scroll', handler, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (additionalCondition) {
        window.removeEventListener('scroll', handler, true)
      }
    }
  }, [ref, handler, additionalCondition])
}
