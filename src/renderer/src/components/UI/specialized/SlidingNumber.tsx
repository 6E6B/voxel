'use client'

import * as React from 'react'
import {
  useSpring,
  useTransform,
  motion,
  useInView,
  useMotionValue,
  type MotionValue,
  type SpringOptions,
  type UseInViewOptions
} from 'framer-motion'
import { cn } from '../../../lib/utils'

function useMeasure() {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [bounds, setBounds] = React.useState({ height: 0 })

  React.useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setBounds({ height: entry.contentRect.height })
      }
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, bounds] as const
}

type SlidingNumberRollerProps = {
  value: MotionValue<number>
  place: number
  isSticky?: boolean
}

function SlidingNumberRoller({ value, place, isSticky = false }: SlidingNumberRollerProps) {
  const digitValue = useTransform(value, (v) => {
    const val = v / place
    if (!isSticky) return val

    // Odometer logic: only move when lower digits wrap
    // This corresponds to the decimal part of `val` being > 0.9
    const integer = Math.floor(val)
    const decimal = val - integer

    if (decimal < 0.9) {
      return integer
    } else {
      // Map 0.9->1.0 to 0.0->1.0 relative to the integer
      return integer + (decimal - 0.9) * 10
    }
  })

  const [measureRef, { height }] = useMeasure()

  return (
    <span
      ref={measureRef}
      data-slot="sliding-number-roller"
      className="relative inline-block w-[1ch] leading-none tabular-nums"
      style={{ overflow: 'hidden' }}
    >
      <span className="invisible">0</span>
      {height > 0 &&
        Array.from({ length: 10 }, (_, i) => (
          <SlidingNumberDisplay key={i} motionValue={digitValue} number={i} height={height} />
        ))}
    </span>
  )
}

type SlidingNumberDisplayProps = {
  motionValue: MotionValue<number>
  number: number
  height: number
}

function SlidingNumberDisplay({ motionValue, number, height }: SlidingNumberDisplayProps) {
  const y = useTransform(motionValue, (latest) => {
    if (!height) return 0
    // Normalize placeValue to be in range [0, 10) for consistent calculation
    let placeValue = latest % 10
    if (placeValue < 0) placeValue += 10

    // Calculate the offset: how many positions this digit needs to move
    // We want digit 'number' to be visible when placeValue equals 'number'
    let offset = number - placeValue

    // Normalize offset to be in range [-5, 5] for smooth wrapping
    // This ensures digits wrap correctly (e.g., when going from 9 to 0)
    while (offset > 5) offset -= 10
    while (offset < -5) offset += 10

    return offset * height
  })

  if (!height) {
    return <span className="invisible absolute">{number}</span>
  }

  return (
    <motion.span
      data-slot="sliding-number-display"
      style={{ y }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {number}
    </motion.span>
  )
}

type SlidingNumberProps = React.ComponentProps<'span'> & {
  number: number | string
  inView?: boolean
  inViewMargin?: UseInViewOptions['margin']
  inViewOnce?: boolean
  padStart?: boolean
  decimalSeparator?: string
  decimalPlaces?: number
  transition?: SpringOptions
  formatter?: (value: number) => string
}

function SlidingNumber({
  number,
  className,
  inView = false,
  inViewMargin = '0px',
  inViewOnce = true,
  padStart = false,
  decimalSeparator = '.',
  decimalPlaces = 0,
  transition = {
    stiffness: 200,
    damping: 20,
    mass: 0.4
  },
  formatter,
  ...props
}: SlidingNumberProps) {
  const localRef = React.useRef<HTMLSpanElement>(null)

  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin
  })

  const isInView = !inView || inViewResult

  const rawNumber = React.useMemo(
    () => (!isInView ? 0 : Math.abs(Number(number))),
    [number, isInView]
  )

  const formatDisplayNumber = React.useCallback(
    (num: number) => {
      if (formatter) return formatter(num)
      return decimalPlaces != null ? num.toFixed(decimalPlaces) : num.toString()
    },
    [decimalPlaces, formatter]
  )

  const numberStr = formatDisplayNumber(rawNumber)

  // Extract suffix (non-digit characters at the end, like K, M, B)
  const suffixMatch = numberStr.match(/[^\d.]+$/)
  const suffix = suffixMatch ? suffixMatch[0] : ''
  const numberWithoutSuffix = suffix ? numberStr.slice(0, -suffix.length) : numberStr

  // Align the animated value with the formatted numeric portion so abbreviated numbers animate correctly
  const displayValue = React.useMemo(() => {
    const cleaned = numberWithoutSuffix.replace(/[^\d.-]/g, '')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }, [numberWithoutSuffix])

  // Initialize with the current value to prevent animation on mount/remount
  const targetValue = useMotionValue(displayValue)
  const animatedValue = useSpring(targetValue, transition)
  const isInitialMountRef = React.useRef(true)
  const previousValueRef = React.useRef<number>(displayValue)

  React.useEffect(() => {
    // On initial mount, set the value immediately without animation
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      previousValueRef.current = displayValue
      // Set immediately without animation on first mount
      targetValue.set(displayValue)
      return
    }

    // Don't animate if the value hasn't changed
    if (displayValue === previousValueRef.current) {
      // Ensure the motion value is set to the current value (no animation)
      const currentValue = targetValue.get()
      if (Math.abs(currentValue - displayValue) > 0.001) {
        targetValue.set(displayValue)
      }
      return
    }

    // Value has changed, animate to the new value
    previousValueRef.current = displayValue
    targetValue.set(displayValue)
  }, [displayValue, targetValue])

  const [newIntStrRaw, newDecStrRaw = ''] = numberWithoutSuffix.split('.')
  // Remove any non-digit characters from decimal part (in case of edge cases)
  const cleanDecStr = newDecStrRaw.replace(/\D/g, '')
  const newIntStr = padStart && newIntStrRaw?.length === 1 ? '0' + newIntStrRaw : newIntStrRaw

  const intDigitCount = newIntStr?.length ?? 0
  const intPlaces = React.useMemo(
    () => Array.from({ length: intDigitCount }, (_, i) => Math.pow(10, intDigitCount - i - 1)),
    [intDigitCount]
  )

  const decPlaces = React.useMemo(
    () =>
      cleanDecStr
        ? Array.from({ length: cleanDecStr.length }, (_, i) => Math.pow(10, -(i + 1)))
        : [],
    [cleanDecStr]
  )

  const smallestPlace = React.useMemo(() => {
    if (decPlaces.length > 0) return decPlaces[decPlaces.length - 1]
    return intPlaces.length > 0 ? 1 : 0
  }, [decPlaces, intPlaces])

  return (
    <span
      ref={localRef}
      data-slot="sliding-number"
      className={cn('flex items-center', className)}
      {...props}
    >
      {isInView && Number(number) < 0 && <span className="mr-1">-</span>}
      {intPlaces.map((place) => (
        <SlidingNumberRoller
          key={`int-${place}`}
          value={animatedValue}
          place={place}
          isSticky={place > smallestPlace}
        />
      ))}
      {cleanDecStr && (
        <>
          <span>{decimalSeparator}</span>
          {decPlaces.map((place) => (
            <SlidingNumberRoller
              key={`dec-${place}`}
              value={animatedValue}
              place={place}
              isSticky={place > smallestPlace}
            />
          ))}
        </>
      )}
      {suffix && <span>{suffix}</span>}
    </span>
  )
}

export { SlidingNumber, type SlidingNumberProps }
