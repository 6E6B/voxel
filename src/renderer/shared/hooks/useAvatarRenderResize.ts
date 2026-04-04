import { useEffect, useState, useCallback, useRef } from 'react'

export const useAvatarRenderResize = (containerRef: React.RefObject<HTMLElement | null>) => {
  const [avatarRenderWidth, setAvatarRenderWidth] = useState(500)
  const [isResizing, setIsResizing] = useState(false)
  const avatarRenderWidthRef = useRef(avatarRenderWidth)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Keep ref in sync
  useEffect(() => {
    avatarRenderWidthRef.current = avatarRenderWidth
  }, [avatarRenderWidth])

  // Load saved width on mount
  useEffect(() => {
    const loadWidth = async () => {
      try {
        const savedWidth = await window.api.getAvatarRenderWidth()
        if (savedWidth) {
          setAvatarRenderWidth(savedWidth)
        }
      } catch (error) {
        console.error('Failed to load avatar render width:', error)
      }
    }
    loadWidth()
  }, [])

  // Save width when resizing stops
  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.api.setAvatarRenderWidth(avatarRenderWidthRef.current)
  }, [])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      startXRef.current = e.clientX
      startWidthRef.current = rect.width
      setIsResizing(true)
    },
    [containerRef]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const deltaX = e.clientX - startXRef.current
      const newWidth = startWidthRef.current + deltaX
      const minWidth = 300
      const maxWidth = window.innerWidth * 0.7

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setAvatarRenderWidth(newWidth)
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
  }, [isResizing, handleMouseUp, containerRef])

  return { avatarRenderWidth, isResizing, setIsResizing, handleResizeStart }
}
