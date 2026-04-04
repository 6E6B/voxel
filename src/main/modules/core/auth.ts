import { RobloxAuthService } from '../auth/RobloxAuthService'

/**
 * Extract a clean .ROBLOSECURITY cookie value from a raw cookie string.
 */
export const extractCookie = (raw: string): string => RobloxAuthService.extractCookie(raw)
