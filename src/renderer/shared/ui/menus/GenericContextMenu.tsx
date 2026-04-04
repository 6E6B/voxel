import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getDropdownMotion } from './dropdownMotion'
import {
  AnchoredOverlayPosition,
  resolveAnchoredOverlayPosition
} from './anchoredPosition'

export interface ContextMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

export interface ContextMenuSection {
  items: ContextMenuItem[]
}

interface GenericContextMenuProps {
  position: AnchoredOverlayPosition | null
  sections: ContextMenuSection[]
  onClose: () => void
  width?: number
  footer?: React.ReactNode
}

const VIEWPORT_PADDING = 10
const ITEM_HEIGHT = 44
const SECTION_GAP = 8
const MENU_CHROME = 16

const estimateMenuHeight = (sections: ContextMenuSection[], footer?: React.ReactNode) => {
  const sectionHeights = sections.reduce((total, section, index) => {
    const dividerHeight = index > 0 ? SECTION_GAP : 0
    return total + dividerHeight + section.items.length * ITEM_HEIGHT
  }, 0)

  return sectionHeights + MENU_CHROME + (footer ? 32 : 0)
}

const GenericContextMenu: React.FC<GenericContextMenuProps> = ({
  position,
  sections,
  onClose,
  width = 200,
  footer
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

  const visibleSections = useMemo(
    () => sections.filter((section) => section.items.length > 0),
    [sections]
  )

  const updatePosition = useCallback(() => {
    if (!position) {
      setMenuPosition(null)
      return
    }

    if (position.anchorElement && !document.contains(position.anchorElement)) {
      onClose()
      return
    }

    const resolved = resolveAnchoredOverlayPosition(position)
    const menuWidth = menuRef.current?.offsetWidth ?? width
    const menuHeight = menuRef.current?.offsetHeight ?? estimateMenuHeight(visibleSections, footer)
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, resolved.x),
      Math.max(VIEWPORT_PADDING, window.innerWidth - menuWidth - VIEWPORT_PADDING)
    )
    const top = Math.min(
      Math.max(VIEWPORT_PADDING, resolved.y),
      Math.max(VIEWPORT_PADDING, window.innerHeight - menuHeight - VIEWPORT_PADDING)
    )

    setMenuPosition((prev) => {
      if (prev?.top === top && prev.left === left) {
        return prev
      }

      return { top, left }
    })
  }, [footer, onClose, position, visibleSections, width])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (position) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [position, onClose])

  useEffect(() => {
    if (!position) {
      setMenuPosition(null)
      return
    }

    let rafId = 0
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updatePosition)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, true)
    window.addEventListener('resize', scheduleUpdate)

    const resizeObserver = new ResizeObserver(scheduleUpdate)

    if (position.anchorElement) {
      resizeObserver.observe(position.anchorElement)
    }

    if (menuRef.current) {
      resizeObserver.observe(menuRef.current)
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver.disconnect()
    }
  }, [position, updatePosition])

  if (!position) return null

  return createPortal(
    <AnimatePresence>
      {position && (
        <motion.div
          ref={menuRef}
          {...getDropdownMotion({ transformOrigin: 'top left', direction: 'down' })}
          className="fixed z-[1100] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden"
          style={{
            ...getDropdownMotion({ transformOrigin: 'top left', direction: 'down' }).style,
            top: menuPosition?.top ?? position.y,
            left: menuPosition?.left ?? position.x,
            width
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="p-1.5">
            {visibleSections.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {sectionIndex > 0 && <div className="h-px bg-[var(--color-border)] my-1" />}
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => {
                      item.onClick()
                      onClose()
                    }}
                    className={`pressable w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 rounded-lg transition-colors ${item.variant === 'danger'
                        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                      }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
            {footer ? (
              <>
                {visibleSections.length > 0 && <div className="h-px bg-[var(--color-border)] my-1" />}
                {footer}
              </>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default GenericContextMenu
