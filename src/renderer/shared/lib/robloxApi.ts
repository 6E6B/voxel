import type { RobloxFetchOptions } from '@shared/contracts/robloxFetch'
import { z } from 'zod'

/**
 * Unified Roblox API client for the renderer.
 *
 * Replaces the old pattern of: contract → handler → service → request
 * with a single call that goes through a generic IPC fetch channel.
 *
 * Features:
 * - Zod validation on the response
 * - Automatic cookie auth (pass cookie, it handles the rest)
 * - CSRF token auto-retry (set csrf: true)
 * - HBA header generation (automatic when cookie is provided)
 *
 * @example
 * // Simple GET with auth
 * const user = await robloxGet(userSummarySchema,
 *   'https://users.roblox.com/v1/users/authenticated',
 *   { cookie: account.cookie }
 * )
 *
 * // POST with CSRF
 * const result = await robloxPost(presenceSchema,
 *   'https://presence.roblox.com/v1/presence/users',
 *   { userIds: [userId] },
 *   { cookie, csrf: true }
 * )
 *
 * // In a react-query hook (no contract/handler/service needed!)
 * export function useVoiceSettings(cookie?: string) {
 *   return useQuery({
 *     queryKey: ['voice', 'settings', cookie],
 *     queryFn: () => robloxGet(voiceSettingsSchema,
 *       'https://voice.roblox.com/v1/settings',
 *       { cookie }
 *     ),
 *     enabled: !!cookie,
 *   })
 * }
 */
export async function roblox<T>(
    schema: z.ZodType<T>,
    options: RobloxFetchOptions
): Promise<T> {
    const raw = await window.api.robloxFetch(options)
    return schema.parse(raw)
}

export async function robloxGet<T>(
    schema: z.ZodType<T>,
    url: string,
    options?: { cookie?: string; headers?: Record<string, string> }
): Promise<T> {
    return roblox(schema, { url, method: 'GET', ...options })
}

export async function robloxPost<T>(
    schema: z.ZodType<T>,
    url: string,
    body?: unknown,
    options?: { cookie?: string; csrf?: boolean; headers?: Record<string, string> }
): Promise<T> {
    return roblox(schema, { url, method: 'POST', body, ...options })
}

export async function robloxDelete<T>(
    schema: z.ZodType<T>,
    url: string,
    options?: { cookie?: string; csrf?: boolean; headers?: Record<string, string> }
): Promise<T> {
    return roblox(schema, { url, method: 'DELETE', ...options })
}
