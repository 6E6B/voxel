import { z } from 'zod'

export const updateInfoSchema = z.object({
  version: z.string(),
  releaseDate: z.string().optional(),
  releaseName: z.string().optional().nullable(),
  releaseNotes: z
    .union([z.string(), z.array(z.unknown())])
    .optional()
    .nullable()
})

export const progressInfoSchema = z.object({
  total: z.number(),
  delta: z.number(),
  transferred: z.number(),
  percent: z.number(),
  bytesPerSecond: z.number()
})

export const updateStatusSchema = z.enum([
  'idle',
  'checking',
  'available',
  'not-available',
  'downloading',
  'downloaded',
  'error'
])

export const updateStateSchema = z.object({
  status: updateStatusSchema,
  info: updateInfoSchema.nullable(),
  progress: progressInfoSchema.nullable(),
  error: z.string().nullable()
})

export const updateActionResultSchema = z.object({
  success: z.boolean()
})

export type UpdateInfo = z.infer<typeof updateInfoSchema>
export type ProgressInfo = z.infer<typeof progressInfoSchema>
export type UpdateStatus = z.infer<typeof updateStatusSchema>
export type UpdateState = z.infer<typeof updateStateSchema>
export type UpdateActionResult = z.infer<typeof updateActionResultSchema>