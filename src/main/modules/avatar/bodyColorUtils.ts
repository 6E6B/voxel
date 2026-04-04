const BODY_COLOR_BASE_KEYS = [
  'headColor',
  'torsoColor',
  'rightArmColor',
  'leftArmColor',
  'rightLegColor',
  'leftLegColor'
] as const

// BrickColor ID to hex color mapping (common skin tones and colors)
// Reference: https://developer.roblox.com/en-us/articles/BrickColor-Codes
const BRICK_COLOR_TO_HEX: Record<number, string> = {
  1: 'F2F3F3', // White
  5: 'D7C59A', // Brick yellow
  9: 'E8BAC8', // Light reddish violet
  18: 'CC8E69', // Nougat
  21: 'C4281C', // Bright red
  23: '0D69AC', // Bright blue
  24: 'F5CD30', // Bright yellow
  26: '1B2A35', // Black
  28: '287F47', // Dark green
  29: 'A1C48C', // Medium green
  37: '4B974B', // Bright green
  38: 'AA5500', // Dark orange
  45: 'B4D2E4', // Light blue
  101: 'DA867A', // Medium red
  102: '6E99CA', // Medium blue
  104: '6B327C', // Bright violet
  105: 'E29B40', // Br. yellowish orange
  106: 'DA8541', // Bright orange
  107: '008F9C', // Bright bluish green
  119: 'A4BD47', // Br. yellowish green
  125: 'EAB892', // Light orange
  135: '74869D', // Sand blue
  141: '27462D', // Earth green
  151: '789082', // Sand green
  153: '957977', // Sand red
  192: '694028', // Reddish brown
  194: 'A3A2A5', // Medium stone grey
  199: '635F62', // Dark stone grey
  208: 'E5E4DF', // Light stone grey
  217: '7C5C46', // Brown
  226: 'FDEA8D', // Cool yellow
  1001: 'F8F8F8', // Institutional white
  1002: 'CDCDCD', // Mid gray
  1003: '111111', // Really black
  1004: 'FF0000', // Really red
  1005: 'FFB000', // Deep orange
  1006: 'B480FF', // Alder
  1007: '9F8660', // Dusty Rose (actually more brown)
  1008: 'C1BE42', // Olive
  1009: 'FFFF00', // New Yeller
  1010: '0000FF', // Really blue
  1011: '002060', // Navy blue
  1012: '2154B9', // Deep blue
  1013: 'A86F99', // Magenta
  1014: 'AA5599', // Pink
  1015: 'AA00AA', // Hot pink
  1016: '993399', // Crimson
  1017: 'FFCC00', // Bright yellow (deep)
  1018: '006400', // Really green
  1019: '00FFFF', // Cyan
  1020: '00FF00', // Lime green
  1021: '3A7D15', // Camo
  1022: '7F8E64', // Grime
  1023: 'E8E8E8', // Lavender (actually light grey)
  1024: 'AFDDFF', // Pastel light blue
  1025: 'FFC9C9', // Pastel orange (actually pink)
  1026: 'B1A7FF', // Pastel violet
  1027: '9FF3E9', // Pastel blue-green
  1028: 'CCFFCC', // Pastel green
  1029: 'FFFFCC', // Pastel yellow (common skin tone)
  1030: 'FFCC99', // Pastel brown
  1031: '6C584C', // Royal purple (actually brown)
  1032: 'FF9494' // Hot pink (lighter)
}

/**
 * Convert a BrickColor ID to a hex color string
 * Used by renderAvatarWithAsset when avatar API returns colors as IDs
 */
export function brickColorToHex(brickColorId: number): string | undefined {
  return BRICK_COLOR_TO_HEX[brickColorId]
}

/**
 * Normalize a Color3 hex string (remove # prefix, uppercase)
 */
export function normalizeColor3(color: string): string {
  const trimmed = color.trim()
  if (trimmed.startsWith('#')) {
    return trimmed.slice(1).toUpperCase()
  }
  return trimmed.toUpperCase()
}

/**
 * Resolve a body color ID from various possible input formats
 */
export function resolveBodyColorId(
  bodyColors: any,
  baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
): number | undefined {
  const directKey = `${baseKey}Id`
  if (typeof bodyColors[directKey] === 'number') {
    return bodyColors[directKey]
  }

  const altKey = `${baseKey}ID`
  if (typeof bodyColors[altKey] === 'number') {
    return bodyColors[altKey]
  }

  const nested = bodyColors[baseKey]
  if (nested && typeof nested === 'object') {
    const idCandidates = [
      nested.id,
      nested.Id,
      nested.brickColorId,
      nested.BrickColorId,
      nested.value,
      nested.Value
    ]

    const match = idCandidates.find((val) => typeof val === 'number')
    if (typeof match === 'number') {
      return match
    }
  }

  return undefined
}

/**
 * Resolve a body color Color3 hex string from various possible input formats
 */
export function resolveBodyColor3(
  bodyColors: any,
  baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
): string | undefined {
  const directKey = `${baseKey}3`
  if (typeof bodyColors[directKey] === 'string') {
    return normalizeColor3(bodyColors[directKey])
  }

  const nested = bodyColors[baseKey]
  if (nested && typeof nested === 'object') {
    const colorCandidates = [
      nested.color3,
      nested.Color3,
      nested.hexColor,
      nested.HexColor,
      nested.hex,
      nested.Hex,
      nested.color,
      nested.Color
    ]

    const match = colorCandidates.find((val) => typeof val === 'string')
    if (typeof match === 'string') {
      return normalizeColor3(match)
    }
  }

  return undefined
}

/**
 * Extract body color IDs from bodyColors object
 */
export function extractBodyColorIds(bodyColors: any): Record<string, number> | undefined {
  if (!bodyColors || typeof bodyColors !== 'object') {
    return undefined
  }

  const payload: Record<string, number> = {}

  BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
    const normalizedKey = `${baseKey}Id`
    const value = resolveBodyColorId(bodyColors, baseKey)
    if (typeof value === 'number') {
      payload[normalizedKey] = value
    }
  })

  return Object.keys(payload).length > 0 ? payload : undefined
}

/**
 * Extract body color Color3 hex strings from bodyColors object
 */
export function extractBodyColor3s(bodyColors: any): Record<string, string> | undefined {
  if (!bodyColors || typeof bodyColors !== 'object') {
    return undefined
  }

  const payload: Record<string, string> = {}

  BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
    const normalizedKey = `${baseKey}3`
    const value = resolveBodyColor3(bodyColors, baseKey)
    if (typeof value === 'string') {
      payload[normalizedKey] = value
    }
  })

  const nestedBodyColor3s = bodyColors.bodyColor3s
  if (nestedBodyColor3s && typeof nestedBodyColor3s === 'object') {
    BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
      const normalizedKey = `${baseKey}3`
      const value = nestedBodyColor3s[normalizedKey]
      if (typeof value === 'string') {
        payload[normalizedKey] = normalizeColor3(value)
      }
    })
  }

  return Object.keys(payload).length > 0 ? payload : undefined
}

/**
 * Build body colors payload for API requests
 */
export function buildBodyColorsPayload(
  bodyColors: any
): Record<string, number | string> | undefined {
  const ids = extractBodyColorIds(bodyColors)
  const color3s = extractBodyColor3s(bodyColors)

  if (!ids && !color3s) {
    return undefined
  }

  return {
    ...(ids || {}),
    ...(color3s || {})
  }
}

export { BODY_COLOR_BASE_KEYS }
