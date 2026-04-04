import { z } from 'zod'
import { defineProcedure } from '../core'

export const gamesContracts = {
    getGameSorts: defineProcedure(z.tuple([z.string().optional()])),
    getGamesInSort: defineProcedure(z.tuple([z.string(), z.string().optional()])),
    getGamesByPlaceIds: defineProcedure(z.tuple([z.array(z.string())])),
    getGamesByUniverseIds: defineProcedure(z.tuple([z.array(z.number())])),
    getGameThumbnail16x9: defineProcedure(z.tuple([z.number()])),
    getGameIconThumbnail: defineProcedure(z.tuple([z.number()])),
    searchGames: defineProcedure(z.tuple([z.string(), z.string().optional()])),
    getRecentlyPlayedGames: defineProcedure(z.tuple([z.string().optional()])),
    launchGame: defineProcedure(
        z.tuple([
            z.string(),
            z.union([z.string(), z.number()]),
            z.string().optional(),
            z.union([z.string(), z.number()]).optional(),
            z.string().optional(),
            z.string().optional()
        ])
    ),
    getGameServers: defineProcedure(
        z.tuple([
            z.union([z.string(), z.number()]),
            z.string().optional(),
            z.number().optional(),
            z.enum(['Asc', 'Desc']).optional(),
            z.boolean().optional()
        ])
    ),
    getPrivateServers: defineProcedure(
        z.tuple([
            z.union([z.string(), z.number()]),
            z.string().optional(),
            z.number().optional(),
            z.enum(['Asc', 'Desc']).optional()
        ])
    ),
    getJoinScript: defineProcedure(z.tuple([z.union([z.string(), z.number()]), z.string()])),
    getServerQueuePosition: defineProcedure(z.tuple([z.union([z.string(), z.number()]), z.string()])),
    getRegionFromAddress: defineProcedure(z.tuple([z.string()])),
    getGameSocialLinks: defineProcedure(z.tuple([z.number()])),
    voteOnGame: defineProcedure(z.tuple([z.number(), z.boolean().nullable()])),
    getGamePasses: defineProcedure(z.tuple([z.number()])),
    purchaseGamePass: defineProcedure(
        z.tuple([
            z.string(),
            z.number(),
            z.number(),
            z.number(),
            z.string().optional(),
            z.string().optional()
        ])
    ),
    saveGameImage: defineProcedure(z.tuple([z.string(), z.string()]))
} as const