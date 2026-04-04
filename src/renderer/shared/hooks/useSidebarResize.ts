import { useEffect, useState, useCallback, useRef } from 'react'

export const useSidebarResize = () => {
  const [sidebarWidth, setSidebarWidth] = useState(248) // Slimmer default width
  const [isResizing, setIsResizing] = useState(false)
  const sidebarWidthRef = useRef(sidebarWidth)

  // Keep ref in sync
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
  }, [sidebarWidth])

  // Load saved width on mount
  useEffect(() => {
    const loadWidth = async () => {
      try {
        const savedWidth = await window.api.getSidebarWidth()
        if (savedWidth) {
          setSidebarWidth(savedWidth)
        }
      } catch (error) {
        console.error('Failed to load sidebar width:', error)
      }
    }
    loadWidth()
  }, [])

  // Save width when resizing stops
  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.api.setSidebarWidth(sidebarWidthRef.current)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = e.clientX
      const minWidth = 184
      const maxWidth = 360

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth)
      }
    }

    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, handleMouseUp])

  return { sidebarWidth, isResizing, setIsResizing }
}
