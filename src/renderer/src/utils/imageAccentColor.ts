type Rgb = { r: number; g: number; b: number }

type Hsl = { h: number; s: number; l: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))

    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6
        break
      case gn:
        h = (bn - rn) / delta + 2
        break
      default:
        h = (rn - gn) / delta + 4
        break
    }

    h *= 60
    if (h < 0) h += 360
  }

  return { h, s, l }
}

const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))

  let rn = 0
  let gn = 0
  let bn = 0

  if (hp >= 0 && hp < 1) {
    rn = c
    gn = x
  } else if (hp >= 1 && hp < 2) {
    rn = x
    gn = c
  } else if (hp >= 2 && hp < 3) {
    gn = c
    bn = x
  } else if (hp >= 3 && hp < 4) {
    gn = x
    bn = c
  } else if (hp >= 4 && hp < 5) {
    rn = x
    bn = c
  } else {
    rn = c
    bn = x
  }

  const m = l - c / 2
  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255)
  }
}

const rgbToHex = ({ r, g, b }: Rgb): string => {
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`
}

const getImageBitmapFromUrl = async (url: string, signal?: AbortSignal): Promise<ImageBitmap> => {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
  }
  const blob = await response.blob()
  return await createImageBitmap(blob)
}

const drawToCanvas = (bitmap: ImageBitmap, size: number): ImageData => {
  const width = bitmap.width
  const height = bitmap.height

  const scale = Math.min(size / width, size / height, 1)
  const targetW = Math.max(1, Math.floor(width * scale))
  const targetH = Math.max(1, Math.floor(height * scale))

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(targetW, targetH)
      : (document.createElement('canvas') as HTMLCanvasElement)

  ;(canvas as any).width = targetW
  ;(canvas as any).height = targetH

  const ctx = (canvas as any).getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null
  if (!ctx) throw new Error('Failed to get 2D context')

  ctx.drawImage(bitmap as any, 0, 0, targetW, targetH)
  return ctx.getImageData(0, 0, targetW, targetH)
}

export type DominantAccentOptions = {
  /** Downsample size (pixels). Larger is more accurate but slower. */
  sampleSize?: number
  signal?: AbortSignal
}

const cache = new Map<string, string>()

/**
 * Picks a UI-friendly dominant color from an image URL.
 *
 * Groups similar shades by hue so "mostly orange" becomes orange even with shading.
 */
export const getDominantAccentColorFromImageUrl = async (
  url: string,
  options: DominantAccentOptions = {}
): Promise<string> => {
  const trimmed = url.trim()
  if (!trimmed) throw new Error('Image url is empty')

  const cached = cache.get(trimmed)
  if (cached) return cached

  const sampleSize = options.sampleSize ?? 72

  const bitmap = await getImageBitmapFromUrl(trimmed, options.signal)
  try {
    const imageData = drawToCanvas(bitmap, sampleSize)

    const data = imageData.data

    // 24 hue buckets (15° each) + 1 neutral bucket for low saturation pixels.
    const bucketCount = 25
    const weightSums = new Array<number>(bucketCount).fill(0)
    const rSums = new Array<number>(bucketCount).fill(0)
    const gSums = new Array<number>(bucketCount).fill(0)
    const bSums = new Array<number>(bucketCount).fill(0)

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < 32) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      const { h, s, l } = rgbToHsl({ r, g, b })

      // Skip extreme whites/blacks which are often outlines/background.
      if (l < 0.05 || l > 0.97) continue

      const alphaWeight = a / 255
      const satWeight = 0.45 + 0.55 * s
      const lightWeight = l < 0.12 || l > 0.9 ? 0.4 : 1
      const weight = alphaWeight * satWeight * lightWeight

      const neutral = s < 0.08
      const bucket = neutral ? 24 : Math.floor(h / 15) % 24

      weightSums[bucket] += weight
      rSums[bucket] += r * weight
      gSums[bucket] += g * weight
      bSums[bucket] += b * weight
    }

    let bestBucket = -1
    let bestWeight = 0

    for (let bucket = 0; bucket < bucketCount; bucket++) {
      const w = weightSums[bucket]
      if (w > bestWeight) {
        bestBucket = bucket
        bestWeight = w
      }
    }

    // Prefer a chromatic bucket if it's reasonably competitive.
    const neutralWeight = weightSums[24]
    if (bestBucket === 24) {
      let bestChromatic = -1
      let bestChromaticWeight = 0
      for (let bucket = 0; bucket < 24; bucket++) {
        const w = weightSums[bucket]
        if (w > bestChromaticWeight) {
          bestChromatic = bucket
          bestChromaticWeight = w
        }
      }

      if (bestChromatic !== -1 && bestChromaticWeight > neutralWeight * 0.6) {
        bestBucket = bestChromatic
        bestWeight = bestChromaticWeight
      }
    }

    if (bestBucket === -1 || bestWeight <= 0) {
      throw new Error('No dominant color found')
    }

    const avg: Rgb = {
      r: rSums[bestBucket] / bestWeight,
      g: gSums[bestBucket] / bestWeight,
      b: bSums[bestBucket] / bestWeight
    }

    // Make the chosen accent more UI-friendly (avoid nearly-black/white accents).
    let hsl = rgbToHsl(avg)
    hsl = {
      h: hsl.h,
      s: bestBucket === 24 ? clamp(hsl.s, 0, 0.12) : clamp(hsl.s, 0.18, 0.95),
      l: clamp(hsl.l, 0.22, 0.72)
    }

    const accent = rgbToHex(hslToRgb(hsl))
    cache.set(trimmed, accent)
    return accent
  } finally {
    bitmap.close()
  }
}
