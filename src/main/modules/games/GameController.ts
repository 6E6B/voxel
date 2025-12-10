import { z } from 'zod'
import { BrowserWindow, dialog } from 'electron'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxGameService } from './GameService'
import { RobloxLauncherService } from '../install/LauncherService'
import { storageService } from '../system/StorageService'
import { downloadFileToPath } from '../core/utils/downloadUtils'
import { gameSessionService } from './GameSessionService'

/**
 * Registers game-related IPC handlers
 */
export const registerGameHandlers = (): void => {
  handle('get-game-thumbnail-16x9', z.tuple([z.number()]), async (_, universeId) => {
    return RobloxGameService.getGameThumbnail16x9(universeId)
  })

  handle('get-game-icon-thumbnail', z.tuple([z.number()]), async (_, universeId) => {
    return RobloxGameService.getGameIconThumbnail(universeId)
  })

  handle('get-game-sorts', z.tuple([z.string().optional()]), async (_, sessionId) => {
    return RobloxGameService.getGameSorts(sessionId)
  })

  handle('get-games-in-sort', z.tuple([z.string(), z.string()]), async (_, sortId, sessionId) => {
    return RobloxGameService.getGamesInSort(sortId, sessionId)
  })

  handle('get-games-by-place-ids', z.tuple([z.array(z.string())]), async (_, placeIds) => {
    // Try to find a valid cookie from stored accounts
    const accounts = storageService.getAccounts()
    const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
    const cookie = accountWithCookie ? accountWithCookie.cookie : undefined

    return RobloxGameService.getGamesByPlaceIds(placeIds, cookie)
  })

  handle('get-games-by-universe-ids', z.tuple([z.array(z.number())]), async (_, universeIds) => {
    return RobloxGameService.getGamesByUniverseIds(universeIds)
  })

  handle('search-games', z.tuple([z.string(), z.string()]), async (_, query, sessionId) => {
    return RobloxGameService.searchGames(query, sessionId)
  })

  handle('get-recently-played-games', z.tuple([z.string().optional()]), async () => {
    const LOGS_DIR = path.join(process.env.LOCALAPPDATA || '', 'Roblox', 'logs')

    const parseLogContent = (content: string) => {
      const placeIdMatchA = content.match(/placeid:(\d+)/)
      const placeIdMatchB = content.match(/place (\d+) at/)
      const universeIdMatch = content.match(/universeid:(\d+)/)

      return {
        placeId: placeIdMatchA?.[1] || placeIdMatchB?.[1],
        universeId: universeIdMatch?.[1]
      }
    }

    const getRecentPlacesFromLogs = async (
      maxEntries: number = 40
    ): Promise<{ placeIds: string[]; universeIds: string[] }> => {
      const emptyResult: { placeIds: string[]; universeIds: string[] } = {
        placeIds: [],
        universeIds: []
      }

      if (!process.env.LOCALAPPDATA) {
        console.warn('[GameController] LOCALAPPDATA not set, cannot read logs')
        return emptyResult
      }

      if (!existsSync(LOGS_DIR)) {
        console.warn('[GameController] Roblox logs directory not found:', LOGS_DIR)
        return emptyResult
      }

      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files.filter((f) => f.endsWith('.log'))

      const entries = await Promise.all(
        logFiles.map(async (file) => {
          const filePath = path.join(LOGS_DIR, file)
          try {
            const stats = await fs.stat(filePath)
            const content = await fs.readFile(filePath, 'utf8')
            const parsed = parseLogContent(content)

            return {
              lastModified: stats.mtimeMs,
              placeId: parsed.placeId,
              universeId: parsed.universeId
            }
          } catch (err) {
            console.error(`[GameController] Failed to read log ${file}:`, err)
            return { lastModified: 0, placeId: undefined, universeId: undefined }
          }
        })
      )

      // Newest first
      entries.sort((a, b) => b.lastModified - a.lastModified)

      const seenPlaces = new Set<string>()
      const seenUniverses = new Set<string>()
      const placeIds: string[] = []
      const universeIds: string[] = []

      for (const entry of entries) {
        if (placeIds.length >= maxEntries) break
        if (entry.placeId && !seenPlaces.has(entry.placeId)) {
          seenPlaces.add(entry.placeId)
          placeIds.push(entry.placeId)
        } else if (entry.universeId && !seenUniverses.has(entry.universeId)) {
          seenUniverses.add(entry.universeId)
          universeIds.push(entry.universeId)
        }
      }

      return { placeIds, universeIds }
    }

    const { placeIds, universeIds } = await getRecentPlacesFromLogs()

    if (universeIds.length > 0) {
      try {
        return await RobloxGameService.getGamesByUniverseIds(universeIds.map((id) => Number(id)))
      } catch (err) {
        console.error('[GameController] Failed to hydrate recent universeIds:', err)
      }
    }

    if (placeIds.length > 0) {
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined

      if (!cookie) {
        console.warn('[GameController] Skipping placeId hydration for recent games: no cookie')
        return []
      }

      try {
        return await RobloxGameService.getGamesByPlaceIds(placeIds, cookie)
      } catch (err) {
        console.error('[GameController] Failed to hydrate recent placeIds:', err)
        return []
      }
    }

    return []
  })

  handle(
    'launch-game',
    z.tuple([
      z.string(), // cookie
      z.union([z.string(), z.number()]), // placeId
      z.string().optional(), // jobId
      z.union([z.string(), z.number()]).optional(), // friendId
      z.string().optional() // installPath
    ]),
    async (_, cookieRaw, placeId, jobId, friendId, installPath) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      const result = await RobloxLauncherService.launchGame(
        cookie,
        placeId,
        jobId,
        friendId,
        installPath
      )

      if (result.success) {
        gameSessionService.startSession(placeId)
      }

      return result
    }
  )

  handle(
    'get-game-servers',
    z.tuple([
      z.union([z.string(), z.number()]), // placeId
      z.string().optional(), // cursor
      z.number().optional(), // limit
      z.enum(['Asc', 'Desc']).optional(), // sortOrder
      z.boolean().optional() // excludeFullGames
    ]),
    async (_, placeId, cursor, limit, sortOrder, excludeFullGames) => {
      // Try to find a valid cookie from stored accounts
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined

      return RobloxGameService.getGameServers(
        placeId,
        cursor,
        limit,
        sortOrder,
        excludeFullGames,
        cookie
      )
    }
  )

  handle(
    'get-server-region',
    z.tuple([z.union([z.string(), z.number()]), z.string()]),
    async (_, placeId, serverId) => {
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined

      if (!cookie) {
        console.warn('[GameController] No cookie found for region check')
        throw new Error('No logged in account found to check region')
      }

      return RobloxGameService.getServerRegion(placeId, serverId, cookie)
    }
  )

  handle(
    'get-join-script',
    z.tuple([z.union([z.string(), z.number()]), z.string()]),
    async (_, placeId, serverId) => {
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined
      if (!cookie) throw new Error('No logged in account found')
      return RobloxGameService.getJoinScript(placeId, serverId, cookie)
    }
  )

  handle(
    'get-server-queue-position',
    z.tuple([z.union([z.string(), z.number()]), z.string()]),
    async (_, placeId, serverId) => {
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined
      if (!cookie) throw new Error('No logged in account found')
      return RobloxGameService.getServerQueuePosition(placeId, serverId, cookie)
    }
  )

  handle('get-region-from-address', z.tuple([z.string()]), async (_, address) => {
    return RobloxGameService.getRegionFromAddress(address)
  })

  handle('get-regions-batch', z.tuple([z.array(z.string())]), async (_, addresses) => {
    return RobloxGameService.getRegionsBatch(addresses)
  })
  handle('get-game-social-links', z.tuple([z.number()]), async (_, universeId) => {
    const accounts = storageService.getAccounts()
    const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
    const cookie = accountWithCookie ? accountWithCookie.cookie : undefined
    return RobloxGameService.getGameSocialLinks(universeId, cookie)
  })

  handle(
    'vote-on-game',
    z.tuple([z.number(), z.boolean().nullable()]),
    async (_, placeId, vote) => {
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined
      if (!cookie) throw new Error('No logged in account found')
      return RobloxGameService.voteOnGame(placeId, vote, cookie)
    }
  )

  handle('get-game-passes', z.tuple([z.number()]), async (_, universeId) => {
    const accounts = storageService.getAccounts()
    const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
    const cookie = accountWithCookie ? accountWithCookie.cookie : undefined
    return RobloxGameService.getGamePasses(universeId, cookie)
  })

  handle(
    'purchase-game-pass',
    z.tuple([
      z.string(), // cookie
      z.number(), // productId
      z.number(), // expectedPrice
      z.number(), // expectedSellerId
      z.string().optional(), // expectedPurchaserId
      z.string().optional() // idempotencyKey
    ]),
    async (
      _,
      cookieRaw,
      productId,
      expectedPrice,
      expectedSellerId,
      purchaserId,
      idempotencyKey
    ) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      if (!cookie) throw new Error('No logged in account found')

      return RobloxGameService.purchaseGamePass(
        cookie,
        productId,
        expectedPrice,
        expectedSellerId,
        purchaserId,
        idempotencyKey
      )
    }
  )

  handle(
    'save-game-image',
    z.tuple([z.string(), z.string()]),
    async (event, imageUrl, gameName) => {
      // Get the parent window for the dialog
      const win = BrowserWindow.fromWebContents(event.sender)

      // Determine file extension from URL or default to png
      const urlLower = imageUrl.toLowerCase()
      let extension = 'png'
      if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
        extension = 'jpg'
      } else if (urlLower.includes('.webp')) {
        extension = 'webp'
      }

      const safeName = gameName.replace(/[^a-zA-Z0-9_-]/g, '_')

      const result = await dialog.showSaveDialog(win!, {
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
    }
  )
}
