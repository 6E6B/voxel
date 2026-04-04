import React, { useRef, useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'

interface TruncatedTextWithTooltipProps {
  text: string
  className?: string
}

export const TruncatedTextWithTooltip: React.FC<TruncatedTextWithTooltipProps> = ({
  text,
  className
}) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const checkTruncation = () => {
      const node = textRef.current
      if (!node) return
      const truncated =
        node.scrollHeight - node.clientHeight > 1 || node.scrollWidth - node.clientWidth > 1
      setIsTruncated(truncated)
    }

    checkTruncation()

    let resizeObserver: ResizeObserver | null = null
    let resizeListenerAttached = false

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => checkTruncation())
      resizeObserver.observe(element)
    } else if (typeof window !== 'undefined') {
      resizeListenerAttached = true
      window.addEventListener('resize', checkTruncation)
    }

    return () => {
      resizeObserver?.disconnect()
      if (resizeListenerAttached && typeof window !== 'undefined') {
        window.removeEventListener('resize', checkTruncation)
      }
    }
  }, [text])

  const content = (
    <div ref={textRef} className={className}>
      {text}
    </div>
  )

  if (!isTruncated) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

