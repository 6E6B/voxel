import { BrowserWindow, app, session } from 'electron'
import { join } from 'path'
import { RobloxInstallService } from '@main/modules/install/InstallService'
import { storageService } from '@main/modules/system/StorageService'
import { installContracts, systemContracts } from '../contracts/installSystem'
import { router, contractMutation, procedure } from '../core'
import type { AppContext } from '../core'

const TITLEBAR_OVERLAY_HEIGHT = 45

function getWindow(ctx: AppContext): BrowserWindow | null {
    return BrowserWindow.fromWebContents(ctx.event.sender)
}

export const installSystemRouter = router({
    installRobloxVersion: contractMutation(installContracts.installRobloxVersion, async (ctx, binaryType, version, installPath) => {
        const targetPath = installPath || join(app.getPath('userData'), 'Versions', `${binaryType}-${version}`)

        const success = await RobloxInstallService.downloadAndInstall(
            binaryType,
            version,
            targetPath,
            (status, progress, detail) => {
                ctx.event.sender.send('install-progress', { status, progress, detail })
            }
        )

        return success ? targetPath : null
    }),
    launchRobloxInstall: contractMutation(installContracts.launchRobloxInstall, async (_ctx, installPath) => {
        return RobloxInstallService.launch(installPath)
    }),
    uninstallRobloxVersion: contractMutation(installContracts.uninstallRobloxVersion, async (_ctx, installPath) => {
        return RobloxInstallService.uninstall(installPath)
    }),
    openRobloxFolder: contractMutation(installContracts.openRobloxFolder, async (_ctx, installPath) => {
        return RobloxInstallService.openFolder(installPath)
    }),
    checkRobloxUpdates: procedure
        .input(installContracts.checkRobloxUpdates.args)
        .mutation(async ({ input }) => {
            const [binaryType, currentVersionHash] = input
            return RobloxInstallService.checkForUpdates(binaryType, currentVersionHash)
        }),
    verifyRobloxFiles: contractMutation(installContracts.verifyRobloxFiles, async (ctx, binaryType, version, installPath) => {
        return RobloxInstallService.downloadAndInstall(binaryType, version, installPath, (status, progress, detail) => {
            ctx.event.sender.send('install-progress', { status, progress, detail })
        })
    }),
    getFFlags: contractMutation(installContracts.getFFlags, async (_ctx, installPath) => {
        return RobloxInstallService.getFFlags(installPath)
    }),
    setFFlags: contractMutation(installContracts.setFFlags, async (_ctx, installPath, flags) => {
        return RobloxInstallService.setFFlags(installPath, flags)
    }),
    installFont: contractMutation(installContracts.installFont, async (_ctx, installPath, fontPath) => {
        return RobloxInstallService.installFont(installPath, fontPath)
    }),
    installCursor: contractMutation(installContracts.installCursor, async (_ctx, installPath, cursorPath) => {
        return RobloxInstallService.installCursor(installPath, cursorPath)
    }),
    setActiveInstall: contractMutation(installContracts.setActiveInstall, async (_ctx, installPath) => {
        return RobloxInstallService.setActive(installPath)
    }),
    removeActiveInstall: contractMutation(installContracts.removeActiveInstall, async () => {
        return RobloxInstallService.removeActive()
    }),
    getActiveInstallPath: contractMutation(installContracts.getActiveInstallPath, async () => {
        return RobloxInstallService.getActiveInstallPath()
    }),
    detectDefaultInstallations: contractMutation(installContracts.detectDefaultInstallations, async () => {
        return RobloxInstallService.detectDefaultInstallations()
    }),
    getDeployHistory: contractMutation(installContracts.getDeployHistory, async () => {
        return RobloxInstallService.getDeployHistory()
    }),
    focusWindow: contractMutation(systemContracts.focusWindow, async () => {
        const window = BrowserWindow.getFocusedWindow()
        if (window) {
            window.setAlwaysOnTop(true)
            window.focus()
            window.setAlwaysOnTop(false)
        }
    }),
    setTitlebarOverlay: contractMutation(systemContracts.setTitlebarOverlay, async (ctx, appearance) => {
        const window = getWindow(ctx)
        if (!window || process.platform === 'darwin' || process.platform === 'win32') return

        window.setTitleBarOverlay({
            color: appearance.color,
            symbolColor: appearance.symbolColor,
            height: TITLEBAR_OVERLAY_HEIGHT
        })
    }),
    minimizeWindow: contractMutation(systemContracts.minimizeWindow, async (ctx) => {
        const window = getWindow(ctx)
        if (window) {
            window.minimize()
        }
    }),
    toggleMaximizeWindow: contractMutation(systemContracts.toggleMaximizeWindow, async (ctx) => {
        const window = getWindow(ctx)
        if (!window) return false

        if (window.isMaximized()) {
            window.unmaximize()
            return false
        }

        window.maximize()
        return true
    }),
    closeWindow: contractMutation(systemContracts.closeWindow, async (ctx) => {
        const window = getWindow(ctx)
        if (window) {
            window.close()
        }
    }),
    getSidebarWidth: contractMutation(systemContracts.getSidebarWidth, async () => {
        return storageService.getSidebarWidth()
    }),
    setSidebarWidth: contractMutation(systemContracts.setSidebarWidth, async (_ctx, width) => {
        storageService.setSidebarWidth(width)
    }),
    getSidebarCollapsed: contractMutation(systemContracts.getSidebarCollapsed, async () => {
        return storageService.getSidebarCollapsed()
    }),
    setSidebarCollapsed: contractMutation(systemContracts.setSidebarCollapsed, async (_ctx, collapsed) => {
        storageService.setSidebarCollapsed(collapsed)
    }),
    getAccountsViewMode: contractMutation(systemContracts.getAccountsViewMode, async () => {
        return storageService.getAccountsViewMode()
    }),
    setAccountsViewMode: contractMutation(systemContracts.setAccountsViewMode, async (_ctx, mode) => {
        storageService.setAccountsViewMode(mode)
    }),
    getFavoriteGames: contractMutation(systemContracts.getFavoriteGames, async () => {
        return storageService.getFavoriteGames()
    }),
    addFavoriteGame: contractMutation(systemContracts.addFavoriteGame, async (_ctx, placeId) => {
        storageService.addFavoriteGame(placeId)
    }),
    removeFavoriteGame: contractMutation(systemContracts.removeFavoriteGame, async (_ctx, placeId) => {
        storageService.removeFavoriteGame(placeId)
    }),
    getFavoriteItems: contractMutation(systemContracts.getFavoriteItems, async () => {
        return storageService.getFavoriteItems()
    }),
    addFavoriteItem: contractMutation(systemContracts.addFavoriteItem, async (_ctx, item) => {
        storageService.addFavoriteItem(item)
    }),
    removeFavoriteItem: contractMutation(systemContracts.removeFavoriteItem, async (_ctx, itemId) => {
        storageService.removeFavoriteItem(itemId)
    }),
    getSettings: contractMutation(systemContracts.getSettings, async () => {
        return storageService.getSettings()
    }),
    setSettings: contractMutation(systemContracts.setSettings, async (_ctx, settings) => {
        storageService.setSettings(settings)
    }),
    getExcludeFullGames: contractMutation(systemContracts.getExcludeFullGames, async () => {
        return storageService.getExcludeFullGames()
    }),
    setExcludeFullGames: contractMutation(systemContracts.setExcludeFullGames, async (_ctx, excludeFullGames) => {
        storageService.setExcludeFullGames(excludeFullGames)
    }),
    getAvatarRenderWidth: contractMutation(systemContracts.getAvatarRenderWidth, async () => {
        return storageService.getAvatarRenderWidth()
    }),
    setAvatarRenderWidth: contractMutation(systemContracts.setAvatarRenderWidth, async (_ctx, width) => {
        storageService.setAvatarRenderWidth(width)
    }),
    getWindowWidth: contractMutation(systemContracts.getWindowWidth, async () => {
        return storageService.getWindowWidth()
    }),
    setWindowWidth: contractMutation(systemContracts.setWindowWidth, async (_ctx, width) => {
        storageService.setWindowWidth(width)
    }),
    getWindowHeight: contractMutation(systemContracts.getWindowHeight, async () => {
        return storageService.getWindowHeight()
    }),
    setWindowHeight: contractMutation(systemContracts.setWindowHeight, async (_ctx, height) => {
        storageService.setWindowHeight(height)
    }),
    getCustomFonts: contractMutation(systemContracts.getCustomFonts, async () => {
        return storageService.getCustomFonts()
    }),
    addCustomFont: contractMutation(systemContracts.addCustomFont, async (_ctx, font) => {
        storageService.addCustomFont(font)
    }),
    removeCustomFont: contractMutation(systemContracts.removeCustomFont, async (_ctx, family) => {
        storageService.removeCustomFont(family)
    }),
    getActiveFont: contractMutation(systemContracts.getActiveFont, async () => {
        return storageService.getActiveFont()
    }),
    setActiveFont: contractMutation(systemContracts.setActiveFont, async (_ctx, family) => {
        storageService.setActiveFont(family)
    }),
    setSessionCookie: contractMutation(systemContracts.setSessionCookie, async (_ctx, cookie) => {
        const ses = session.defaultSession
        await ses.cookies.set({
            url: 'https://www.roblox.com',
            name: '.ROBLOSECURITY',
            value: cookie,
            domain: '.roblox.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'no_restriction'
        })
    }),
    getRoavatarAssetsPath: contractMutation(systemContracts.getRoavatarAssetsPath, async () => {
        const basePath = app.isPackaged
            ? join(process.resourcesPath, 'roavatar-assets')
            : join(app.getAppPath(), 'resources', 'roavatar-assets')
        return basePath.replace(/\\/g, '/')
    }),
    verifyPin: contractMutation(systemContracts.verifyPin, async (_ctx, pin) => {
        return storageService.verifyPin(pin)
    }),
    isPinVerified: contractMutation(systemContracts.isPinVerified, async () => {
        return storageService.isPinCurrentlyVerified()
    }),
    setPin: procedure
        .input(systemContracts.setPin.args)
        .mutation(async ({ input }) => {
            const [newPin, currentPin] = input
            return storageService.setPin(newPin, currentPin)
        }),
    getPinLockoutStatus: contractMutation(systemContracts.getPinLockoutStatus, async () => {
        return storageService.getPinLockoutStatus()
    })
})