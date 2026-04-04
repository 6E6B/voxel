import { z } from 'zod'
import { defineProcedure } from '../core'

export const appContracts = {
    redeemPromoCode: defineProcedure(z.tuple([z.string(), z.string()])),
    checkForUpdates: defineProcedure(z.tuple([])),
    downloadUpdate: defineProcedure(z.tuple([])),
    installUpdate: defineProcedure(z.tuple([])),
    getUpdaterState: defineProcedure(z.tuple([])),
    enableDiscordRPC: defineProcedure(z.tuple([])),
    disableDiscordRPC: defineProcedure(z.tuple([])),
    getDiscordRPCState: defineProcedure(z.tuple([])),
    setDiscordRPCTab: defineProcedure(z.tuple([z.string().nullable()])),
    isDiscordRPCEnabled: defineProcedure(z.tuple([]))
} as const