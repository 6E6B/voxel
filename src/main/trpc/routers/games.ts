import { BrowserWindow, dialog } from 'electron'
import { RobloxGameService } from '@main/modules/games/GameService'
import { RobloxLauncherService } from '@main/modules/install/LauncherService'
import { storageService } from '@main/modules/system/StorageService'
import { gameSessionService } from '@main/modules/games/GameSessionService'
import { downloadFileToPath } from '@main/modules/core/downloadUtils'
import { gamesContracts } from '../contracts/games'
import { router, contractMutation, authContractMutation } from '../core'
import type { AppContext } from '../core'

function getWindow(ctx: AppContext): BrowserWindow | null {
    return BrowserWindow.fromWebContents(ctx.event.sender)
}

function getStoredCookie(): string | undefined {
    const accounts = storageService.getAccounts()
    const account = accounts.find((item) => item.cookie && item.cookie.length > 0)
    return account?.cookie
}

export const gamesRouter = router({
    getGameThumbnail16x9: contractMutation(gamesContracts.getGameThumbnail16x9, async (_ctx, universeId) => {
        return RobloxGameService.getGameThumbnail16x9(universeId)
    }),
    getGameIconThumbnail: contractMutation(gamesContracts.getGameIconThumbnail, async (_ctx, universeId) => {
        return RobloxGameService.getGameIconThumbnail(universeId)
    }),
    getGameSorts: contractMutation(gamesContracts.getGameSorts, async (_ctx, sessionId) => {
        return RobloxGameService.getGameSorts(sessionId, getStoredCookie())
    }),
    getGamesInSort: contractMutation(gamesContracts.getGamesInSort, async (_ctx, sortId, sessionId) => {
        return RobloxGameService.getGamesInSort(sortId, sessionId, getStoredCookie())
    }),
    getGamesByPlaceIds: contractMutation(gamesContracts.getGamesByPlaceIds, async (_ctx, placeIds) => {
        return RobloxGameService.getGamesByPlaceIds(placeIds, getStoredCookie())
    }),
    getGamesByUniverseIds: contractMutation(gamesContracts.getGamesByUniverseIds, async (_ctx, universeIds) => {
        return RobloxGameService.getGamesByUniverseIds(universeIds)
    }),
    searchGames: contractMutation(gamesContracts.searchGames, async (_ctx, query, sessionId) => {
        return RobloxGameService.searchGames(query, sessionId)
    }),
    getRecentlyPlayedGames: contractMutation(gamesContracts.getRecentlyPlayedGames, async (_ctx, sessionId) => {
        return RobloxGameService.getRecentlyPlayedGames(getStoredCookie(), sessionId)
    }),
    launchGame: authContractMutation(gamesContracts.launchGame, async (_ctx, cookie, placeId, jobId, friendId, installPath, accessCode) => {
        const result = await RobloxLauncherService.launchGame(cookie, placeId, jobId, friendId, installPath, accessCode)

        if (result.success) {
            gameSessionService.startSession(placeId)
        }

        return result
    }),
    getGameServers: contractMutation(gamesContracts.getGameServers, async (_ctx, placeId, cursor, limit, sortOrder, excludeFullGames) => {
        return RobloxGameService.getGameServers(
            placeId,
            cursor,
            limit,
            sortOrder,
            excludeFullGames,
            getStoredCookie()
        )
    }),
    getPrivateServers: contractMutation(gamesContracts.getPrivateServers, async (_ctx, placeId, cursor, limit, sortOrder) => {
        return RobloxGameService.getPrivateServers(
            placeId,
            cursor,
            limit,
            sortOrder,
            getStoredCookie()
        )
    }),
    getJoinScript: contractMutation(gamesContracts.getJoinScript, async (_ctx, placeId, serverId) => {
        const cookie = getStoredCookie()
        if (!cookie) throw new Error('No logged in account found')
        return RobloxGameService.getJoinScript(placeId, serverId, cookie)
    }),
    getServerQueuePosition: contractMutation(gamesContracts.getServerQueuePosition, async (_ctx, placeId, serverId) => {
        const cookie = getStoredCookie()
        if (!cookie) throw new Error('No logged in account found')
        return RobloxGameService.getServerQueuePosition(placeId, serverId, cookie)
    }),
    getRegionFromAddress: contractMutation(gamesContracts.getRegionFromAddress, async (_ctx, address) => {
        return RobloxGameService.getRegionFromAddress(address)
    }),
    getGameSocialLinks: contractMutation(gamesContracts.getGameSocialLinks, async (_ctx, universeId) => {
        return RobloxGameService.getGameSocialLinks(universeId, getStoredCookie())
    }),
    voteOnGame: contractMutation(gamesContracts.voteOnGame, async (_ctx, placeId, vote) => {
        const cookie = getStoredCookie()
        if (!cookie) throw new Error('No logged in account found')
        return RobloxGameService.voteOnGame(placeId, vote, cookie)
    }),
    getGamePasses: contractMutation(gamesContracts.getGamePasses, async (_ctx, universeId) => {
        return RobloxGameService.getGamePasses(universeId, getStoredCookie())
    }),
    purchaseGamePass: authContractMutation(gamesContracts.purchaseGamePass, async (
        _ctx,
        cookie,
        productId,
        expectedPrice,
        expectedSellerId,
        purchaserId,
        idempotencyKey
    ) => {
        if (!cookie) throw new Error('No logged in account found')

        return RobloxGameService.purchaseGamePass(
            cookie,
            productId,
            expectedPrice,
            expectedSellerId,
            purchaserId,
            idempotencyKey
        )
    }),
    saveGameImage: contractMutation(gamesContracts.saveGameImage, async (ctx, imageUrl, gameName) => {
        const win = getWindow(ctx)

        const urlLower = imageUrl.toLowerCase()
        let extension = 'png'
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
            extension = 'jpg'
        } else if (urlLower.includes('.webp')) {
            extension = 'webp'
        }

        const safeName = gameName.replace(/[^a-zA-Z0-9_-]/g, '_')

        const result = win
            ? await dialog.showSaveDialog(win, {
                title: 'Save Image',
                defaultPath: `${safeName}.${extension}`,
                filters: [
                    { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            })
            : await dialog.showSaveDialog({
                title: 'Save Image',
                defaultPath: `${safeName}.${extension}`,
                filters: [
                    { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            })

        if (result.canceled || !result.filePath) return { success: false, canceled: true }

        await downloadFileToPath(imageUrl, result.filePath)
        return { success: true, path: result.filePath }
    })
})