import { app, dialog, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { net } from 'electron'
import { z } from 'zod'
import { storageService } from '../system/StorageService'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from '../users/UserService'
import { RobloxFriendService } from '../friends/FriendService'
import { RobloxGameService } from '../games/GameService'
import { RobloxLauncherService } from '../install/LauncherService'
import { RobloxInventoryService } from '../avatar/InventoryService'
import { RobloxOutfitService } from '../avatar/OutfitService'
import { RobloxAssetService } from '../avatar/AssetService'
import { RobloxThumbnailService } from '../avatar/ThumbnailService'
import { RobloxAvatarRenderService } from '../avatar/AvatarRenderService'
import { RobloxAvatarMutationService } from '../avatar/AvatarMutationService'
import { RobloxInstallService } from '../install/InstallService'
import { RobloxLoginWindowService } from '../auth/RobloxLoginWindowService'
import { outfitDetailsSchema } from '@shared/ipc-schemas/avatar'
import { handle } from './utils/handle'

export const registerRobloxHandlers = (): void => {
  handle('get-deploy-history', z.tuple([]), async () => {
    return RobloxInstallService.getDeployHistory()
  })

  handle(
    'install-roblox-version',
    z.tuple([z.string(), z.string(), z.string().optional()]),
    async (event, binaryType, version, installPath) => {
      const webContents = event.sender

      const targetPath =
        installPath || path.join(app.getPath('userData'), 'Versions', `${binaryType}-${version}`)

      // Since we can't pass a callback through IPC directly, we'll emit events
      const success = await RobloxInstallService.downloadAndInstall(
        binaryType,
        version,
        targetPath,
        (status, progress, detail) => {
          webContents.send('install-progress', { status, progress, detail })
        }
      )
      return success ? targetPath : null
    }
  )

  handle('launch-roblox-install', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.launch(installPath)
  })

  handle('uninstall-roblox-version', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.uninstall(installPath)
  })

  handle('open-roblox-folder', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.openFolder(installPath)
  })

  handle(
    'check-for-updates',
    z.tuple([z.string(), z.string()]),
    async (_, binaryType, currentVersionHash) => {
      return RobloxInstallService.checkForUpdates(binaryType, currentVersionHash)
    }
  )

  handle(
    'verify-roblox-files',
    z.tuple([z.string(), z.string(), z.string()]),
    async (event, binaryType, version, installPath) => {
      const webContents = event.sender
      // Reinstall over existing path to verify/fix files
      const success = await RobloxInstallService.downloadAndInstall(
        binaryType,
        version,
        installPath,
        (status, progress, detail) => {
          webContents.send('install-progress', { status, progress, detail })
        }
      )
      return success
    }
  )

  handle('validate-cookie', z.tuple([z.string()]), async (_, cookieRaw) => {
    try {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      RobloxAuthService.validateCookieFormat(cookie)

      const userData = await RobloxUserService.getAuthenticatedUser(cookie)
      return userData
    } catch (error) {
      // Preserve original error messages where possible for compatibility
      throw error
    }
  })

  handle('get-avatar-url', z.tuple([z.string()]), async (_, userId) => {
    return RobloxUserService.getAvatarUrl(userId)
  })

  handle(
    'get-batch-user-avatars',
    z.tuple([z.array(z.number()), z.string().optional()]),
    async (_, userIds, size) => {
      const resultMap = await RobloxUserService.getBatchUserAvatarHeadshots(
        userIds,
        size || '420x420'
      )
      // Convert Map to object for IPC serialization
      const resultObj: Record<number, string | null> = {}
      for (const [userId, url] of resultMap.entries()) {
        resultObj[userId] = url
      }
      return resultObj
    }
  )

  handle('get-asset-content', z.tuple([z.string()]), async (_, url) => {
    return RobloxUserService.getAssetContent(url)
  })

  handle('fetch-account-stats', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // Step 1: Get User ID
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)

    // Step 2: Get Stats
    return RobloxUserService.getAccountStats(cookie, authData.id)
  })

  handle('get-account-status', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // Step 1: Get User ID
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)

    // Step 2: Get Presence
    return RobloxUserService.getPresence(cookie, authData.id)
  })

  handle('get-batch-account-statuses', z.tuple([z.array(z.string())]), async (_, cookieRaws) => {
    // Extract cookies for the service, but keep original cookies for the result keys
    const cookieMap = new Map<string, string>() // original -> extracted
    const extractedCookies: string[] = []

    for (const cookieRaw of cookieRaws) {
      const extracted = RobloxAuthService.extractCookie(cookieRaw)
      cookieMap.set(cookieRaw, extracted)
      extractedCookies.push(extracted)
    }

    const results = await RobloxUserService.getBatchAccountStatuses(extractedCookies)

    // Convert Map to object for IPC serialization, using original cookies as keys
    const resultObj: Record<string, { userId: number; presence: any } | null> = {}
    for (const [originalCookie] of cookieMap.entries()) {
      const extractedCookie = cookieMap.get(originalCookie)!
      const data = results.get(extractedCookie) || null
      resultObj[originalCookie] = data
    }
    return resultObj
  })

  handle(
    'get-friends-statuses',
    z.tuple([z.string(), z.array(z.number())]),
    async (_, cookieRaw, userIds) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxUserService.getBatchPresences(cookie, userIds)
    }
  )

  handle('get-user-presence', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPresence(cookie, userId)
  })

  handle(
    'get-friends',
    z.tuple([z.string(), z.number().optional(), z.boolean().optional()]),
    async (_, cookieRaw, targetUserId, forceRefresh) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      // If targetUserId is provided, use it. Otherwise, use the authenticated user's ID.
      const userId = targetUserId || (await RobloxUserService.getAuthenticatedUser(cookie)).id
      return RobloxFriendService.getFriends(cookie, userId, forceRefresh || false)
    }
  )

  handle(
    'get-friends-paged',
    z.tuple([z.string(), z.number(), z.string().optional()]),
    async (_, cookieRaw, targetUserId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.getFriendsPaged(cookie, targetUserId, cursor)
    }
  )

  handle(
    'get-followers',
    z.tuple([z.string(), z.number(), z.string().optional()]),
    async (_, cookieRaw, targetUserId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.getFollowers(cookie, targetUserId, cursor)
    }
  )

  handle(
    'get-followings',
    z.tuple([z.string(), z.number(), z.string().optional()]),
    async (_, cookieRaw, targetUserId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.getFollowings(cookie, targetUserId, cursor)
    }
  )

  handle('fetch-friend-stats', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // userId is passed explicitly for the friend we want to check
    return RobloxFriendService.getFriendStats(cookie, userId)
  })

  handle('get-user-by-username', z.tuple([z.string()]), async (_, username) => {
    return RobloxUserService.getUserByUsername(username)
  })

  handle(
    'send-friend-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, targetUserId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.sendFriendRequest(cookie, targetUserId)
    }
  )

  handle('get-friend-requests', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // getFriendRequests doesn't need userId - the endpoint uses the authenticated user from the cookie
    return RobloxFriendService.getFriendRequests(cookie)
  })

  handle(
    'accept-friend-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, requesterUserId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.acceptFriendRequest(cookie, requesterUserId)
    }
  )

  handle(
    'decline-friend-request',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, requesterUserId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxFriendService.declineFriendRequest(cookie, requesterUserId)
    }
  )

  handle('unfriend', z.tuple([z.string(), z.number()]), async (_, cookieRaw, targetUserId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxFriendService.unfriend(cookie, targetUserId)
  })

  handle('get-game-thumbnail-16x9', z.tuple([z.number()]), async (_, universeId) => {
    return RobloxGameService.getGameThumbnail16x9(universeId)
  })

  handle('get-game-sorts', z.tuple([z.string().optional()]), async (_, sessionId) => {
    // z.string().optional() in tuple usually requires explicit undefined if missing.
    // However, args will have undefined if missing in JS, which Zod handles if configured correctly or if undefined is passed.
    // ipcRenderer passing undefined usually works.
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
      return RobloxLauncherService.launchGame(cookie, placeId, jobId, friendId, installPath)
    }
  )

  handle('generate-quick-login-code', z.tuple([]), async () => {
    return RobloxAuthService.generateQuickLoginCode()
  })

  handle(
    'check-quick-login-status',
    z.tuple([z.string(), z.string()]),
    async (_, code, privateKey) => {
      return RobloxAuthService.checkQuickLoginStatus(code, privateKey)
    }
  )

  handle('complete-quick-login', z.tuple([z.string(), z.string()]), async (_, code, privateKey) => {
    return RobloxAuthService.completeQuickLogin(code, privateKey)
  })

  handle('open-roblox-login-window', z.tuple([]), async () => {
    return RobloxLoginWindowService.openLoginWindow()
  })

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
        console.warn('[RobloxController] No cookie found for region check')
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

  handle(
    'get-inventory',
    z.tuple([z.string(), z.number(), z.number(), z.string().optional()]),
    async (_, cookieRaw, userId, assetTypeId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxInventoryService.getInventory(cookie, userId, assetTypeId, cursor)
    }
  )

  handle(
    'get-current-avatar',
    z.tuple([z.string(), z.number().optional()]),
    async (_, cookieRaw, userId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarRenderService.getCurrentAvatar(cookie, userId)
    }
  )

  handle(
    'get-user-details-extended',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, userId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxUserService.getExtendedUserDetails(cookie, userId)
    }
  )

  handle('get-user-groups', z.tuple([z.number()]), async (_, userId) => {
    return RobloxUserService.getUserGroups(userId)
  })

  handle('get-batch-user-details', z.tuple([z.array(z.number())]), async (_, userIds) => {
    const resultMap = await RobloxUserService.getBatchUserDetails(userIds)
    // Convert Map to object for IPC serialization
    const resultObj: Record<number, { id: number; name: string; displayName: string } | null> = {}
    for (const [userId, details] of resultMap.entries()) {
      resultObj[userId] = details
    }
    return resultObj
  })

  // V2 API - accepts full asset objects with assetType and currentVersionId
  const assetObjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    assetType: z.object({
      id: z.number(),
      name: z.string()
    }),
    currentVersionId: z.number().optional(),
    meta: z
      .object({
        order: z.number().optional(),
        puffiness: z.number().optional(),
        version: z.number().optional()
      })
      .optional()
  })

  handle(
    'set-wearing-assets',
    z.tuple([z.string(), z.array(assetObjectSchema)]),
    async (_, cookieRaw, assets) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarMutationService.setWearingAssets(cookie, assets)
    }
  )

  handle('set-body-colors', z.tuple([z.string(), z.any()]), async (_, cookieRaw, bodyColors) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAvatarMutationService.setBodyColors(cookie, bodyColors)
  })

  const avatarScalesSchema = z.object({
    height: z.number(),
    width: z.number(),
    head: z.number(),
    proportion: z.number(),
    bodyType: z.number()
  })

  handle(
    'set-avatar-scales',
    z.tuple([z.string(), avatarScalesSchema]),
    async (_, cookieRaw, scales) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarMutationService.setAvatarScales(cookie, scales)
    }
  )

  handle(
    'set-player-avatar-type',
    z.tuple([z.string(), z.enum(['R6', 'R15'])]),
    async (_, cookieRaw, playerAvatarType) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarMutationService.setPlayerAvatarType(cookie, playerAvatarType)
    }
  )

  handle(
    'get-batch-thumbnails',
    z.tuple([
      z.array(z.number()),
      z.enum(['Asset', 'Outfit', 'BadgeIcon', 'GroupIcon']).optional()
    ]),
    async (_, targetIds, type) => {
      return RobloxThumbnailService.getBatchThumbnails(targetIds, undefined, undefined, type)
    }
  )

  handle(
    'get-user-outfits',
    z.tuple([z.string(), z.number(), z.boolean(), z.number()]),
    async (_, cookieRaw, userId, isEditable, page) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxOutfitService.getOutfits(cookie, userId, isEditable, page)
    }
  )

  handle('wear-outfit', z.tuple([z.string(), z.number()]), async (_, cookieRaw, outfitId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxOutfitService.wearOutfit(cookie, outfitId)
  })

  handle(
    'update-outfit',
    z.tuple([z.string(), z.number(), outfitDetailsSchema.partial().passthrough()]),
    async (_, cookieRaw, outfitId, details) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxOutfitService.updateOutfit(cookie, outfitId, details)
    }
  )

  handle(
    'get-outfit-details',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, outfitId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxOutfitService.getOutfitDetails(cookie, outfitId)
    }
  )

  handle('get-asset-details', z.tuple([z.string(), z.number()]), async (_, cookieRaw, assetId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAssetService.getAssetDetails(cookie, assetId)
  })

  handle('get-asset-hierarchy', z.tuple([z.number()]), async (_, assetId) => {
    return RobloxAssetService.getAssetHierarchy(assetId)
  })

  handle(
    'get-batch-asset-details',
    z.tuple([z.string(), z.array(z.number()), z.enum(['Asset', 'Bundle']).optional()]),
    async (_, cookieRaw, assetIds, itemType) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAssetService.getBatchAssetDetails(cookie, assetIds, itemType || 'Asset')
    }
  )

  handle(
    'get-asset-recommendations',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, assetId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAssetService.getAssetRecommendations(cookie, assetId)
    }
  )

  handle(
    'get-asset-resellers',
    z.tuple([z.string(), z.number().optional(), z.string().optional()]),
    async (_, collectibleItemId, limit, cursor) => {
      return RobloxAssetService.getAssetResellers(collectibleItemId, limit || 100, cursor)
    }
  )

  handle(
    'get-asset-owners',
    z.tuple([
      z.string(),
      z.number(),
      z.number().optional(),
      z.enum(['Asc', 'Desc']).optional(),
      z.string().optional()
    ]),
    async (_, cookieRaw, assetId, limit, sortOrder, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAssetService.getAssetOwners(
        cookie,
        assetId,
        limit || 100,
        sortOrder || 'Asc',
        cursor
      )
    }
  )

  handle(
    'purchase-limited-item',
    z.tuple([
      z.string(), // cookie
      z.string(), // collectibleItemInstanceId
      z.number(), // expectedPrice
      z.number(), // sellerId
      z.string() // collectibleProductId
    ]),
    async (
      _,
      cookieRaw,
      collectibleItemInstanceId,
      expectedPrice,
      sellerId,
      collectibleProductId
    ) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAssetService.purchaseLimitedItem(
        cookie,
        collectibleItemInstanceId,
        expectedPrice,
        sellerId,
        collectibleProductId
      )
    }
  )

  handle('delete-outfit', z.tuple([z.string(), z.number()]), async (_, cookieRaw, outfitId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxOutfitService.deleteOutfit(cookie, outfitId)
  })

  handle('get-fflags', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.getFFlags(installPath)
  })

  handle(
    'set-fflags',
    z.tuple([z.string(), z.record(z.string(), z.unknown())]),
    async (_, installPath, flags) => {
      return RobloxInstallService.setFFlags(installPath, flags)
    }
  )

  handle('set-active-install', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.setActive(installPath)
  })

  handle('remove-active-install', z.tuple([]), async () => {
    return RobloxInstallService.removeActive()
  })

  handle('get-active-install-path', z.tuple([]), async () => {
    return RobloxInstallService.getActiveInstallPath()
  })

  handle('get-detailed-stats', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getDetailedStats(cookie, userId)
  })

  handle('get-roblox-badges', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getRobloxBadges(cookie, userId)
  })

  handle('get-player-badges', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPlayerBadges(cookie, userId)
  })

  handle('get-collectibles', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxInventoryService.getCollectibles(cookie, userId)
  })

  handle('get-past-usernames', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPastUsernames(cookie, userId)
  })

  handle(
    'render-avatar-preview',
    z.tuple([z.string(), z.number(), z.number()]),
    async (_, cookieRaw, userId, assetId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarRenderService.renderAvatarWithAsset(cookie, userId, assetId)
    }
  )

  // Helper function to compute CDN server from hash
  const hashToServer = (hash: string): number => {
    let i = 31
    for (const c of hash) {
      i ^= c.charCodeAt(0)
    }
    return i % 8
  }

  // Helper function to download a file from URL
  const downloadFileToPath = (url: string, dest: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(dest)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const request = net.request(url)
      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }

        const file = fs.createWriteStream(dest)
        file.on('error', (err) => {
          file.close()
          fs.unlink(dest, () => {})
          reject(err)
        })
        file.on('finish', () => {
          file.close(() => resolve())
        })

        response.on('data', (chunk) => file.write(chunk))
        response.on('end', () => file.end())
        response.on('error', (err) => {
          file.close()
          fs.unlink(dest, () => {})
          reject(err)
        })
      })
      request.on('error', reject)
      request.end()
    })
  }

  handle('get-resale-data', z.tuple([z.number()]), async (_, assetId) => {
    return RobloxAssetService.getResaleData(assetId)
  })

  // Rolimons API - fetch all limited item data
  handle('get-rolimons-item-details', z.tuple([]), async () => {
    const response = await net.fetch('https://api.rolimons.com/items/v2/itemdetails', {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (response.status === 429) {
      throw new Error('Rate limited by Rolimons API. Please try again later.')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch Rolimons data: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error('Rolimons API returned unsuccessful response')
    }

    return data
  })

  // Rolimons API - fetch player data (value, rap, badges, etc.)
  handle('get-rolimons-player', z.tuple([z.number()]), async (_, userId) => {
    const response = await net.fetch(`https://api.rolimons.com/players/v1/playerinfo/${userId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (response.status === 429) {
      throw new Error('Rate limited by Rolimons API. Please try again later.')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch Rolimons player data: ${response.status}`)
    }

    const data = await response.json()
    return data
  })

  handle(
    'download-asset-3d',
    z.tuple([z.number(), z.enum(['obj', 'texture']), z.string()]),
    async (event, assetId, type, assetName) => {
      // Fetch the 3D thumbnail manifest
      const thumbResponse = await net.fetch(
        `https://thumbnails.roblox.com/v1/assets-thumbnail-3d?assetId=${assetId}`
      )
      if (!thumbResponse.ok)
        throw new Error(`Failed to fetch 3D thumbnail data: ${thumbResponse.status}`)
      const thumbData = await thumbResponse.json()

      if (thumbData.state !== 'Completed' || !thumbData.imageUrl) {
        throw new Error('3D data not available for this asset')
      }

      // Fetch the manifest
      const manifestResponse = await net.fetch(thumbData.imageUrl)
      if (!manifestResponse.ok)
        throw new Error(`Failed to fetch manifest: ${manifestResponse.status}`)
      const manifest = await manifestResponse.json()

      const mtlHash = manifest.mtl
      const objHash = manifest.obj
      if (!mtlHash || !objHash) throw new Error('MTL or OBJ hash missing in manifest')

      // Get the parent window for the dialog
      const win = BrowserWindow.fromWebContents(event.sender)

      if (type === 'obj') {
        // Download OBJ file
        const objUrl = `https://t${hashToServer(objHash)}.rbxcdn.com/${objHash}`
        const safeName = assetName.replace(/[^a-zA-Z0-9_-]/g, '_')

        const result = await dialog.showSaveDialog(win!, {
          title: 'Save OBJ File',
          defaultPath: `${safeName}.obj`,
          filters: [{ name: 'OBJ Files', extensions: ['obj'] }]
        })

        if (result.canceled || !result.filePath) return { success: false, canceled: true }

        await downloadFileToPath(objUrl, result.filePath)
        return { success: true, path: result.filePath }
      } else {
        // Download texture - need to parse MTL to find texture hash
        const mtlUrl = `https://t${hashToServer(mtlHash)}.rbxcdn.com/${mtlHash}`
        const mtlResponse = await net.fetch(mtlUrl)
        if (!mtlResponse.ok) throw new Error(`Failed to fetch MTL: ${mtlResponse.status}`)
        const mtlText = await mtlResponse.text()

        // Parse MTL to find texture hash (map_Kd line)
        const lines = mtlText.split(/\r?\n/)
        let textureHash: string | null = null
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('map_Kd ')) {
            const parts = trimmed.split(/\s+/)
            textureHash = parts[parts.length - 1]
            break
          }
        }

        if (!textureHash) throw new Error('No texture found in material file')

        const textureUrl = `https://t${hashToServer(textureHash)}.rbxcdn.com/${textureHash}`
        const safeName = assetName.replace(/[^a-zA-Z0-9_-]/g, '_')

        const result = await dialog.showSaveDialog(win!, {
          title: 'Save Texture',
          defaultPath: `${safeName}_texture.png`,
          filters: [{ name: 'PNG Images', extensions: ['png'] }]
        })

        if (result.canceled || !result.filePath) return { success: false, canceled: true }

        await downloadFileToPath(textureUrl, result.filePath)
        return { success: true, path: result.filePath }
      }
    }
  )
}
