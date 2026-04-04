import { z } from 'zod'
import { favoriteItemSchema } from '@shared/contracts/avatar'
import { settingsPatchSchema } from '@shared/contracts/system'
import { defineProcedure } from '../core'

export const titlebarOverlaySchema = z.object({
    color: z.string(),
    symbolColor: z.string()
})

export const customFontSchema = z.object({
    family: z.string(),
    url: z.string()
})

export const installContracts = {
    installRobloxVersion: defineProcedure(z.tuple([z.string(), z.string(), z.string().optional()])),
    launchRobloxInstall: defineProcedure(z.tuple([z.string()])),
    uninstallRobloxVersion: defineProcedure(z.tuple([z.string()])),
    openRobloxFolder: defineProcedure(z.tuple([z.string()])),
    checkRobloxUpdates: defineProcedure(z.tuple([z.string(), z.string()])),
    verifyRobloxFiles: defineProcedure(z.tuple([z.string(), z.string(), z.string()])),
    getFFlags: defineProcedure(z.tuple([z.string()])),
    setFFlags: defineProcedure(z.tuple([z.string(), z.record(z.string(), z.unknown())])),
    installFont: defineProcedure(z.tuple([z.string(), z.string()])),
    installCursor: defineProcedure(z.tuple([z.string(), z.string()])),
    setActiveInstall: defineProcedure(z.tuple([z.string()])),
    removeActiveInstall: defineProcedure(z.tuple([])),
    getActiveInstallPath: defineProcedure(z.tuple([])),
    detectDefaultInstallations: defineProcedure(z.tuple([])),
    getDeployHistory: defineProcedure(z.tuple([]))
} as const

export const systemContracts = {
    focusWindow: defineProcedure(z.tuple([])),
    setTitlebarOverlay: defineProcedure(z.tuple([titlebarOverlaySchema])),
    minimizeWindow: defineProcedure(z.tuple([])),
    toggleMaximizeWindow: defineProcedure(z.tuple([])),
    closeWindow: defineProcedure(z.tuple([])),
    getSidebarWidth: defineProcedure(z.tuple([])),
    setSidebarWidth: defineProcedure(z.tuple([z.number()])),
    getSidebarCollapsed: defineProcedure(z.tuple([])),
    setSidebarCollapsed: defineProcedure(z.tuple([z.boolean()])),
    getAvatarRenderWidth: defineProcedure(z.tuple([])),
    setAvatarRenderWidth: defineProcedure(z.tuple([z.number()])),
    getWindowWidth: defineProcedure(z.tuple([])),
    setWindowWidth: defineProcedure(z.tuple([z.number()])),
    getWindowHeight: defineProcedure(z.tuple([])),
    setWindowHeight: defineProcedure(z.tuple([z.number()])),
    getAccountsViewMode: defineProcedure(z.tuple([])),
    setAccountsViewMode: defineProcedure(z.tuple([z.enum(['list', 'grid'])])),
    getFavoriteGames: defineProcedure(z.tuple([])),
    addFavoriteGame: defineProcedure(z.tuple([z.string()])),
    removeFavoriteGame: defineProcedure(z.tuple([z.string()])),
    getFavoriteItems: defineProcedure(z.tuple([])),
    addFavoriteItem: defineProcedure(z.tuple([favoriteItemSchema])),
    removeFavoriteItem: defineProcedure(z.tuple([z.number()])),
    getSettings: defineProcedure(z.tuple([])),
    setSettings: defineProcedure(z.tuple([settingsPatchSchema])),
    getExcludeFullGames: defineProcedure(z.tuple([])),
    setExcludeFullGames: defineProcedure(z.tuple([z.boolean()])),
    getCustomFonts: defineProcedure(z.tuple([])),
    addCustomFont: defineProcedure(z.tuple([customFontSchema])),
    removeCustomFont: defineProcedure(z.tuple([z.string()])),
    getActiveFont: defineProcedure(z.tuple([])),
    setActiveFont: defineProcedure(z.tuple([z.string().nullable()])),
    setSessionCookie: defineProcedure(z.tuple([z.string()])),
    getRoavatarAssetsPath: defineProcedure(z.tuple([])),
    verifyPin: defineProcedure(z.tuple([z.string().length(6).regex(/^\d{6}$/)])),
    isPinVerified: defineProcedure(z.tuple([])),
    setPin: defineProcedure(z.tuple([z.string().nullable(), z.string().optional()])),
    getPinLockoutStatus: defineProcedure(z.tuple([]))
} as const