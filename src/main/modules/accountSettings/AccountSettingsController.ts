import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { AccountSettingsService } from './AccountSettingsService'
import {
  privacyLevelValues,
  tradePrivacyValues,
  tradeValueValues,
  contentRestrictionLevelValues,
  onlineStatusPrivacyValues
} from '@shared/ipc-schemas/accountSettings'

/**
 * Registers IPC handlers for account settings
 */
export const registerAccountSettingsHandlers = (): void => {
  // GET handlers
  handle('get-account-settings-json', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getAccountSettingsJson(cookie)
  })

  handle('get-user-settings-and-options', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getUserSettingsAndOptions(cookie)
  })

  handle('get-combined-account-settings', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getCombinedSettings(cookie)
  })

  handle('get-theme-types', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getThemeTypes(cookie)
  })

  // UPDATE handlers
  handle(
    'update-inventory-privacy',
    z.tuple([z.string(), z.enum(privacyLevelValues)]),
    async (_, cookie, privacyLevel) => {
      return AccountSettingsService.updateInventoryPrivacy(cookie, privacyLevel)
    }
  )

  handle(
    'update-trade-privacy',
    z.tuple([z.string(), z.enum(tradePrivacyValues)]),
    async (_, cookie, tradePrivacy) => {
      return AccountSettingsService.updateTradePrivacy(cookie, tradePrivacy)
    }
  )

  handle(
    'update-trade-value',
    z.tuple([z.string(), z.enum(tradeValueValues)]),
    async (_, cookie, tradeValue) => {
      return AccountSettingsService.updateTradeValue(cookie, tradeValue)
    }
  )

  handle(
    'update-app-chat-privacy',
    z.tuple([z.string(), z.enum(privacyLevelValues)]),
    async (_, cookie, appChatPrivacy) => {
      return AccountSettingsService.updateAppChatPrivacy(cookie, appChatPrivacy)
    }
  )

  handle(
    'update-game-chat-privacy',
    z.tuple([z.string(), z.enum(privacyLevelValues)]),
    async (_, cookie, gameChatPrivacy) => {
      return AccountSettingsService.updateGameChatPrivacy(cookie, gameChatPrivacy)
    }
  )

  handle(
    'update-privacy',
    z.tuple([z.string(), z.enum(privacyLevelValues)]),
    async (_, cookie, phoneDiscovery) => {
      return AccountSettingsService.updatePrivacy(cookie, phoneDiscovery)
    }
  )

  handle(
    'update-theme',
    z.tuple([z.string(), z.number(), z.string()]),
    async (_, cookie, userId, themeType) => {
      return AccountSettingsService.updateTheme(cookie, userId, themeType)
    }
  )

  handle(
    'update-content-restriction',
    z.tuple([z.string(), z.enum(contentRestrictionLevelValues)]),
    async (_, cookie, contentRestrictionLevel) => {
      return AccountSettingsService.updateContentRestriction(cookie, contentRestrictionLevel)
    }
  )

  handle(
    'update-online-status-privacy',
    z.tuple([z.string(), z.enum(onlineStatusPrivacyValues)]),
    async (_, cookie, onlineStatusPrivacy) => {
      return AccountSettingsService.updateOnlineStatusPrivacy(cookie, onlineStatusPrivacy)
    }
  )

  handle(
    'send-verification-email',
    z.tuple([z.string(), z.boolean().optional()]),
    async (_, cookie, freeItem) => {
      return AccountSettingsService.sendVerificationEmail(cookie, freeItem ?? false)
    }
  )

  handle('redeem-promo-code', z.tuple([z.string(), z.string()]), async (_, cookie, code) => {
    return AccountSettingsService.redeemPromoCode(cookie, code)
  })

  // ============================================================================
  // ACCOUNT INFORMATION API HANDLERS
  // ============================================================================

  // Description handlers
  handle('get-description', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getDescription(cookie)
  })

  handle(
    'update-description',
    z.tuple([z.string(), z.string()]),
    async (_, cookie, description) => {
      return AccountSettingsService.updateDescription(cookie, description)
    }
  )

  // Gender handlers
  handle('get-gender', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getGender(cookie)
  })

  handle('update-gender', z.tuple([z.string(), z.string()]), async (_, cookie, gender) => {
    return AccountSettingsService.updateGender(cookie, gender)
  })

  // Birthdate handlers
  handle('get-birthdate', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getBirthdate(cookie)
  })

  handle(
    'update-birthdate',
    z.tuple([z.string(), z.number(), z.number(), z.number()]),
    async (_, cookie, birthMonth, birthDay, birthYear) => {
      return AccountSettingsService.updateBirthdate(cookie, birthMonth, birthDay, birthYear)
    }
  )

  // Promotion channels handlers
  handle('get-promotion-channels', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getPromotionChannels(cookie)
  })

  handle(
    'update-promotion-channels',
    z.tuple([
      z.string(),
      z.object({
        facebook: z.string().optional(),
        twitter: z.string().optional(),
        youtube: z.string().optional(),
        twitch: z.string().optional(),
        promotionChannelsVisibilityPrivacy: z.string().optional()
      })
    ]),
    async (_, cookie, channels) => {
      return AccountSettingsService.updatePromotionChannels(cookie, channels)
    }
  )

  // Star code affiliate handlers
  handle('get-star-code-affiliate', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.getStarCodeAffiliate(cookie)
  })

  handle('add-star-code-affiliate', z.tuple([z.string(), z.string()]), async (_, cookie, code) => {
    return AccountSettingsService.addStarCodeAffiliate(cookie, code)
  })

  handle('remove-star-code-affiliate', z.tuple([z.string()]), async (_, cookie) => {
    return AccountSettingsService.removeStarCodeAffiliate(cookie)
  })
}
