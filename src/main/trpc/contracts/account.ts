import { z } from 'zod'
import { accountSchema } from '@shared/contracts/user'
import { defineProcedure } from '../core'

export const accountContracts = {
    validateCookie: defineProcedure(z.tuple([z.string()])),
    fetchAccountStats: defineProcedure(z.tuple([z.string()])),
    getAccountStatus: defineProcedure(z.tuple([z.string()])),
    getVoiceSettings: defineProcedure(z.tuple([z.string()])),
    getBatchAccountStatuses: defineProcedure(z.tuple([z.array(z.string())])),
    getAccounts: defineProcedure(z.tuple([])),
    saveAccounts: defineProcedure(z.tuple([z.array(accountSchema)]))
} as const

export const authContracts = {
    generateQuickLoginCode: defineProcedure(z.tuple([])),
    checkQuickLoginStatus: defineProcedure(z.tuple([z.string(), z.string()])),
    completeQuickLogin: defineProcedure(z.tuple([z.string(), z.string()]))
} as const