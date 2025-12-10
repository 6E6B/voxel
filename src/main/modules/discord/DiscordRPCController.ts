import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { discordRPCService } from './DiscordRPCService'

function handle<T extends any[]>(
  channel: string,
  schema: z.ZodTuple<any, any>,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any>
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const validated = schema.parse(args) as T
      return await handler(event, ...validated)
    } catch (err) {
      console.error(`IPC Validation Error on ${channel}:`, err)
      throw err
    }
  })
}

export const registerDiscordRPCHandlers = (): void => {
  handle('discord-rpc-enable', z.tuple([]), async () => {
    return await discordRPCService.enable()
  })

  handle('discord-rpc-disable', z.tuple([]), async () => {
    await discordRPCService.disable()
  })

  handle('discord-rpc-get-state', z.tuple([]), async () => {
    return discordRPCService.getState()
  })

  handle('discord-rpc-set-tab', z.tuple([z.string().nullable()]), async (_, tabId) => {
    discordRPCService.setCurrentTab(tabId)
  })

  handle('discord-rpc-is-enabled', z.tuple([]), async () => {
    return discordRPCService.getIsEnabled()
  })
}
