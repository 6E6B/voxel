import type React from 'react'

const DROPDOWN_BLUR_PX = 6

export const dropdownMotionTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.75
} as const

interface DropdownMotionOptions {
  transformOrigin?: React.CSSProperties['transformOrigin']
  direction?: 'up' | 'down' | 'left' | 'right'
  collapsedScale?: number
  offset?: number
}

export const getDropdownMotion = ({
  transformOrigin = 'top center',
  direction = 'down',
  collapsedScale = 0.88,
  offset = 8
}: DropdownMotionOptions = {}): {
  initial: { opacity: number; scale: number; x: number; y: number; filter: string }
  animate: { opacity: number; x: number; scale: number; y: number; filter: string }
  exit: { opacity: number; scale: number; x: number; y: number; filter: string }
  transition: typeof dropdownMotionTransition
  style: { transformOrigin: React.CSSProperties['transformOrigin'] }
} => {
  const x = direction === 'left' ? offset : direction === 'right' ? -offset : 0
  const y = direction === 'up' ? offset : direction === 'down' ? -offset : 0

  return {
    initial: {
      opacity: 0,
      scale: collapsedScale,
      x,
      y,
      filter: `blur(${DROPDOWN_BLUR_PX}px)`
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      y: 0,
      filter: 'blur(0px)'
    },
    exit: {
      opacity: 0,
      scale: collapsedScale,
      x,
      y,
      filter: `blur(${DROPDOWN_BLUR_PX}px)`
    },
    transition: dropdownMotionTransition,
    style: { transformOrigin }
  } as const
}