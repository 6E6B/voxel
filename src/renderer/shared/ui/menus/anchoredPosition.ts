import type React from 'react'

export interface AnchoredOverlayPosition {
  x: number
  y: number
  anchorElement?: HTMLElement | null
  anchorOffsetX?: number
  anchorOffsetY?: number
}

export const createAnchoredOverlayPosition = <T extends Element = Element>(
  event: React.MouseEvent<T>,
  anchorElement: HTMLElement | null = event.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : null
): AnchoredOverlayPosition => {
  if (!anchorElement) {
    return {
      x: event.clientX,
      y: event.clientY
    }
  }

  const rect = anchorElement.getBoundingClientRect()

  return {
    x: event.clientX,
    y: event.clientY,
    anchorElement,
    anchorOffsetX: event.clientX - rect.left,
    anchorOffsetY: event.clientY - rect.top
  }
}

export const resolveAnchoredOverlayPosition = (position: AnchoredOverlayPosition) => {
  if (position.anchorElement && document.contains(position.anchorElement)) {
    const rect = position.anchorElement.getBoundingClientRect()

    return {
      x: rect.left + (position.anchorOffsetX ?? 0),
      y: rect.top + (position.anchorOffsetY ?? 0)
    }
  }

  return {
    x: position.x,
    y: position.y
  }
}