import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { storageService } from './StorageService'
import { accountSchema } from '../../../shared/ipc-schemas/user'
import { favoriteItemSchema } from '../../../shared/ipc-schemas/avatar'
import { settingsPatchSchema } from '../../../shared/ipc-schemas/system'

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

export const registerStorageHandlers = (): void => {
  handle('get-sidebar-width', z.tuple([]), async () => {
    return storageService.getSidebarWidth()
  })

  handle('set-sidebar-width', z.tuple([z.number()]), async (_, width) => {
    storageService.setSidebarWidth(width)
  })

  handle('get-sidebar-collapsed', z.tuple([]), async () => {
    return storageService.getSidebarCollapsed()
  })

  handle('set-sidebar-collapsed', z.tuple([z.boolean()]), async (_, collapsed) => {
    storageService.setSidebarCollapsed(collapsed)
  })

  handle('get-accounts-view-mode', z.tuple([]), async () => {
    return storageService.getAccountsViewMode()
  })

  handle('set-accounts-view-mode', z.tuple([z.enum(['list', 'grid'])]), async (_, mode) => {
    storageService.setAccountsViewMode(mode)
  })

  handle('get-accounts', z.tuple([]), async () => {
    return storageService.getAccounts()
  })

  handle('save-accounts', z.tuple([z.array(accountSchema)]), async (_, accounts) => {
    storageService.saveAccounts(accounts)
  })

  handle('get-favorite-games', z.tuple([]), async () => {
    return storageService.getFavoriteGames()
  })

  handle('add-favorite-game', z.tuple([z.string()]), async (_, placeId) => {
    storageService.addFavoriteGame(placeId)
  })

  handle('remove-favorite-game', z.tuple([z.string()]), async (_, placeId) => {
    storageService.removeFavoriteGame(placeId)
  })

  handle('get-favorite-items', z.tuple([]), async () => {
    return storageService.getFavoriteItems()
  })

  handle('add-favorite-item', z.tuple([favoriteItemSchema]), async (_, item) => {
    storageService.addFavoriteItem(item)
  })

  handle('remove-favorite-item', z.tuple([z.number()]), async (_, itemId) => {
    storageService.removeFavoriteItem(itemId)
  })

  handle('get-settings', z.tuple([]), async () => {
    return storageService.getSettings()
  })

  handle('set-settings', z.tuple([settingsPatchSchema]), async (_, settings) => {
    storageService.setSettings(settings)
  })

  handle('get-exclude-full-games', z.tuple([]), async () => {
    return storageService.getExcludeFullGames()
  })

  handle('set-exclude-full-games', z.tuple([z.boolean()]), async (_, excludeFullGames) => {
    storageService.setExcludeFullGames(excludeFullGames)
  })

  handle('get-avatar-render-width', z.tuple([]), async () => {
    return storageService.getAvatarRenderWidth()
  })

  handle('set-avatar-render-width', z.tuple([z.number()]), async (_, width) => {
    storageService.setAvatarRenderWidth(width)
  })

  handle('get-window-width', z.tuple([]), async () => {
    return storageService.getWindowWidth()
  })

  handle('set-window-width', z.tuple([z.number()]), async (_, width) => {
    storageService.setWindowWidth(width)
  })

  handle('get-window-height', z.tuple([]), async () => {
    return storageService.getWindowHeight()
  })

  handle('set-window-height', z.tuple([z.number()]), async (_, height) => {
    storageService.setWindowHeight(height)
  })

  handle(
    'verify-pin',
    z.tuple([
      z
        .string()
        .length(6)
        .regex(/^\d{6}$/)
    ]),
    async (_, pin) => {
      return storageService.verifyPin(pin)
    }
  )

  handle('is-pin-verified', z.tuple([]), async () => {
    return storageService.isPinCurrentlyVerified()
  })

  handle(
    'set-pin',
    z.tuple([
      z.object({
        newPin: z.union([
          z
            .string()
            .length(6)
            .regex(/^\d{6}$/),
          z.null()
        ]),
        currentPin: z
          .string()
          .length(6)
          .regex(/^\d{6}$/)
          .optional()
      })
    ]),
    async (_, { newPin, currentPin }) => {
      return storageService.setPin(newPin, currentPin)
    }
  )

  handle('get-pin-lockout-status', z.tuple([]), async () => {
    return storageService.getPinLockoutStatus()
  })

  handle('get-custom-fonts', z.tuple([]), async () => {
    return storageService.getCustomFonts()
  })

  handle(
    'add-custom-font',
    z.tuple([z.object({ family: z.string(), url: z.string() })]),
    async (_, font) => {
      storageService.addCustomFont(font)
    }
  )

  handle('remove-custom-font', z.tuple([z.string()]), async (_, family) => {
    storageService.removeCustomFont(family)
  })

  handle('get-active-font', z.tuple([]), async () => {
    return storageService.getActiveFont()
  })

  handle('set-active-font', z.tuple([z.string().nullable()]), async (_, family) => {
    storageService.setActiveFont(family)
  })
}
