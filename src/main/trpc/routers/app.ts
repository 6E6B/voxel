import { z } from 'zod'
import { safeRequest, safeRequestWithCsrf } from '@main/lib/request'
import { robloxFetchOptionsSchema } from '@shared/contracts/robloxFetch'
import { extractCookie } from '@main/modules/core/auth'
import { TransactionService } from '@main/modules/transactions/TransactionService'
import { updaterService } from '@main/modules/updater/UpdaterService'
import { discordRPCService } from '@main/modules/discord/DiscordRPCService'
import { appContracts } from '../contracts/app'
import { router, contractMutation, authContractMutation, procedure } from '../core'

const ALLOWED_FETCH_HOSTS = ['roblox.com', 'rbxcdn.com', 'roblox.cn', 'rolimons.com']

function isAllowedUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString)
        if (url.protocol !== 'https:') return false
        return ALLOWED_FETCH_HOSTS.some(
            (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
        )
    } catch {
        return false
    }
}

export const appSupportRouter = router({
    redeemPromoCode: authContractMutation(appContracts.redeemPromoCode, async (_ctx, cookie, code) => {
        return TransactionService.redeemPromoCode(cookie, code)
    }),
    checkForUpdates: contractMutation(appContracts.checkForUpdates, async () => {
        return updaterService.checkForUpdates()
    }),
    downloadUpdate: contractMutation(appContracts.downloadUpdate, async () => {
        await updaterService.downloadUpdate()
        return { success: true }
    }),
    installUpdate: contractMutation(appContracts.installUpdate, async () => {
        updaterService.quitAndInstall()
        return { success: true }
    }),
    getUpdaterState: contractMutation(appContracts.getUpdaterState, async () => {
        return updaterService.getState()
    }),
    enableDiscordRPC: contractMutation(appContracts.enableDiscordRPC, async () => {
        return discordRPCService.enable()
    }),
    disableDiscordRPC: contractMutation(appContracts.disableDiscordRPC, async () => {
        await discordRPCService.disable()
    }),
    getDiscordRPCState: contractMutation(appContracts.getDiscordRPCState, async () => {
        return discordRPCService.getState()
    }),
    setDiscordRPCTab: contractMutation(appContracts.setDiscordRPCTab, async (_ctx, tabId) => {
        discordRPCService.setCurrentTab(tabId)
    }),
    isDiscordRPCEnabled: contractMutation(appContracts.isDiscordRPCEnabled, async () => {
        return discordRPCService.getIsEnabled()
    }),
    robloxFetch: procedure.input(z.tuple([robloxFetchOptionsSchema])).mutation(async ({ input }) => {
        const [options] = input

        if (!isAllowedUrl(options.url)) {
            throw new Error('Blocked request to disallowed host')
        }

        const requestOpts = {
            url: options.url,
            method: options.method,
            cookie: options.cookie ? extractCookie(options.cookie) : undefined,
            body: options.body,
            headers: options.headers
        }

        if (options.csrf) {
            return safeRequestWithCsrf(requestOpts)
        }

        return safeRequest(requestOpts)
    })
})