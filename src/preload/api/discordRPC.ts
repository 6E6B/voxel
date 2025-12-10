import { z } from 'zod'
import { invoke } from './invoke'

const discordPresenceStateSchema = z.object({
  isEnabled: z.boolean(),
  isConnected: z.boolean(),
  currentGame: z
    .object({
      name: z.string(),
      placeId: z.string(),
      thumbnailUrl: z.string().optional()
    })
    .nullable(),
  currentTab: z.string().nullable()
})

export const discordRPCApi = {
  enableDiscordRPC: () => invoke('discord-rpc-enable', z.boolean()),
  disableDiscordRPC: () => invoke('discord-rpc-disable', z.void()),
  getDiscordRPCState: () => invoke('discord-rpc-get-state', discordPresenceStateSchema),
  setDiscordRPCTab: (tabId: string | null) => invoke('discord-rpc-set-tab', z.void(), tabId),
  isDiscordRPCEnabled: () => invoke('discord-rpc-is-enabled', z.boolean())
}
