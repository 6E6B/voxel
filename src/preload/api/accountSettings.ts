import { invoke } from './invoke'
import { z } from 'zod'
import * as S from '../../shared/ipc-schemas/accountSettings'

const updateResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
})

export const accountSettingsApi = {
  // GET methods
  getAccountSettingsJson: (cookie: string) =>
    invoke('get-account-settings-json', S.accountSettingsJsonSchema, cookie),

  getUserSettingsAndOptions: (cookie: string) =>
    invoke('get-user-settings-and-options', S.userSettingsAndOptionsSchema, cookie),

  getCombinedAccountSettings: (cookie: string) =>
    invoke('get-combined-account-settings', S.combinedAccountSettingsSchema, cookie),

  getThemeTypes: (cookie: string) => invoke('get-theme-types', z.array(z.string()), cookie),

  // UPDATE methods
  updateInventoryPrivacy: (cookie: string, privacyLevel: S.PrivacyLevel) =>
    invoke('update-inventory-privacy', updateResultSchema, cookie, privacyLevel),

  updateTradePrivacy: (cookie: string, tradePrivacy: S.TradePrivacy) =>
    invoke('update-trade-privacy', updateResultSchema, cookie, tradePrivacy),

  updateTradeValue: (cookie: string, tradeValue: S.TradeValue) =>
    invoke('update-trade-value', updateResultSchema, cookie, tradeValue),

  updateAppChatPrivacy: (cookie: string, appChatPrivacy: S.PrivacyLevel) =>
    invoke('update-app-chat-privacy', updateResultSchema, cookie, appChatPrivacy),

  updateGameChatPrivacy: (cookie: string, gameChatPrivacy: S.PrivacyLevel) =>
    invoke('update-game-chat-privacy', updateResultSchema, cookie, gameChatPrivacy),

  updatePrivacy: (cookie: string, phoneDiscovery: S.PrivacyLevel) =>
    invoke('update-privacy', updateResultSchema, cookie, phoneDiscovery),

  updateTheme: (cookie: string, userId: number, themeType: string) =>
    invoke('update-theme', updateResultSchema, cookie, userId, themeType),

  updateContentRestriction: (cookie: string, level: S.ContentRestrictionLevel) =>
    invoke('update-content-restriction', updateResultSchema, cookie, level),

  updateOnlineStatusPrivacy: (cookie: string, privacy: S.OnlineStatusPrivacy) =>
    invoke('update-online-status-privacy', updateResultSchema, cookie, privacy),

  updateWhoCanJoinMeInExperiences: (cookie: string, privacy: S.PrivacyLevel) =>
    invoke('update-who-can-join-me-in-experiences', updateResultSchema, cookie, privacy),

  sendVerificationEmail: (cookie: string, freeItem?: boolean) =>
    invoke('send-verification-email', updateResultSchema, cookie, freeItem),

  redeemPromoCode: (cookie: string, code: string) =>
    invoke('redeem-promo-code', S.redeemPromoCodeResponseSchema, cookie, code),

  // ============================================================================
  // ACCOUNT INFORMATION API METHODS
  // ============================================================================

  // Description methods
  getDescription: (cookie: string) =>
    invoke('get-description', S.descriptionResponseSchema, cookie),

  updateDescription: (cookie: string, description: string) =>
    invoke('update-description', updateResultSchema, cookie, description),

  // Gender methods
  getGender: (cookie: string) => invoke('get-gender', S.genderResponseSchema, cookie),

  updateGender: (cookie: string, gender: string) =>
    invoke('update-gender', updateResultSchema, cookie, gender),

  // Birthdate methods
  getBirthdate: (cookie: string) => invoke('get-birthdate', S.birthdateResponseSchema, cookie),

  updateBirthdate: (cookie: string, birthMonth: number, birthDay: number, birthYear: number) =>
    invoke('update-birthdate', updateResultSchema, cookie, birthMonth, birthDay, birthYear),

  // Promotion channels methods
  getPromotionChannels: (cookie: string) =>
    invoke('get-promotion-channels', S.promotionChannelsResponseSchema, cookie),

  updatePromotionChannels: (
    cookie: string,
    channels: {
      facebook?: string
      twitter?: string
      youtube?: string
      twitch?: string
      promotionChannelsVisibilityPrivacy?: string
    }
  ) => invoke('update-promotion-channels', updateResultSchema, cookie, channels)
}
