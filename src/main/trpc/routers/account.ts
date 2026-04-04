import { RobloxAuthService } from '@main/modules/auth/RobloxAuthService'
import { RobloxUserService } from '@main/modules/users/UserService'
import { storageService } from '@main/modules/system/StorageService'
import { accountContracts, authContracts } from '../contracts/account'
import { router, contractMutation, authContractMutation } from '../core'
import { extractCookie } from '@main/modules/core/auth'

export const accountRouter = router({
    validateCookie: authContractMutation(accountContracts.validateCookie, async (_ctx, cookie) => {
        RobloxAuthService.validateCookieFormat(cookie)
        return RobloxUserService.getAuthenticatedUser(cookie)
    }),
    fetchAccountStats: authContractMutation(accountContracts.fetchAccountStats, async (_ctx, cookie) => {
        const authData = await RobloxUserService.getAuthenticatedUser(cookie)
        return RobloxUserService.getAccountStats(cookie, authData.id)
    }),
    getAccountStatus: authContractMutation(accountContracts.getAccountStatus, async (_ctx, cookie) => {
        const authData = await RobloxUserService.getAuthenticatedUser(cookie)
        return RobloxUserService.getPresence(cookie, authData.id)
    }),
    getVoiceSettings: authContractMutation(accountContracts.getVoiceSettings, async (_ctx, cookie) => {
        return RobloxUserService.getVoiceSettings(cookie)
    }),
    getBatchAccountStatuses: contractMutation(accountContracts.getBatchAccountStatuses, async (_ctx, cookieRaws) => {
        const cookieMap = new Map<string, string>()
        const extractedCookies: string[] = []

        for (const cookieRaw of cookieRaws) {
            const extracted = extractCookie(cookieRaw)
            cookieMap.set(cookieRaw, extracted)
            extractedCookies.push(extracted)
        }

        const results = await RobloxUserService.getBatchAccountStatuses(extractedCookies)

        const resultObj: Record<string, { userId: number; presence: any } | null> = {}
        for (const [originalCookie] of cookieMap.entries()) {
            const extractedCookie = cookieMap.get(originalCookie)!
            const data = results.get(extractedCookie) || null
            resultObj[originalCookie] = data
        }

        return resultObj
    }),
    getAccounts: contractMutation(accountContracts.getAccounts, async () => {
        return storageService.getAccounts()
    }),
    saveAccounts: contractMutation(accountContracts.saveAccounts, async (_ctx, accounts) => {
        storageService.saveAccounts(accounts)
    }),
    generateQuickLoginCode: contractMutation(authContracts.generateQuickLoginCode, async () => {
        return RobloxAuthService.generateQuickLoginCode()
    }),
    checkQuickLoginStatus: contractMutation(authContracts.checkQuickLoginStatus, async (_ctx, code, privateKey) => {
        return RobloxAuthService.checkQuickLoginStatus(code, privateKey)
    }),
    completeQuickLogin: contractMutation(authContracts.completeQuickLogin, async (_ctx, code, privateKey) => {
        return RobloxAuthService.completeQuickLogin(code, privateKey)
    })
})