/**
 * Font Utilities
 * Handles loading and applying Google Fonts dynamically
 */

export interface CustomFont {
  family: string
  url: string
}

const GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2'

/**
 * Generate a Google Fonts URL for a given font family
 */
export function getGoogleFontUrl(family: string): string {
  const encodedFamily = encodeURIComponent(family)
  return `${GOOGLE_FONTS_API}?family=${encodedFamily}:wght@100;200;300;400;500;600;700;800;900&display=swap`
}

/**
 * Load a font by injecting a link element into the document head
 */
export function loadFont(font: CustomFont): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingLink = document.querySelector(`link[data-font-family="${font.family}"]`)
    if (existingLink) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = font.url
    link.setAttribute('data-font-family', font.family)

    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load font: ${font.family}`))

    document.head.appendChild(link)
  })
}

/**
 * Unload a font by removing its link element
 */
export function unloadFont(family: string): void {
  const link = document.querySelector(`link[data-font-family="${family}"]`)
  if (link) {
    link.remove()
  }
}

/**
 * Apply a font family to the document
 */
export function applyFont(family: string | null): void {
  const root = document.documentElement
  if (family) {
    root.style.setProperty(
      '--font-sans',
      `'${family}', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
    )
  } else {
    // Reset to default Geist font
    root.style.setProperty(
      '--font-sans',
      "'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    )
  }
}

/**
 * Load all custom fonts and apply the active one
 */
export async function initializeFonts(
  customFonts: CustomFont[],
  activeFont: string | null
): Promise<void> {
  // Load all custom fonts
  await Promise.all(customFonts.map((font) => loadFont(font).catch(console.error)))

  // Apply the active font
  applyFont(activeFont)
}

/**
 * Validate a Google Fonts URL or family name
 */
export function isValidGoogleFontFamily(family: string): boolean {
  // Basic validation - family name should be non-empty and reasonable
  return family.length > 0 && family.length <= 100 && /^[a-zA-Z0-9\s]+$/.test(family)
}
