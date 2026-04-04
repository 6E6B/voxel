import { net } from 'electron'
import { RobloxUserService } from '@main/modules/users/UserService'
import { RobloxAvatarService } from '@main/modules/avatar/AvatarService'
import { RobloxInventoryService } from '@main/modules/avatar/InventoryService'
import { RobloxAssetService } from '@main/modules/avatar/AssetService'
import { RobloxCatalogService } from '@main/modules/catalog/CatalogService'
import type { CatalogSearchParams } from '@main/modules/catalog/CatalogService'
import { catalogDatabaseService } from '@main/modules/catalog/CatalogDatabaseService'
import { avatarContracts } from '../contracts/avatar'
import { router, contractMutation, authContractMutation } from '../core'

const ROLIMONS_HEADERS = {
    Accept: 'text/html',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

const extractJsVar = (html: string, varName: string): any => {
    const patterns = [
        new RegExp(`var\\s+${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});`, 'm'),
        new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`, 'm')
    ]

    for (const regex of patterns) {
        const match = html.match(regex)
        if (match && match[1]) {
            try {
                const fn = new Function(`return ${match[1]}`)
                return fn()
            } catch {
                try {
                    const str = match[1]
                        .replace(/'/g, '"')
                        .replace(/,(\s*[}\]])/g, '$1')
                        .replace(/(\w+):/g, '"$1":')
                    return JSON.parse(str)
                } catch {
                    return null
                }
            }
        }
    }

    return null
}

const decodeHtmlEntities = (input: string): string =>
    input
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const stripHtml = (input: string): string =>
    decodeHtmlEntities(input.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim()

const normalizeRolimonsBadgeKey = (title: string): string =>
    title
        .toLowerCase()
        .replace(/\+/g, 'plus')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')

const parseRolimonsBadgeDetails = (html: string) => {
    const badgeRegex = /<div class="position-relative badge_inner_container([^\"]*)">([\s\S]*?)<div class="badge_title">([\s\S]*?)<\/div>[\s\S]*?<div class="badge_description">([\s\S]*?)<\/div>/g
    const badges: Array<{ key: string; title: string; description: string; acquiredTime: null }> = []

    for (const match of html.matchAll(badgeRegex)) {
        const classNames = match[1] ?? ''
        if (classNames.includes('badge_overlay_unobtained')) continue

        const title = stripHtml(match[3] ?? '')
        const description = stripHtml(match[4] ?? '')
        if (!title) continue

        badges.push({
            key: normalizeRolimonsBadgeKey(title),
            title,
            description,
            acquiredTime: null
        })
    }

    return badges
}

const getLastNumber = (values: unknown): number | null => {
    if (!Array.isArray(values)) return null
    for (let index = values.length - 1; index >= 0; index -= 1) {
        const value = values[index]
        if (typeof value === 'number' && Number.isFinite(value)) return value
    }
    return null
}

export const avatarRouter = router({
    getAvatarUrl: contractMutation(avatarContracts.getAvatarUrl, async (_ctx, userId) => {
        return RobloxUserService.getAvatarUrl(userId)
    }),
    getBatchUserAvatars: contractMutation(avatarContracts.getBatchUserAvatars, async (_ctx, userIds, size, cookie) => {
        const resultMap = await RobloxUserService.getBatchUserAvatarHeadshots(
            userIds,
            size || '420x420',
            cookie
        )
        const resultObj: Record<number, string | null> = {}
        for (const [userId, url] of resultMap.entries()) {
            resultObj[userId] = url
        }
        return resultObj
    }),
    getCurrentAvatar: authContractMutation(avatarContracts.getCurrentAvatar, async (_ctx, cookie, userId) => {
        return RobloxAvatarService.getCurrentAvatar(cookie, userId)
    }),
    setWearingAssets: authContractMutation(avatarContracts.setWearingAssets, async (_ctx, cookie, assetIds) => {
        return RobloxAvatarService.setWearingAssets(cookie, assetIds)
    }),
    setBodyColors: authContractMutation(avatarContracts.setBodyColors, async (_ctx, cookie, colors) => {
        return RobloxAvatarService.setBodyColors(cookie, colors)
    }),
    setAvatarScales: authContractMutation(avatarContracts.setAvatarScales, async (_ctx, cookie, scales) => {
        return RobloxAvatarService.setAvatarScales(cookie, scales)
    }),
    setPlayerAvatarType: authContractMutation(avatarContracts.setPlayerAvatarType, async (_ctx, cookie, avatarType) => {
        return RobloxAvatarService.setPlayerAvatarType(cookie, avatarType)
    }),
    wearOutfit: authContractMutation(avatarContracts.wearOutfit, async (_ctx, cookie, outfitId) => {
        return RobloxAvatarService.wearOutfit(cookie, outfitId)
    }),
    updateOutfit: authContractMutation(avatarContracts.updateOutfit, async (_ctx, cookie, outfitId, outfitData) => {
        return RobloxAvatarService.updateOutfit(cookie, outfitId, outfitData)
    }),
    getOutfitDetails: authContractMutation(avatarContracts.getOutfitDetails, async (_ctx, cookie, outfitId) => {
        return RobloxAvatarService.getOutfitDetails(cookie, outfitId)
    }),
    createOutfit: authContractMutation(avatarContracts.createOutfit, async (_ctx, cookie, name) => {
        return RobloxAvatarService.createOutfit(cookie, name)
    }),
    deleteOutfit: authContractMutation(avatarContracts.deleteOutfit, async (_ctx, cookie, outfitId) => {
        return RobloxAvatarService.deleteOutfit(cookie, outfitId)
    }),
    getBatchThumbnails: contractMutation(avatarContracts.getBatchThumbnails, async (_ctx, targetIds, type) => {
        return RobloxAvatarService.getBatchThumbnails(targetIds, undefined, undefined, type)
    }),
    getUserOutfits: authContractMutation(avatarContracts.getUserOutfits, async (_ctx, cookie, userId, isEditable, page) => {
        return RobloxAvatarService.getOutfits(cookie, userId, isEditable, page)
    }),
    getInventory: authContractMutation(avatarContracts.getInventory, async (_ctx, cookie, userId, assetTypeId, cursor) => {
        return RobloxAvatarService.getInventory(cookie, userId, assetTypeId, cursor)
    }),
    getCollectibles: authContractMutation(avatarContracts.getCollectibles, async (_ctx, cookie, userId) => {
        return RobloxAvatarService.getCollectibles(cookie, userId)
    }),
    getInventoryV2: authContractMutation(avatarContracts.getInventoryV2, async (_ctx, cookie, userId, assetTypes, cursor, limit, sortOrder) => {
        return RobloxInventoryService.getInventoryV2(
            cookie,
            userId,
            assetTypes,
            cursor,
            limit || 100,
            sortOrder || 'Desc'
        )
    }),
    getAssetContent: contractMutation(avatarContracts.getAssetContent, async (_ctx, assetId) => {
        return RobloxUserService.getAssetContent(assetId)
    }),
    getAssetHierarchy: contractMutation(avatarContracts.getAssetHierarchy, async (_ctx, assetId) => {
        return RobloxAssetService.getAssetHierarchy(assetId)
    }),
    getAssetDetails: authContractMutation(avatarContracts.getAssetDetails, async (_ctx, cookie, assetId) => {
        return RobloxAvatarService.getAssetDetails(cookie, assetId)
    }),
    getBatchAssetDetails: authContractMutation(avatarContracts.getBatchAssetDetails, async (_ctx, cookie, assetIds, itemType) => {
        return RobloxAvatarService.getBatchAssetDetails(cookie, assetIds, itemType || 'Asset')
    }),
    getAssetRecommendations: authContractMutation(avatarContracts.getAssetRecommendations, async (_ctx, cookie, assetId) => {
        return RobloxAvatarService.getAssetRecommendations(cookie, assetId)
    }),
    purchaseCatalogItem: authContractMutation(avatarContracts.purchaseCatalogItem, async (
        _ctx,
        cookie,
        collectibleItemId,
        expectedPrice,
        expectedSellerId,
        collectibleProductId,
        expectedPurchaserId,
        idempotencyKey
    ) => {
        return RobloxAvatarService.purchaseCatalogItem(
            cookie,
            collectibleItemId,
            expectedPrice,
            expectedSellerId,
            collectibleProductId,
            expectedPurchaserId,
            idempotencyKey
        )
    }),
    checkAssetOwnership: authContractMutation(avatarContracts.checkAssetOwnership, async (_ctx, cookie, userIdRaw, assetId, itemType) => {
        const userId = typeof userIdRaw === 'string' ? parseInt(userIdRaw, 10) : userIdRaw
        return RobloxInventoryService.checkAssetOwnership(cookie, userId, assetId, itemType)
    }),
    searchCatalog: contractMutation(avatarContracts.searchCatalog, async (_ctx, keyword, limit, creatorName) => {
        return RobloxAvatarService.searchCatalog(keyword, limit || 30, creatorName)
    }),
    getRolimonsPlayerProfile: contractMutation(avatarContracts.getRolimonsPlayerProfile, async (_ctx, userId) => {
        const [playerResponse, badgesResponse] = await Promise.all([
            net.fetch(`https://www.rolimons.com/player/${userId}`, {
                method: 'GET',
                headers: ROLIMONS_HEADERS
            }),
            net.fetch(`https://www.rolimons.com/playerrolibadges/${userId}`, {
                method: 'GET',
                headers: ROLIMONS_HEADERS
            })
        ])

        if (!playerResponse.ok) {
            throw new Error(`Failed to fetch Rolimons player page: ${playerResponse.status}`)
        }

        if (!badgesResponse.ok) {
            throw new Error(`Failed to fetch Rolimons player badges page: ${badgesResponse.status}`)
        }

        const [playerHtml, badgesHtml] = await Promise.all([
            playerResponse.text(),
            badgesResponse.text()
        ])

        const playerDetails = extractJsVar(playerHtml, 'player_details_data') as {
            player_name?: string
            bc_type?: number
            last_roblox_activity_ts?: number
            rank?: number
        } | null
        const oldChartData = extractJsVar(playerHtml, 'old_chart_data') as {
            value?: number[]
            rap?: number[]
        } | null

        const badgeDetails = parseRolimonsBadgeDetails(badgesHtml)

        return {
            name: playerDetails?.player_name,
            value: getLastNumber(oldChartData?.value) ?? null,
            rap: getLastNumber(oldChartData?.rap) ?? null,
            rank: playerDetails?.rank ?? null,
            premium: (playerDetails?.bc_type ?? 0) > 0,
            last_online: playerDetails?.last_roblox_activity_ts ?? null,
            last_location: null,
            rolibadges: Object.fromEntries(badgeDetails.map((badge) => [badge.key, true])),
            rolibadgeDetails: badgeDetails
        }
    }),
    getRolimonsItemPage: contractMutation(avatarContracts.getRolimonsItemPage, async (_ctx, itemId) => {
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

        const extractJsVar = (varName: string): any => {
            const patterns = [
                new RegExp(`var\\s+${varName}\\s*=\\s*(\\{[\\s\\S]*?\\});`, 'm'),
                new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`, 'm')
            ]

            for (const regex of patterns) {
                const match = html.match(regex)
                if (match && match[1]) {
                    try {
                        const fn = new Function(`return ${match[1]}`)
                        return fn()
                    } catch {
                        try {
                            const str = match[1]
                                .replace(/'/g, '"')
                                .replace(/,(\s*[}\]])/g, '$1')
                                .replace(/(\w+):/g, '"$1":')
                            return JSON.parse(str)
                        } catch {
                            return null
                        }
                    }
                }
            }

            return null
        }

        return {
            itemDetails: extractJsVar('item_details_data'),
            historyData: extractJsVar('history_data'),
            salesData: extractJsVar('sales_data'),
            ownershipData: extractJsVar('ownership_data'),
            hoardsData: extractJsVar('hoards_data'),
            valueChanges: extractJsVar('value_changes')
        }
    }),
    getCatalogNavigation: contractMutation(avatarContracts.getCatalogNavigation, async () => {
        return RobloxCatalogService.getNavigationMenu()
    }),
    getCatalogSearchSuggestions: contractMutation(avatarContracts.getCatalogSearchSuggestions, async (_ctx, prefix, limit) => {
        return RobloxCatalogService.getSearchSuggestions(prefix, limit)
    }),
    searchCatalogItems: contractMutation(avatarContracts.searchCatalogItems, async (_ctx, params: CatalogSearchParams & { cookie?: string }) => {
        const { cookie, ...searchParams } = params
        return RobloxCatalogService.searchCatalog(searchParams, cookie)
    }),
    getCatalogThumbnails: contractMutation(avatarContracts.getCatalogThumbnails, async (_ctx, items) => {
        return RobloxCatalogService.getItemThumbnails(items)
    }),
    downloadCatalogTemplate: contractMutation(avatarContracts.downloadCatalogTemplate, async (_ctx, assetId, assetName, cookie) => {
        return RobloxCatalogService.downloadShirtPantsTemplate(assetId, assetName, cookie)
    }),
    getStatus: contractMutation(avatarContracts.getCatalogDbStatus, async () => {
        return catalogDatabaseService.getStatus()
    }),
    download: contractMutation(avatarContracts.downloadCatalogDb, async () => {
        return catalogDatabaseService.downloadDatabase()
    }),
    getAllCatalogItems: contractMutation(avatarContracts.getAllCatalogItems, async () => {
        return catalogDatabaseService.getAllItems()
    }),
    getCatalogIndexExport: contractMutation(avatarContracts.getCatalogIndexExport, async () => {
        return catalogDatabaseService.getExportedIndex()
    }),
    searchCatalogDb: contractMutation(avatarContracts.searchCatalogDb, async (_ctx, query, limit) => {
        return catalogDatabaseService.searchByName(query, limit)
    }),
    getCatalogItemById: contractMutation(avatarContracts.getCatalogItemById, async (_ctx, assetId) => {
        return catalogDatabaseService.getItemById(assetId)
    }),
    getSalesData: contractMutation(avatarContracts.getSalesData, async (_ctx, assetId) => {
        return catalogDatabaseService.getSalesData(assetId)
    }),
    getBatchSalesData: contractMutation(avatarContracts.getBatchSalesData, async (_ctx, assetIds) => {
        return catalogDatabaseService.getBatchSalesData(assetIds)
    }),
    getCatalogItemCount: contractMutation(avatarContracts.getCatalogItemCount, async () => {
        return catalogDatabaseService.getItemCount()
    })
})