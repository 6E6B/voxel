import { z } from 'zod'

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const quickLoginCodeSchema = z.object({
  code: z.string(),
  privateKey: z.string(),
  status: z.string(),
  expirationTime: z.string()
})

export const quickLoginStatusSchema = z.object({
  status: z.string()
})

export const loginResponseSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  displayName: z.string().optional()
})

export const csrfSchema = z.string().optional()

export type QuickLoginCode = z.infer<typeof quickLoginCodeSchema>
export type QuickLoginStatus = z.infer<typeof quickLoginStatusSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
