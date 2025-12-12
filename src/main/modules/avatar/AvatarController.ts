import { z } from 'zod'
import { dialog, BrowserWindow, net } from 'electron'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxAvatarService } from './AvatarService'
import { RobloxInventoryService } from './InventoryService'
import { RobloxAssetService } from './AssetService'
import { RobloxThumbnailService } from './ThumbnailService'
import { outfitDetailsSchema } from '../../../shared/ipc-schemas/avatar'
import { hashToServer, downloadFileToPath } from '../core/utils/downloadUtils'

/**
 * Registers avatar-related IPC handlers
 */
export const registerAvatarHandlers = (): void => {
  // 3D Avatar Manifest - authenticated with CSRF
  handle(
    'get-avatar-3d-manifest',
    z.tuple([z.string(), z.union([z.number(), z.string()])]),
    async (_, cookieRaw, userId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxThumbnailService.getAvatar3DManifest(cookie, userId)
    }
  )

  // 3D Asset Manifest - authenticated with CSRF
  handle(
    'get-asset-3d-manifest',
    z.tuple([z.string(), z.union([z.number(), z.string()])]),
    async (_, cookieRaw, assetId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxThumbnailService.getAsset3DManifest(cookie, assetId)
    }
  )

  handle(
    'get-inventory',
    z.tuple([z.string(), z.number(), z.number(), z.string().optional()]),
    async (_, cookieRaw, userId, assetTypeId, cursor) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.getInventory(cookie, userId, assetTypeId, cursor)
    }
  )

  handle(
    'get-inventory-v2',
    z.tuple([
      z.string(),
      z.number(),
      z.array(z.string()),
      z.string().optional(),
      z.number().optional(),
      z.enum(['Asc', 'Desc']).optional()
    ]),
    async (_, cookieRaw, userId, assetTypes, cursor, limit, sortOrder) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxInventoryService.getInventoryV2(
        cookie,
        userId,
        assetTypes,
        cursor,
        limit || 100,
        sortOrder || 'Desc'
      )
    }
  )

  handle('get-asset-hierarchy', z.tuple([z.number()]), async (_, assetId) => {
    return RobloxAssetService.getAssetHierarchy(assetId)
  })

  handle(
    'get-current-avatar',
    z.tuple([z.string(), z.number().optional()]),
    async (_, cookieRaw, userId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.getCurrentAvatar(cookie, userId)
    }
  )

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
      return RobloxAvatarService.setWearingAssets(cookie, assets)
    }
  )

  handle('set-body-colors', z.tuple([z.string(), z.any()]), async (_, cookieRaw, bodyColors) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAvatarService.setBodyColors(cookie, bodyColors)
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
      return RobloxAvatarService.setAvatarScales(cookie, scales)
    }
  )

  handle(
    'set-player-avatar-type',
    z.tuple([z.string(), z.enum(['R6', 'R15'])]),
    async (_, cookieRaw, playerAvatarType) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.setPlayerAvatarType(cookie, playerAvatarType)
    }
  )

  handle(
    'get-batch-thumbnails',
    z.tuple([
      z.array(z.number()),
      z.enum(['Asset', 'Outfit', 'BadgeIcon', 'GroupIcon']).optional()
    ]),
    async (_, targetIds, type) => {
      return RobloxAvatarService.getBatchThumbnails(targetIds, undefined, undefined, type)
    }
  )

  handle(
    'get-user-outfits',
    z.tuple([z.string(), z.number(), z.boolean(), z.number()]),
    async (_, cookieRaw, userId, isEditable, page) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.getOutfits(cookie, userId, isEditable, page)
    }
  )

  handle('wear-outfit', z.tuple([z.string(), z.number()]), async (_, cookieRaw, outfitId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAvatarService.wearOutfit(cookie, outfitId)
  })

  handle(
    'update-outfit',
    z.tuple([z.string(), z.number(), outfitDetailsSchema.partial().passthrough()]),
    async (_, cookieRaw, outfitId, details) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.updateOutfit(cookie, outfitId, details)
    }
  )

  handle(
    'get-outfit-details',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, outfitId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.getOutfitDetails(cookie, outfitId)
    }
  )

  handle('get-asset-details', z.tuple([z.string(), z.number()]), async (_, cookieRaw, assetId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAvatarService.getAssetDetails(cookie, assetId)
  })

  handle(
    'get-batch-asset-details',
    z.tuple([z.string(), z.array(z.number()), z.enum(['Asset', 'Bundle']).optional()]),
    async (_, cookieRaw, assetIds, itemType) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.getBatchAssetDetails(cookie, assetIds, itemType || 'Asset')
    }
  )

  handle(
    'get-asset-recommendations',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, assetId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.getAssetRecommendations(cookie, assetId)
    }
  )

  handle(
    'get-asset-resellers',
    z.tuple([z.string(), z.number().optional(), z.string().optional()]),
    async (_, collectibleItemId, limit, cursor) => {
      return RobloxAvatarService.getAssetResellers(collectibleItemId, limit || 100, cursor)
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
      return RobloxAvatarService.getAssetOwners(
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
      return RobloxAvatarService.purchaseLimitedItem(
        cookie,
        collectibleItemInstanceId,
        expectedPrice,
        sellerId,
        collectibleProductId
      )
    }
  )

  handle(
    'purchase-catalog-item',
    z.tuple([
      z.string(), // cookie
      z.string(), // collectibleItemId (UUID)
      z.number(), // expectedPrice
      z.number(), // expectedSellerId
      z.string().optional(), // collectibleProductId
      z.string().optional(), // expectedPurchaserId
      z.string().optional() // idempotencyKey
    ]),
    async (
      _,
      cookieRaw,
      collectibleItemId,
      expectedPrice,
      expectedSellerId,
      collectibleProductId,
      expectedPurchaserId,
      idempotencyKey
    ) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.purchaseCatalogItem(
        cookie,
        collectibleItemId,
        expectedPrice,
        expectedSellerId,
        collectibleProductId,
        expectedPurchaserId,
        idempotencyKey
      )
    }
  )

  handle('delete-outfit', z.tuple([z.string(), z.number()]), async (_, cookieRaw, outfitId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAvatarService.deleteOutfit(cookie, outfitId)
  })

  handle('get-collectibles', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxAvatarService.getCollectibles(cookie, userId)
  })

  handle(
    'render-avatar-preview',
    z.tuple([z.string(), z.number(), z.number()]),
    async (_, cookieRaw, userId, assetId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxAvatarService.renderAvatarWithAsset(cookie, userId, assetId)
    }
  )

  handle('get-resale-data', z.tuple([z.number()]), async (_, assetId) => {
    return RobloxAvatarService.getResaleData(assetId)
  })

  handle(
    'check-asset-ownership',
    z.tuple([z.string(), z.union([z.number(), z.string()]), z.number(), z.string().optional()]),
    async (_, cookieRaw, userIdRaw, assetId, itemType) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      const userId = typeof userIdRaw === 'string' ? parseInt(userIdRaw, 10) : userIdRaw
      return RobloxInventoryService.checkAssetOwnership(cookie, userId, assetId, itemType)
    }
  )

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

  // Rolimons API - fetch detailed item page data (value history, ownership data, etc.)
  handle('get-rolimons-item-page', z.tuple([z.number()]), async (_, itemId) => {
    const response = await net.fetch(`https://www.rolimons.com/item/${itemId}`, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (response.status === 429) {
      throw new Error('Rate limited by Rolimons. Please try again later.')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch Rolimons item page: ${response.status}`)
    }

    const html = await response.text()

    // Helper function to extract JavaScript variable value using regex
    // This handles the embedded JS objects/arrays in the HTML
    const extractJsVar = (varName: string): any => {
      // Match var varName = {...}; or var varName = [...];
      // Use a more robust pattern that captures everything until the closing semicolon
      const patterns = [
        // Pattern for objects: var name = { ... };
        new RegExp(`var\\s+${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});`, 'm'),
        // Pattern for arrays: var name = [ ... ];
        new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`, 'm')
      ]

      for (const regex of patterns) {
        const match = html.match(regex)
        if (match && match[1]) {
          try {
            // The data is already valid JavaScript, we can use Function to evaluate it safely
            // This handles null, true, false, numbers, strings, etc. properly
            const fn = new Function(`return ${match[1]}`)
            return fn()
          } catch {
            // If Function evaluation fails, try manual JSON parsing with fixes
            try {
              const str = match[1]
                .replace(/'/g, '"') // Single quotes to double quotes
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .replace(/(\w+):/g, '"$1":') // Quote unquoted keys
              return JSON.parse(str)
            } catch {
              return null
            }
          }
        }
      }
      return null
    }

    const itemDetails = extractJsVar('item_details_data')
    const historyData = extractJsVar('history_data')
    const salesData = extractJsVar('sales_data')
    const ownershipData = extractJsVar('ownership_data')
    const hoardsData = extractJsVar('hoards_data')
    const valueChanges = extractJsVar('value_changes')

    return {
      itemDetails,
      historyData,
      salesData,
      ownershipData,
      hoardsData,
      valueChanges
    }
  })

  // Catalog search by keyword
  handle(
    'search-catalog',
    z.tuple([z.string(), z.number().optional(), z.string().optional()]),
    async (_, keyword, limit, creatorName) => {
      return RobloxAvatarService.searchCatalog(keyword, limit || 30, creatorName)
    }
  )

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
