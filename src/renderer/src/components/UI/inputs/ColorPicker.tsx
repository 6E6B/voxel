'use client'

import Color from 'color'

import { PipetteIcon } from 'lucide-react'

import {
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { Button } from '../buttons/Button'
import { Input } from './Input'
import CustomDropdown, { DropdownOption } from '../menus/CustomDropdown'
import { cn } from '../../../lib/utils'

interface ColorPickerContextValue {
  hue: number
  saturation: number
  lightness: number
  alpha: number
  mode: string
  setHue: (hue: number) => void
  setSaturation: (saturation: number) => void
  setLightness: (lightness: number) => void
  setAlpha: (alpha: number) => void
  setMode: (mode: string) => void
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined)

function useColorPicker() {
  const context = useContext(ColorPickerContext)
  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider')
  }
  return context
}

// Simple Slider to replace Radix Slider
const Slider = ({
  value,
  max,
  onValueChange,
  className,
  trackClass,
  thumbClass,
  gradientOverlay,
  orientation = 'horizontal',
  trackStyle
}: {
  value: number[]
  max: number
  onValueChange: (val: number[]) => void
  className?: string
  trackClass?: string
  thumbClass?: string
  style?: React.CSSProperties
  gradientOverlay?: string
  orientation?: 'horizontal' | 'vertical'
  trackStyle?: React.CSSProperties
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isVertical = orientation === 'vertical'

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const node = containerRef.current
    if (!node) return

    const update = (clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect()
      let percentage: number
      if (isVertical) {
        // For vertical, top is 0 (min) and bottom is 1 (max)
        percentage = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      } else {
        percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      }
      onValueChange([Math.round(percentage * max)])
    }

    update(e.clientX, e.clientY)

    const handlePointerMove = (e: PointerEvent) => update(e.clientX, e.clientY)
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const percentage = (value[0] / max) * 100

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative touch-none select-none cursor-pointer',
        isVertical ? 'flex flex-col h-full w-full' : 'flex h-5 w-full items-center',
        className
      )}
      onPointerDown={handlePointerDown}
    >
      <div
        className={cn(
          'relative rounded-full overflow-hidden',
          isVertical ? 'w-full h-full' : 'h-3 w-full grow',
          trackClass
        )}
        style={trackStyle}
      >
        {gradientOverlay ? (
          <div className="absolute inset-0 rounded-full" style={{ background: gradientOverlay }} />
        ) : null}
      </div>
      <div
        className={cn(
          'absolute h-5 w-5 rounded-full border-2 border-white bg-neutral-950 shadow transition-transform focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          isVertical
            ? 'left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'top-1/2 -translate-y-1/2 -translate-x-1/2',
          thumbClass
        )}
        style={isVertical ? { top: `${percentage}%` } : { left: `${percentage}%` }}
      />
    </div>
  )
}

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value?: string
  defaultValue?: string
  onChange?: (value: [number, number, number, number]) => void // r, g, b, a
}

export const ColorPicker = ({
  value,
  defaultValue = '#000000',
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  // Use try-catch or safe parsing
  const parseColor = (v: string) => {
    try {
      return Color(v)
    } catch {
      return Color('#000000')
    }
  }

  const selectedColor = parseColor(value || defaultValue)

  // Note: Color library hue() returns 0-360, saturationl() returns 0-100, lightness() returns 0-100
  const [hue, setHue] = useState(selectedColor.hue())
  const [saturation, setSaturation] = useState(selectedColor.saturationl())
  const [lightness, setLightness] = useState(selectedColor.lightness())
  const [alpha, setAlpha] = useState(selectedColor.alpha() * 100)
  const [mode, setMode] = useState('hex')

  // Track if we're syncing from props to avoid infinite loops
  const isSyncingFromPropsRef = useRef(false)
  const lastNotifiedColorRef = useRef<string | null>(null)
  const lastNotifiedAlphaRef = useRef<number | null>(null)
  const onChangeRef = useRef(onChange)
  const isInitialMountRef = useRef(true)

  // Initialize lastNotifiedColor immediately
  const initialColor = parseColor(value || defaultValue)
  if (lastNotifiedColorRef.current === null) {
    lastNotifiedColorRef.current = initialColor.hex()
    lastNotifiedAlphaRef.current = initialColor.alpha()
  }

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Mark initial mount as complete after first render
  useEffect(() => {
    isInitialMountRef.current = false
  }, [])

  // Update internal state when prop value changes
  useEffect(() => {
    if (value) {
      const color = parseColor(value)
      const hex = color.hex()
      const newAlpha = color.alpha()

      // Only update if the value actually changed from outside
      if (lastNotifiedColorRef.current !== hex || lastNotifiedAlphaRef.current !== newAlpha) {
        isSyncingFromPropsRef.current = true
        setHue(color.hue())
        setSaturation(color.saturationl())
        setLightness(color.lightness())
        setAlpha(newAlpha * 100)
        lastNotifiedColorRef.current = hex
        lastNotifiedAlphaRef.current = newAlpha

        // Reset flag in next tick
        requestAnimationFrame(() => {
          isSyncingFromPropsRef.current = false
        })
      }
    }
  }, [value])

  // Notify parent (only when user interacts, not when syncing from props)
  useEffect(() => {
    // Don't notify on initial mount or when syncing from props
    if (isInitialMountRef.current || isSyncingFromPropsRef.current || !onChangeRef.current) {
      return
    }

    const color = Color.hsl(hue, saturation, lightness)
    const rgb = color.rgb().array()
    const hex = color.hex()
    const currentAlpha = 1.0

    // Only notify if color actually changed
    if (rgb.length >= 3 && lastNotifiedColorRef.current !== hex) {
      lastNotifiedColorRef.current = hex
      lastNotifiedAlphaRef.current = currentAlpha
      onChangeRef.current([rgb[0], rgb[1], rgb[2], currentAlpha])
    }
  }, [hue, saturation, lightness])

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        lightness,
        alpha,
        mode,
        setHue,
        setSaturation,
        setLightness,
        setAlpha,
        setMode
      }}
    >
      <div className={cn('flex w-full flex-col gap-4', className)} {...props}>
        {props.children || (
          <>
            <ColorPickerSelection className="h-64 rounded-xl border border-[var(--color-border)]" />
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <ColorPickerHue />
                </div>
                <ColorPickerEyeDropper />
              </div>
              <div className="flex gap-2">
                <ColorPickerOutput />
                <ColorPickerFormat />
              </div>
            </div>
          </>
        )}
      </div>
    </ColorPickerContext.Provider>
  )
}

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerSelection = memo(({ className, ...props }: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { hue, saturation, lightness, setSaturation, setLightness } = useColorPicker()
  const isUserInteractingRef = useRef(false)

  const calculatePositionFromColor = useCallback((sat: number, light: number) => {
    const x = sat / 100
    const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x)
    const y = topLightness > 0 ? 1 - light / topLightness : 0
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    }
  }, [])

  const initialPos = calculatePositionFromColor(saturation, lightness)
  const [positionX, setPositionX] = useState(initialPos.x)
  const [positionY, setPositionY] = useState(initialPos.y)

  const prevSatRef = useRef(saturation)
  const prevLightRef = useRef(lightness)

  useEffect(() => {
    if (isUserInteractingRef.current) return
    if (prevSatRef.current === saturation && prevLightRef.current === lightness) return

    prevSatRef.current = saturation
    prevLightRef.current = lightness

    const pos = calculatePositionFromColor(saturation, lightness)
    setPositionX(pos.x)
    setPositionY(pos.y)
  }, [saturation, lightness, calculatePositionFromColor])

  const backgroundGradient = useMemo(() => {
    return `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
            linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
            hsl(${hue}, 100%, 50%)`
  }, [hue])

  const handleMove = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))

      setPositionX(x)
      setPositionY(y)

      const newSaturation = x * 100
      const topLightness = x < 0.01 ? 100 : 50 + 50 * (1 - x)
      const newLightness = topLightness * (1 - y)

      prevSatRef.current = newSaturation
      prevLightRef.current = newLightness

      setSaturation(newSaturation)
      setLightness(newLightness)
    },
    [setSaturation, setLightness]
  )

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) handleMove(e)
    }
    const handlePointerUp = () => {
      setIsDragging(false)
      isUserInteractingRef.current = false
    }

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, handleMove])

  return (
    <div
      className={cn('relative size-full cursor-crosshair rounded-md', className)}
      onPointerDown={(e) => {
        e.preventDefault()
        isUserInteractingRef.current = true
        setIsDragging(true)
        handleMove(e)
      }}
      ref={containerRef}
      style={{ background: backgroundGradient }}
      {...props}
    >
      <div
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ring-1 ring-neutral-900/50"
        style={{
          left: `${positionX * 100}%`,
          top: `${positionY * 100}%`
        }}
      />
    </div>
  )
})

ColorPickerSelection.displayName = 'ColorPickerSelection'

export type ColorPickerHueProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
}

export const ColorPickerHue = ({
  className,
  orientation = 'horizontal',
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker()
  const isVertical = orientation === 'vertical'
  const gradient = isVertical
    ? 'linear-gradient(180deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)'
    : 'linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)'

  return (
    <Slider
      className={cn('rounded-full', className)}
      max={360}
      onValueChange={([val]) => setHue(val)}
      value={[hue]}
      orientation={orientation}
      trackClass="rounded-full"
      gradientOverlay={gradient}
      {...props}
    />
  )
}

export const ColorPickerAlpha = ({ className }: React.HTMLAttributes<HTMLDivElement>) => {
  const { hue, saturation, lightness, alpha, setAlpha } = useColorPicker()
  const color = Color.hsl(hue, saturation, lightness)
  const rgb = color.rgb().array()
  const gradientOverlay = `linear-gradient(to right, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0), rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1))`

  return (
    <Slider
      className={cn(className)}
      max={100}
      onValueChange={([val]) => {
        setAlpha(val)
      }}
      value={[alpha]}
      trackClass="bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] bg-left-center bg-repeat"
      gradientOverlay={gradientOverlay}
    />
  )
}

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const { setHue, setSaturation, setLightness } = useColorPicker()

  const handleEyeDropper = async () => {
    try {
      if (!('EyeDropper' in window)) {
        alert('EyeDropper API not supported in this browser.')
        return
      }
      const EyeDropper = (window as any).EyeDropper as new () => {
        open: () => Promise<{ sRGBHex: string }>
      }
      const eyeDropper = new EyeDropper()
      const result = await eyeDropper.open()
      const color = Color(result.sRGBHex)
      setHue(color.hue())
      setSaturation(color.saturationl())
      setLightness(color.lightness())
    } catch (error) {
      console.error('EyeDropper failed:', error)
    }
  }

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={handleEyeDropper}
      size="icon"
      variant="outline"
      type="button"
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  )
}

const formats: DropdownOption[] = [
  { value: 'hex', label: 'HEX' },
  { value: 'rgb', label: 'RGB' },
  { value: 'css', label: 'CSS' },
  { value: 'hsl', label: 'HSL' }
]

export const ColorPickerOutput = ({ className }: React.HTMLAttributes<HTMLDivElement>) => {
  const { mode, setMode } = useColorPicker()
  return (
    <div className={cn('w-24 shrink-0', className)}>
      <CustomDropdown
        options={formats}
        value={mode}
        onChange={setMode}
        buttonClassName="h-10 px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-md text-xs uppercase"
      />
    </div>
  )
}

export const ColorPickerFormat = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { hue, saturation, lightness, mode, setHue, setSaturation, setLightness } = useColorPicker()
  const color = Color.hsl(hue, saturation, lightness)
  const [hexValue, setHexValue] = useState(color.hex())
  const [cssValue, setCssValue] = useState(
    `rgb(${color
      .rgb()
      .array()
      .map((v) => Math.round(v))
      .join(', ')})`
  )

  // Update local state when color changes from outside
  useEffect(() => {
    if (mode === 'hex') {
      setHexValue(color.hex())
    } else if (mode === 'css') {
      const rgb = color
        .rgb()
        .array()
        .map((v) => Math.round(v))
      setCssValue(`rgb(${rgb.join(', ')})`)
    }
  }, [color, mode])

  const handleHexChange = (value: string) => {
    setHexValue(value)
    try {
      const newColor = Color(value)
      setHue(newColor.hue())
      setSaturation(newColor.saturationl())
      setLightness(newColor.lightness())
    } catch {
      // Invalid color, ignore - allow typing
    }
  }

  const handleHexBlur = () => {
    // Reset to valid color on blur if invalid
    try {
      Color(hexValue)
    } catch {
      setHexValue(color.hex())
    }
  }

  const handleRgbChange = (index: number, value: string) => {
    try {
      const num = parseInt(value)
      if (isNaN(num) || num < 0 || num > 255) return
      const rgb = color.rgb().array()
      rgb[index] = num
      const newColor = Color.rgb(rgb[0], rgb[1], rgb[2])
      setHue(newColor.hue())
      setSaturation(newColor.saturationl())
      setLightness(newColor.lightness())
    } catch {
      // Invalid value, ignore
    }
  }

  const handleCssChange = (value: string) => {
    setCssValue(value)
    try {
      // Try to parse rgb(...) format
      const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
          const newColor = Color.rgb(r, g, b)
          setHue(newColor.hue())
          setSaturation(newColor.saturationl())
          setLightness(newColor.lightness())
        }
      }
    } catch {
      // Invalid value, ignore - allow typing
    }
  }

  const handleCssBlur = () => {
    // Reset to valid color on blur if invalid
    try {
      const match = cssValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const r = parseInt(match[1])
        const g = parseInt(match[2])
        const b = parseInt(match[3])
        if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
          return // Valid
        }
      }
    } catch {
      // Invalid
    }
    const rgb = color
      .rgb()
      .array()
      .map((v) => Math.round(v))
    setCssValue(`rgb(${rgb.join(', ')})`)
  }

  const handleHslChange = (index: number, value: string) => {
    try {
      const num = parseFloat(value)
      if (isNaN(num)) return
      if (index === 0) {
        // Hue: 0-360
        if (num >= 0 && num <= 360) {
          setHue(num)
        }
      } else if (index === 1) {
        // Saturation: 0-100
        if (num >= 0 && num <= 100) {
          setSaturation(num)
        }
      } else if (index === 2) {
        // Lightness: 0-100
        if (num >= 0 && num <= 100) {
          setLightness(num)
        }
      }
    } catch {
      // Invalid value, ignore
    }
  }

  if (mode === 'hex') {
    return (
      <div className={cn('flex w-full items-center', className)} {...props}>
        <Input
          className="h-10 rounded-md bg-neutral-900 px-3 text-xs shadow-none font-mono"
          type="text"
          value={hexValue}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
        />
      </div>
    )
  }

  if (mode === 'rgb') {
    const rgb = color
      .rgb()
      .array()
      .map((v) => Math.round(v))
    return (
      <div className={cn('flex items-center w-full', className)} {...props}>
        <Input
          className="h-10 rounded-r-none rounded-l-md bg-neutral-900 px-1 text-xs text-center shadow-none border-r-0"
          value={rgb[0]}
          onChange={(e) => handleRgbChange(0, e.target.value)}
        />
        <Input
          className="h-10 rounded-none bg-neutral-900 px-1 text-xs text-center shadow-none border-r-0 border-l-0"
          value={rgb[1]}
          onChange={(e) => handleRgbChange(1, e.target.value)}
        />
        <Input
          className="h-10 rounded-none rounded-r-md bg-neutral-900 px-1 text-xs text-center shadow-none border-l-0"
          value={rgb[2]}
          onChange={(e) => handleRgbChange(2, e.target.value)}
        />
      </div>
    )
  }

  if (mode === 'css') {
    return (
      <div className={cn('w-full', className)} {...props}>
        <Input
          className="h-10 bg-neutral-900 px-3 text-xs shadow-none font-mono"
          value={cssValue}
          onChange={(e) => handleCssChange(e.target.value)}
          onBlur={handleCssBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
        />
      </div>
    )
  }

  if (mode === 'hsl') {
    const hsl = color
      .hsl()
      .array()
      .map((v) => Math.round(v))
    return (
      <div className={cn('flex items-center w-full', className)} {...props}>
        <Input
          className="h-10 rounded-r-none rounded-l-md bg-neutral-900 px-1 text-xs text-center shadow-none border-r-0"
          value={hsl[0]}
          onChange={(e) => handleHslChange(0, e.target.value)}
        />
        <Input
          className="h-10 rounded-none bg-neutral-900 px-1 text-xs text-center shadow-none border-r-0 border-l-0"
          value={hsl[1]}
          onChange={(e) => handleHslChange(1, e.target.value)}
        />
        <Input
          className="h-10 rounded-none rounded-r-md bg-neutral-900 px-1 text-xs text-center shadow-none border-l-0"
          value={hsl[2]}
          onChange={(e) => handleHslChange(2, e.target.value)}
        />
      </div>
    )
  }

  return null
}
