import { z } from 'zod'

export type SuccessResponse = z.infer<typeof successResponseSchema>
export type CaptchaResponse = z.infer<typeof captchaChallengeSchema>

export const cursorResultSchema = z.object({
    data: z.array(z.unknown()),
    nextCursor: z.string().nullable(),
    previousCursor: z.string().nullable().optional()
})

export const successResponseSchema = z.object({
    success: z.boolean()
})

export const captchaChallengeSchema = successResponseSchema.extend({
    isCaptchaRequired: z.boolean()
})

export type CursorResult<T = unknown> = {
    data: T[]
    nextCursor: string | null
    previousCursor?: string | null
}