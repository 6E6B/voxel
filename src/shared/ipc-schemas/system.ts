import { z } from 'zod'
import { BinaryType } from '../../renderer/src/types'
import { LOCKED_SIDEBAR_TABS, SIDEBAR_TAB_IDS } from '../navigation'

// ============================================================================
// UPDATE & INSTALL SCHEMAS
// ============================================================================

export const updateCheckSchema = z.object({
  hasUpdate: z.boolean(),
  latestVersion: z.string()
})

export type UpdateCheck = z.infer<typeof updateCheckSchema>

export const fflagsSchema = z.record(z.string(), z.unknown())
export type FFlags = z.infer<typeof fflagsSchema>

export const robloxInstallationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    binaryType: z.nativeEnum(BinaryType),
    version: z.string(),
    channel: z.string(),
    path: z.string(),
    lastUpdated: z.string(),
    status: z.enum(['Ready', 'Updating', 'Error'])
  })
  .transform((data) => ({
    ...data,
    binaryType: data.binaryType as BinaryType
  }))

export const robloxInstallationsSchema = z.array(robloxInstallationSchema)

import type { RobloxInstallation as RobloxInstallationType } from '../../renderer/src/types'
export type RobloxInstallation = RobloxInstallationType

// ============================================================================
// DETECTED INSTALLATIONS SCHEMA
// ============================================================================

export const detectedInstallationSchema = z.object({
  path: z.string(),
  version: z.string(),
  binaryType: z.enum(['WindowsPlayer', 'WindowsStudio', 'MacPlayer', 'MacStudio']),
  exePath: z.string()
})

export const detectedInstallationsSchema = z.array(detectedInstallationSchema)

export type DetectedInstallation = z.infer<typeof detectedInstallationSchema>

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

const nullableIdentifierSchema = z.union([z.string().min(1), z.null()])
const optionalPathSchema = z.union([z.string().min(1), z.null()]).optional()
const accentColorSchema = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
const sidebarTabIdEnum = z.enum(SIDEBAR_TAB_IDS)
const themePreferenceSchema = z.enum(['system', 'dark', 'light'])
const tintPreferenceSchema = z.enum(['neutral', 'cool'])
const sidebarHiddenTabsSchema = z
  .array(sidebarTabIdEnum)
  .refine((tabs) => tabs.every((tab) => !LOCKED_SIDEBAR_TABS.includes(tab)), {
    message: 'Locked tabs cannot be hidden'
  })
const pinCodeSchema = z.union([
  z.literal('SET'),
  z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
  z.null()
])

export const settingsSchema = z.object({
  primaryAccountId: nullableIdentifierSchema,
  allowMultipleInstances: z.boolean(),
  defaultInstallationPath: optionalPathSchema,
  accentColor: accentColorSchema,
  useDynamicAccentColor: z.boolean(),
  theme: themePreferenceSchema,
  tint: tintPreferenceSchema,
  showSidebarProfileCard: z.boolean(),
  privacyMode: z.boolean(),
  sidebarTabOrder: z.array(sidebarTabIdEnum),
  sidebarHiddenTabs: sidebarHiddenTabsSchema,
  pinCode: pinCodeSchema
})

export const settingsPatchSchema = z.object({
  primaryAccountId: nullableIdentifierSchema.optional(),
  allowMultipleInstances: z.boolean().optional(),
  defaultInstallationPath: optionalPathSchema,
  accentColor: accentColorSchema.optional(),
  useDynamicAccentColor: z.boolean().optional(),
  theme: themePreferenceSchema.optional(),
  tint: tintPreferenceSchema.optional(),
  showSidebarProfileCard: z.boolean().optional(),
  privacyMode: z.boolean().optional(),
  sidebarTabOrder: z.array(sidebarTabIdEnum).optional(),
  sidebarHiddenTabs: sidebarHiddenTabsSchema.optional(),
  pinCode: pinCodeSchema.optional()
})

export type SettingsSnapshot = z.infer<typeof settingsSchema>
export type SettingsPatch = z.infer<typeof settingsPatchSchema>

// ============================================================================
// LOGS SCHEMAS
// ============================================================================

export const logMetadataSchema = z.object({
  filename: z.string(),
  path: z.string(),
  lastModified: z.number(),
  size: z.number(),
  timestamp: z.string().optional(),
  channel: z.string().optional(),
  version: z.string().optional(),
  jobId: z.string().optional(),
  universeId: z.string().optional(),
  placeId: z.string().optional(),
  serverIp: z.string().optional()
})

export type LogMetadata = z.infer<typeof logMetadataSchema>

// ============================================================================
// NET-LOG SCHEMAS
// ============================================================================

export const netLogStatusSchema = z.object({
  isLogging: z.boolean(),
  logPath: z.string().nullable()
})

export const netLogStopResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
})

export const netLogStartResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  path: z.string().optional()
})

export type NetLogStatus = z.infer<typeof netLogStatusSchema>
export type NetLogStopResponse = z.infer<typeof netLogStopResponseSchema>
export type NetLogStartResponse = z.infer<typeof netLogStartResponseSchema>

// ============================================================================
// PIN SCHEMAS
// ============================================================================

export const pinVerifyResultSchema = z.object({
  success: z.boolean(),
  locked: z.boolean(),
  remainingAttempts: z.number(),
  lockoutSeconds: z.number().optional()
})

export const pinSetResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  locked: z.boolean().optional(),
  lockoutSeconds: z.number().optional(),
  remainingAttempts: z.number().optional()
})

export const pinLockoutStatusSchema = z.object({
  locked: z.boolean(),
  lockoutSeconds: z.number().optional(),
  remainingAttempts: z.number()
})

export type PinVerifyResult = z.infer<typeof pinVerifyResultSchema>
export type PinSetResult = z.infer<typeof pinSetResultSchema>
export type PinLockoutStatus = z.infer<typeof pinLockoutStatusSchema>

// ============================================================================
// CATALOG DATABASE SCHEMAS
// ============================================================================

export const catalogDbStatusSchema = z.object({
  exists: z.boolean(),
  downloading: z.boolean(),
  error: z.string().nullable(),
  path: z.string()
})

export const catalogDbDownloadResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
})

export type CatalogDbStatus = z.infer<typeof catalogDbStatusSchema>
export type CatalogDbDownloadResult = z.infer<typeof catalogDbDownloadResultSchema>
