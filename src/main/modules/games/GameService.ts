import { request, requestWithCsrf, safeRequest, RequestError } from '@main/lib/request'

import { randomUUID } from 'crypto'
import { screen } from 'electron'
import os from 'os'
import { z } from 'zod'
import {
  gameThumbnailSchema,
  discoveryHomeResponseSchema,
  searchResponseSchema,
  gameDetailsSchema,
  gameVoteSchema,
  pagedServerSchema,
  pagedPrivateServerSchema,
  placeDetailsSchema,
  socialLinksResponseSchema,
  voteResponseSchema,
  gamePassesResponseSchema,
  GameDetails,
  DiscoveryGameMetadata,
  DiscoveryHomeResponse,
  DiscoveryHomeSort,
  DiscoveryRecommendation
} from '@shared/contracts/games'

export class RobloxGameService {
  private static readonly discoveryEndpoint = 'https://apis.roblox.com/discovery-api/omni-recommendation'

  private static readonly discoveryPayloadBase = {
    pageType: 'Home',
    supportedTreatmentTypes: ['SortlessGrid'],
    sduiTreatmentTypes: ['Carousel', 'HeroUnit'],
    networkType: '4g'
  }

  private static readonly discoveryHomeCache = new Map<
    string,
    { fetchedAt: number; response: DiscoveryHomeResponse }
  >()

  static async getGameThumbnail16x9(universeId: number): Promise<string[]> {
    try {
      const thumbResult = await request(
        z.object({
          data: z.array(
            z.object({
              targetId: z.number().optional(),
              state: z.string().optional(),
              imageUrl: z.string().nullable().optional(),
              thumbnails: z.array(z.object({ imageUrl: z.string() })).optional()
            })
          )
        }),
        {
          url: `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=10&defaults=true&size=768x432&format=Png&isCircular=false`
        }
      )

      if (thumbResult.data && thumbResult.data.length > 0) {
        const gameData = thumbResult.data[0]
        if (gameData.thumbnails && gameData.thumbnails.length > 0) {
          return gameData.thumbnails.map((t) => t.imageUrl)
        }
      }
      return []
    } catch (e) {
      console.error('Failed to fetch 16x9 thumbnail', e)
      return []
    }
  }

  /**
   * Get game icon thumbnail (square icon - better for Discord RPC)
   */
  static async getGameIconThumbnail(universeId: number): Promise<string | null> {
    try {
      const thumbResult = await request(
        z.object({
          data: z.array(
            z.object({
              targetId: z.number().optional(),
              state: z.string().optional(),
              imageUrl: z.string().nullable().optional()
            })
          )
        }),
        {
          url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`
        }
      )

      if (thumbResult.data && thumbResult.data.length > 0 && thumbResult.data[0].imageUrl) {
        return thumbResult.data[0].imageUrl
      }
      return null
    } catch (e) {
      console.error('Failed to fetch game icon thumbnail', e)
      return null
    }
  }

  static async getGameSorts(sessionId: string = randomUUID(), cookie?: string) {
    const feed = await this.getDiscoveryHomeFeed(sessionId, cookie)
    if (!feed) return []

    const candidateSorts = feed.sorts.filter(
      (sort) => this.isDiscoveryGameSort(sort) && !this.isRecentlyPlayedSort(sort)
    )

    const preferredSorts = candidateSorts.filter((sort) => this.isDiscoveryGridSort(sort))
    const sorts = preferredSorts.length > 0 ? preferredSorts : candidateSorts

    return sorts
      .map((sort, index) => {
        const displayName = sort.topic || sort.subtitle || `Recommended ${index + 1}`

        return {
          token: this.getDiscoverySortToken(sort, index),
          name: displayName,
          displayName
        }
      })
  }

  static async getGamesInSort(
    sortId: string,
    sessionId: string = randomUUID(),
    cookie?: string,
    count: number = 40
  ) {
    const feed = await this.getDiscoveryHomeFeed(sessionId, cookie)
    if (!feed) return []

    const sort = feed.sorts.find(
      (entry, index) => this.getDiscoverySortToken(entry, index) === sortId
    )

    if (!sort) return []

    return this.mapDiscoverySortToGames(feed, sort, count)
  }

  static async getGamesByUniverseIds(universeIds: number[]) {
    return this.hydrateGames(universeIds, [])
  }

  static async searchGames(query: string, sessionId: string = randomUUID()) {
    const result = await request(searchResponseSchema, {
      url: `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&sessionId=${sessionId}&pageType=Games`
    })

    if (!result.searchResults || result.searchResults.length === 0) return []

    const gameGroups = result.searchResults.filter(
      (g: any) =>
        (g.contentGroupType === 'Game' || g.contentGroupType === 'Games') &&
        g.contents &&
        g.contents.length > 0
    )

    if (gameGroups.length === 0) {
      return []
    }

    const allGames = gameGroups.flatMap((group: any) => group.contents)

    const validGames = allGames.filter((g: any) => !!g.universeId)

    const universeIds = [...new Set(validGames.map((g: any) => g.universeId))] as number[]

    return this.hydrateGames(universeIds, validGames)
  }

  static async getRecentlyPlayedGames(
    cookie?: string,
    sessionId: string = randomUUID(),
    count: number = 40
  ) {
    if (!cookie) {
      console.warn('[RobloxGameService] No cookie found for recently played games')
      return []
    }

    try {
      const feed = await this.getDiscoveryHomeFeed(sessionId, cookie)
      if (!feed) return []

      const recentSort = feed.sorts.find((sort) => this.isRecentlyPlayedSort(sort))
      if (!recentSort) return []

      return this.mapDiscoverySortToGames(feed, recentSort, count)
    } catch (error) {
      console.error('Failed to fetch recently played games', error)
      return []
    }
  }

  private static async getDiscoveryHomeFeed(
    sessionId: string = randomUUID(),
    cookie?: string
  ): Promise<DiscoveryHomeResponse | null> {
    const cached = this.discoveryHomeCache.get(sessionId)
    if (cached) {
      const ttlMs = Math.max(cached.response.sortsRefreshInterval ?? 60, 30) * 1000
      if (Date.now() - cached.fetchedAt < ttlMs) {
        return cached.response
      }
    }

    try {
      const response = await request(discoveryHomeResponseSchema, {
        method: 'POST',
        url: this.discoveryEndpoint,
        cookie,
        body: this.buildDiscoveryPayload(sessionId)
      })

      this.discoveryHomeCache.set(sessionId, {
        fetchedAt: Date.now(),
        response
      })

      return response
    } catch (error) {
      console.error('Failed to fetch discovery home feed', error)
      return null
    }
  }

  private static buildDiscoveryPayload(sessionId: string) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const width = primaryDisplay?.size?.width ?? 1920
    const height = primaryDisplay?.size?.height ?? 1080

    return {
      ...this.discoveryPayloadBase,
      sessionId,
      cpuCores: Math.max(os.cpus().length, 1),
      maxResolution: `${width}x${height}`,
      maxMemory: Math.floor(os.totalmem() / (1024 * 1024))
    }
  }

  private static isDiscoveryGameSort(sort: DiscoveryHomeSort) {
    if (!Array.isArray(sort.recommendationList) || sort.recommendationList.length === 0) {
      return false
    }

    return sort.recommendationList.some((recommendation) =>
      this.isDiscoveryGameRecommendation(recommendation)
    )
  }

  private static isDiscoveryGameRecommendation(recommendation: DiscoveryRecommendation) {
    return recommendation.contentType === 'Game' || recommendation.contentType === 'GameCoPlay'
  }

  private static isDiscoveryGridSort(sort: DiscoveryHomeSort) {
    return sort.treatmentType === 'SortlessGrid'
  }

  private static isRecentlyPlayedSort(sort: DiscoveryHomeSort) {
    const label = `${sort.topic || ''} ${sort.subtitle || ''}`.trim().toLowerCase()
    return label.includes('recently played') || label.includes('continue')
  }

  private static getDiscoverySortToken(sort: DiscoveryHomeSort, index: number) {
    if (sort.topicId != null && sort.subId) {
      return `${sort.topicId}:${sort.subId}`
    }

    if (sort.topicId != null) {
      return String(sort.topicId)
    }

    return sort.subId || `${sort.topic || 'sort'}-${index}`
  }

  private static async mapDiscoverySortToGames(
    feed: DiscoveryHomeResponse,
    sort: DiscoveryHomeSort,
    count: number
  ) {
    const recommendations = (sort.recommendationList || [])
      .filter((recommendation) => this.isDiscoveryGameRecommendation(recommendation))
      .slice(0, count)

    if (recommendations.length === 0) return []

    const initialGames = recommendations
      .map((recommendation) => this.mapDiscoveryRecommendationToGamePayload(feed, recommendation))
      .filter((game): game is NonNullable<typeof game> => Boolean(game))

    if (initialGames.length === 0) return []

    const universeIds = initialGames.map((game) => game.universeId)
    return this.hydrateGames(universeIds, initialGames)
  }

  private static mapDiscoveryRecommendationToGamePayload(
    feed: DiscoveryHomeResponse,
    recommendation: DiscoveryRecommendation
  ) {
    const metadata = this.getDiscoveryGameMetadata(feed, recommendation)
    const universeId = metadata?.universeId ?? recommendation.contentId

    if (typeof universeId !== 'number') return null

    return {
      universeId,
      name: metadata?.name || recommendation.contentStringId || 'Unknown',
      playerCount: metadata?.playerCount || 0,
      totalVisits: 0,
      description: metadata?.description || '',
      totalUpVotes: metadata?.totalUpVotes || 0,
      totalDownVotes: metadata?.totalDownVotes || 0,
      rootPlaceId: metadata?.rootPlaceId
    }
  }

  private static getDiscoveryGameMetadata(
    feed: DiscoveryHomeResponse,
    recommendation: DiscoveryRecommendation
  ): DiscoveryGameMetadata | undefined {
    if (typeof recommendation.contentId !== 'number') return undefined
    return feed.contentMetadata?.Game?.[String(recommendation.contentId)]
  }

  private static async hydrateGames(universeIds: number[], initialData: any[]) {
    if (universeIds.length === 0) return []

    const orderedUniverseIds: number[] = []
    const seenUniverseIds = new Set<number>()

    for (const id of universeIds) {
      if (typeof id !== 'number' || seenUniverseIds.has(id)) continue
      seenUniverseIds.add(id)
      orderedUniverseIds.push(id)
    }

    if (orderedUniverseIds.length === 0) return []

    const chunk = (arr: any[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      )

    const detailsMap: Record<number, GameDetails> = {}

    try {
      const chunks = chunk(orderedUniverseIds, 50)

      for (const ids of chunks) {
        try {
          const detailsResult = await request(z.object({ data: z.array(gameDetailsSchema) }), {
            url: `https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`
          })
          const detailsData = detailsResult.data || []

          detailsData.forEach((d: GameDetails) => {
            detailsMap[d.id] = d
          })
        } catch (err: any) {
          console.error('Failed to fetch game details chunk', err)
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (e) {
      console.error('Failed to fetch game details', e)
    }

    const thumbnailsMap: Record<number, string> = {}

    try {
      const chunks = chunk(orderedUniverseIds, 50)
      for (const ids of chunks) {
        try {
          const thumbResult = await request(z.object({ data: z.array(gameThumbnailSchema) }), {
            url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(',')}&size=150x150&format=Png&isCircular=false`
          })
          const thumbData = thumbResult.data || []

          thumbData.forEach((t: any) => {
            if (t.imageUrl) {
              thumbnailsMap[t.targetId] = t.imageUrl
            }
          })
        } catch (err) {
          console.error('Failed to fetch game thumbnails chunk', err)
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    } catch (e) {
      console.error('Failed to fetch game thumbnails', e)
    }

    const votesMap: Record<number, { up: number; down: number }> = {}
    if (initialData.length === 0) {
      try {
        const chunks = chunk(orderedUniverseIds, 50)
        for (const ids of chunks) {
          try {
            const votesResult = await request(z.object({ data: z.array(gameVoteSchema) }), {
              url: `https://games.roblox.com/v1/games/votes?universeIds=${ids.join(',')}`
            })
            const votesData = votesResult.data || []

            votesData.forEach((v: any) => {
              const votes = { up: v.upVotes, down: v.downVotes }
              votesMap[v.id] = votes
            })
          } catch (err) {
            console.error('Failed to fetch game votes chunk', err)
          }
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      } catch (e) {
        console.error('Failed to fetch game votes', e)
      }
    }

    if (initialData.length === 0) {
      initialData = orderedUniverseIds
        .map((id) => {
          const d = detailsMap[id]
          if (!d) return null

          return {
            universeId: d.id,
            name: d.name,
            playerCount: d.playing,
            totalVisits: d.visits,
            description: d.description,
            totalUpVotes: 0,
            totalDownVotes: 0
          }
        })
        .filter(Boolean)
    }

    return initialData.map((g: any) => {
      const d = detailsMap[g.universeId]
      const thumb = thumbnailsMap[g.universeId]

      const ageRating = d?.genre === 'All' || d?.isAllGenre ? 'All Ages' : 'Not rated'

      const supportedDevices = ['PC']
      const supportsVoiceChat = null

      return {
        id: g.universeId.toString(),
        universeId: g.universeId.toString(),
        placeId: d?.rootPlaceId?.toString() || '',
        name: g.name,
        creatorName: d?.creator?.name || 'Unknown',
        creatorId: d?.creator?.id?.toString() || '',
        creatorType: d?.creator?.type || '',
        playing: d?.playing || g.playerCount || 0,
        visits: d?.visits || g.totalVisits || 0,
        maxPlayers: d?.maxPlayers || 0,
        genre: d?.genre || 'Unknown',
        description: d?.description || g.description || '',
        likes: votesMap[g.universeId]?.up ?? g.totalUpVotes ?? 0,
        dislikes: votesMap[g.universeId]?.down ?? g.totalDownVotes ?? 0,
        thumbnailUrl: thumb || '',
        created: d?.created || '',
        updated: d?.updated || '',
        creatorHasVerifiedBadge: d?.creator?.hasVerifiedBadge || false,
        ageRating,
        supportedDevices,
        supportsVoiceChat,
        lastServerJobId: null,
        friendsPlayingCount: null
      }
    })
  }

  static async getGamesByPlaceIds(placeIds: string[], cookie?: string) {
    if (!placeIds || placeIds.length === 0) return []

    const placeIdToUniverseId: Record<string, number> = {}

    const chunk = (arr: any[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      )
    const placeIdChunks = chunk(placeIds, 50)

    try {
      await Promise.all(
        placeIdChunks.map(async (ids) => {
          const result = await request(z.array(placeDetailsSchema), {
            url: `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${ids.join(',')}`,
            headers: { accept: 'application/json' },
            cookie
          })
          if (result) {
            result.forEach((item) => {
              if (item.placeId && item.universeId) {
                placeIdToUniverseId[String(item.placeId)] = item.universeId
              }
            })
          }
        })
      )
    } catch (e) {
      console.error('Failed to convert placeIds to universeIds', e)
      return []
    }

    const orderedUniverseIds: number[] = []
    const seenUniverseIds = new Set<number>()

    for (const placeId of placeIds) {
      const universeId = placeIdToUniverseId[placeId]
      if (typeof universeId !== 'number' || seenUniverseIds.has(universeId)) continue
      seenUniverseIds.add(universeId)
      orderedUniverseIds.push(universeId)
    }

    if (orderedUniverseIds.length === 0) return []

    return this.hydrateGames(orderedUniverseIds, [])
  }

  static async getUniverseIdFromPlaceId(placeId: number, cookie?: string): Promise<number | null> {
    try {
      const result = await request(z.array(placeDetailsSchema), {
        url: `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`,
        headers: {
          accept: 'application/json'
        },
        cookie
      })
      if (result && result.length > 0) {
        return result[0].universeId || null
      }
    } catch (e) {
      console.error('Failed to convert placeId to universeId', e)
    }
    return null
  }

  static async getGameServers(
    placeId: string | number,
    cursor?: string,
    limit: number = 100,
    sortOrder: 'Asc' | 'Desc' = 'Desc',
    excludeFullGames: boolean = false,
    cookie?: string
  ) {
    try {
      return await request(pagedServerSchema, {
        url: `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=${limit}&sortOrder=${sortOrder}${cursor ? `&cursor=${cursor}` : ''}${excludeFullGames ? '&excludeFullGames=true' : ''}`,
        cookie
      })
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.warn(`getGameServers returned 404 for ${placeId}, trying with Universe ID...`)
        const universeId = await this.getUniverseIdFromPlaceId(Number(placeId), cookie)
        if (universeId && universeId !== Number(placeId)) {
          return await request(pagedServerSchema, {
            url: `https://games.roblox.com/v1/games/${universeId}/servers/Public?limit=${limit}&sortOrder=${sortOrder}${cursor ? `&cursor=${cursor}` : ''}${excludeFullGames ? '&excludeFullGames=true' : ''}`,
            cookie
          })
        }
      }
      throw error
    }
  }

  static async getPrivateServers(
    placeId: string | number,
    cursor?: string,
    limit: number = 100,
    sortOrder: 'Asc' | 'Desc' = 'Desc',
    cookie?: string
  ) {
    const url = `https://games.roblox.com/v1/games/${placeId}/private-servers?limit=${limit}&sortOrder=${sortOrder}${cursor ? `&cursor=${cursor}` : ''}`

    console.info('[RobloxGameService.getPrivateServers] Requesting private servers', {
      placeId,
      cursor: cursor ?? null,
      limit,
      sortOrder,
      hasCookie: Boolean(cookie),
      cookieLength: cookie?.length ?? 0,
      url
    })

    try {
      const response = await safeRequest<unknown>({
        url,
        cookie,
        skipHba: true,
        headers: {
          accept: 'application/json'
        }
      })

      const parsed = pagedPrivateServerSchema.safeParse(response)
      if (!parsed.success) {
        console.error('[RobloxGameService.getPrivateServers] Response schema parse failed', {
          placeId,
          issues: parsed.error.issues,
          responsePreview: JSON.stringify(response).slice(0, 2000)
        })
        throw parsed.error
      }

      console.info('[RobloxGameService.getPrivateServers] Private servers loaded', {
        placeId,
        count: parsed.data.data.length,
        nextPageCursor: parsed.data.nextPageCursor,
        gameJoinRestricted: parsed.data.gameJoinRestricted ?? null
      })

      return parsed.data
    } catch (error) {
      if (error instanceof RequestError) {
        console.error('[RobloxGameService.getPrivateServers] Request failed', {
          placeId,
          statusCode: error.statusCode,
          headers: error.headers,
          bodyPreview: error.body?.slice(0, 2000)
        })
      } else {
        console.error('[RobloxGameService.getPrivateServers] Unexpected failure', {
          placeId,
          error
        })
      }

      throw error
    }
  }

  static async getJoinScript(placeId: string | number, serverId: string, cookie: string) {
    return requestWithCsrf(
      z
        .object({
          joinScript: z
            .object({
              UdmuxEndpoints: z
                .array(
                  z.object({
                    Address: z.string()
                  })
                )
                .optional()
            })
            .nullish(),
          status: z.number().optional()
        })
        .passthrough(),
      {
        url: 'https://gamejoin.roblox.com/v1/join-game-instance',
        method: 'POST',
        body: {
          placeId: Number(placeId),
          isTeleport: false,
          gameId: serverId,
          gameJoinAttemptId: serverId
        },
        cookie,
        headers: {
          'X-Roblox-Place-Id': placeId.toString(),
          'User-Agent': 'Roblox/WinInet'
        }
      }
    )
  }

  static async getRegionFromAddress(address: string) {
    let cleanIp = address
    if (address.includes('.') && address.includes(':')) {
      cleanIp = address.split(':')[0]
    } else if (address.startsWith('[') && address.includes(']:')) {
      const match = address.match(/^\[(.*?)\]/)
      if (match) cleanIp = match[1]
    }

    try {
      const geoResult = await request(
        z.object({
          status: z.string(),
          countryCode: z.string().optional(),
          regionName: z.string().optional(),
          region: z.string().optional()
        }),
        {
          url: `http://ip-api.com/json/${cleanIp}`
        }
      )
      let region = 'Unknown'
      if (geoResult && geoResult.status === 'success') {
        region = `${geoResult.countryCode}, ${geoResult.regionName || geoResult.region}`
      }
      return region
    } catch (e) {
      console.error('Failed to lookup IP', e)
      return 'Unknown'
    }
  }

  static async getServerQueuePosition(
    placeId: string | number,
    serverId: string,
    cookie: string
  ): Promise<number | null> {
    try {
      const joinResult = await requestWithCsrf(
        z
          .object({
            queuePosition: z.number().nullish()
          })
          .passthrough(),
        {
          url: 'https://gamejoin.roblox.com/v1/join-game-instance',
          method: 'POST',
          body: {
            placeId: Number(placeId),
            gameId: serverId,
            gameJoinAttemptId: randomUUID(),
            joinOrigin: 'QueueInfo'
          },
          cookie,
          headers: {
            'X-Roblox-Place-Id': placeId.toString(),
            'User-Agent': 'Roblox/WinInet'
          }
        }
      )

      if (typeof joinResult.queuePosition === 'number') {
        return joinResult.queuePosition
      }

      return null
    } catch (error) {
      console.error('[RobloxGameService] Failed to get queue position', error)
      return null
    }
  }

  static async getGameSocialLinks(universeId: number, cookie?: string) {
    try {
      const result = await request(socialLinksResponseSchema, {
        url: `https://games.roblox.com/v1/games/${universeId}/social-links/list`,
        cookie
      })
      return result.data || []
    } catch (e) {
      console.error('Failed to fetch social links', e)
      return []
    }
  }

  static async voteOnGame(placeId: number, vote: boolean | null, cookie: string) {
    try {
      const result = await requestWithCsrf(voteResponseSchema, {
        url: `https://apis.roblox.com/voting-api/vote/asset/${placeId}?vote=${vote}`,
        method: 'POST',
        cookie
      })
      return result
    } catch (e) {
      console.error('Failed to vote on game', e)
      throw e
    }
  }

  static async getGamePasses(universeId: number, cookie?: string, pageSize: number = 50) {
    try {
      const result = await request(gamePassesResponseSchema, {
        url: `https://apis.roblox.com/game-passes/v1/universes/${universeId}/game-passes?pageSize=${pageSize}&passView=Full`,
        cookie
      })
      return result
    } catch (e) {
      console.error('Failed to fetch game passes', e)
      return { gamePasses: [], nextPageToken: null }
    }
  }

  static async purchaseGamePass(
    cookie: string,
    productId: number,
    expectedPrice: number,
    expectedSellerId: number,
    expectedPurchaserId?: string,
    idempotencyKey?: string
  ) {
    const purchaseResponseSchema = z
      .object({
        purchased: z.boolean().optional(),
        reason: z.string().optional(),
        errorMessage: z.string().optional(),
        shortMessage: z.string().optional(),
        statusCode: z.number().optional()
      })
      .passthrough()

    const body: Record<string, any> = {
      expectedCurrency: 1,
      expectedPrice,
      expectedSellerId,
      expectedSellerType: 'User'
    }

    if (expectedPurchaserId) {
      body.expectedPurchaserId = Number(expectedPurchaserId)
      body.expectedPurchaserType = 'User'
    }

    if (idempotencyKey) {
      body.idempotencyKey = idempotencyKey
    }

    return requestWithCsrf(purchaseResponseSchema, {
      method: 'POST',
      url: `https://economy.roblox.com/v1/purchases/products/${productId}`,
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }

  /**
   * Fetch avatar headshot thumbnails for player tokens (from game servers).
   * Sends a POST to the Roblox thumbnails batch endpoint.
   * Batches are capped at 100 tokens per request.
   */
  static async getPlayerThumbnailsByTokens(
    playerTokens: string[]
  ): Promise<{ requestId: string; token: string; imageUrl: string | null; errorCode: number; errorMessage: string }[]> {
    if (!playerTokens.length) return []

    const BATCH_SIZE = 100
    const results: { requestId: string; token: string; imageUrl: string | null; errorCode: number; errorMessage: string }[] = []

    for (let i = 0; i < playerTokens.length; i += BATCH_SIZE) {
      const chunk = playerTokens.slice(i, i + BATCH_SIZE)
      const body = chunk.map((token) => ({
        requestId: `${token}:undefined:AvatarHeadShot:420x420:png:circular`,
        token,
        type: 'AvatarHeadShot',
        size: '150x150',
        format: null,
        isCircular: true
      }))

      try {
        const response = await safeRequest<{ data: { requestId: string; imageUrl: string | null; errorCode: number; errorMessage: string }[] }>({
          method: 'POST',
          url: 'https://thumbnails.roblox.com/v1/batch',
          body,
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (response.data) {
          for (const entry of response.data) {
            const token = chunk.find((t) => entry.requestId.startsWith(t)) || ''
            results.push({
              requestId: entry.requestId,
              token,
              imageUrl: entry.imageUrl,
              errorCode: entry.errorCode,
              errorMessage: entry.errorMessage
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch player thumbnails batch', error)
      }
    }

    return results
  }
}
