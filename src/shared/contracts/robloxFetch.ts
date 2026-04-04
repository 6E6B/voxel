import { z } from 'zod'

export const robloxFetchOptionsSchema = z.object({
    url: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET'),
    cookie: z.string().optional(),
    body: z.unknown().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    csrf: z.boolean().optional()
})

export type RobloxFetchOptions = z.input<typeof robloxFetchOptionsSchema>