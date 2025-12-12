import { z } from 'zod'

// ============================================================================
// ACCOUNT SETTINGS JSON SCHEMA (/my/settings/json)
// ============================================================================

export const myAccountSecurityModelSchema = z.object({
  IsEmailSet: z.boolean(),
  IsEmailVerified: z.boolean(),
  IsTwoStepEnabled: z.boolean(),
  ShowSignOutFromAllSessions: z.boolean(),
  TwoStepVerificationViewModel: z.object({
    UserId: z.number(),
    IsEnabled: z.boolean(),
    CodeLength: z.number(),
    ValidCodeCharacters: z.string().nullable()
  })
})

export const accountSettingsJsonSchema = z.object({
  ChangeUsernameEnabled: z.boolean(),
  IsAdmin: z.boolean(),
  UserId: z.number(),
  Name: z.string(),
  DisplayName: z.string(),
  IsEmailOnFile: z.boolean(),
  IsEmailVerified: z.boolean(),
  IsPhoneFeatureEnabled: z.boolean(),
  RobuxRemainingForUsernameChange: z.number(),
  PreviousUserNames: z.string(),
  UseSuperSafePrivacyMode: z.boolean(),
  IsAppChatSettingEnabled: z.boolean(),
  IsGameChatSettingEnabled: z.boolean(),
  IsParentalSpendControlsEnabled: z.boolean(),
  IsSetPasswordNotificationEnabled: z.boolean(),
  ChangePasswordRequiresTwoStepVerification: z.boolean(),
  ChangeEmailRequiresTwoStepVerification: z.boolean(),
  UserEmail: z.string(),
  UserEmailMasked: z.boolean(),
  UserEmailVerified: z.boolean(),
  CanHideInventory: z.boolean(),
  CanTrade: z.boolean(),
  MissingParentEmail: z.boolean(),
  IsUpdateEmailSectionShown: z.boolean(),
  IsUnder13UpdateEmailMessageSectionShown: z.boolean(),
  IsUserConnectedToFacebook: z.boolean(),
  IsTwoStepToggleEnabled: z.boolean(),
  AgeBracket: z.number(),
  UserAbove13: z.boolean(),
  ClientIpAddress: z.string(),
  AccountAgeInDays: z.number(),
  IsPremium: z.boolean(),
  IsBcRenewalMembership: z.boolean(),
  PremiumFeatureId: z.number().nullable(),
  HasCurrencyOperationError: z.boolean(),
  CurrencyOperationErrorMessage: z.string().nullable(),
  Tab: z.string().nullable(),
  ChangePassword: z.boolean(),
  IsAccountPinEnabled: z.boolean(),
  IsAccountRestrictionsFeatureEnabled: z.boolean(),
  IsAccountSettingsSocialNetworksV2Enabled: z.boolean(),
  IsUiBootstrapModalV2Enabled: z.boolean(),
  IsDateTimeI18nPickerEnabled: z.boolean(),
  InApp: z.boolean(),
  MyAccountSecurityModel: myAccountSecurityModelSchema,
  ApiProxyDomain: z.string(),
  AccountSettingsApiDomain: z.string(),
  AuthDomain: z.string(),
  IsDisconnectFacebookEnabled: z.boolean(),
  IsDisconnectXboxEnabled: z.boolean(),
  NotificationSettingsDomain: z.string(),
  AllowedNotificationSourceTypes: z.array(z.string()),
  AllowedReceiverDestinationTypes: z.array(z.string()),
  BlacklistedNotificationSourceTypesForMobilePush: z.array(z.string()),
  MinimumChromeVersionForPushNotifications: z.number(),
  PushNotificationsEnabledOnFirefox: z.boolean(),
  LocaleApiDomain: z.string(),
  HasValidPasswordSet: z.boolean(),
  IsFastTrackAccessible: z.boolean(),
  IsAgeDownEnabled: z.boolean(),
  IsDisplayNamesEnabled: z.boolean(),
  IsBirthdateLocked: z.boolean()
})

export type AccountSettingsJson = z.infer<typeof accountSettingsJsonSchema>

// ============================================================================
// USER SETTINGS API SCHEMA (/user-settings-api/v1/user-settings/settings-and-options)
// ============================================================================

const settingOptionSchema = z.object({
  optionValue: z.string().optional(),
  optionType: z.string().optional()
})

const settingOptionWithRequirementSchema = z.object({
  option: settingOptionSchema,
  requirement: z.string().optional()
})

const stringSettingSchema = z.object({
  currentValue: z.string(),
  options: z.array(settingOptionWithRequirementSchema)
})

const timeWindowSettingSchema = z.object({
  currentValue: z.object({
    startTimeMinutes: z.number(),
    endTimeMinutes: z.number()
  }),
  options: z.array(settingOptionWithRequirementSchema)
})

const optionalSettingSchema = z.object({
  currentValue: z.string().optional(),
  options: z.array(settingOptionWithRequirementSchema)
})

export const userSettingsAndOptionsSchema = z.object({
  contentAgeRestriction: stringSettingSchema.optional(),
  privateServerJoinRestriction: stringSettingSchema.optional(),
  themeType: stringSettingSchema.optional(),
  phoneNumberDiscoverability: stringSettingSchema.optional(),
  boundAuthTokenValidation: stringSettingSchema.optional(),
  friendSuggestions: stringSettingSchema.optional(),
  whoCanJoinMeInExperiences: stringSettingSchema.optional(),
  privateServerPrivacy: stringSettingSchema.optional(),
  privateServerInvitePrivacy: stringSettingSchema.optional(),
  whoCanChatWithMeInExperiences: stringSettingSchema.optional(),
  whoCanWhisperChatWithMeInExperiences: stringSettingSchema.optional(),
  whoCanChatWithMeInApp: stringSettingSchema.optional(),
  whoCanGroupChatWithMeInApp: stringSettingSchema.optional(),
  updateFriendsAboutMyActivity: stringSettingSchema.optional(),
  dailyScreenTimeLimit: optionalSettingSchema.optional(),
  enablePurchases: stringSettingSchema.optional(),
  whoCanSeeMySocialNetworks: stringSettingSchema.optional(),
  whoCanSeeMyInventory: stringSettingSchema.optional(),
  whoCanTradeWithMe: stringSettingSchema.optional(),
  tradeQualityFilter: stringSettingSchema.optional(),
  allowEnableGroupNotifications: stringSettingSchema.optional(),
  allowEnableEmailNotifications: stringSettingSchema.optional(),
  allowEnablePushNotifications: stringSettingSchema.optional(),
  allowEnableExperienceNotifications: stringSettingSchema.optional(),
  allowThirdPartyAppPermissions: stringSettingSchema.optional(),
  allowVoiceDataUsage: stringSettingSchema.optional(),
  whoCanOneOnOnePartyWithMe: stringSettingSchema.optional(),
  whoCanGroupPartyWithMe: stringSettingSchema.optional(),
  whoCanSeeMyOnlineStatus: stringSettingSchema.optional(),
  doNotDisturb: stringSettingSchema.optional(),
  doNotDisturbTimeWindow: timeWindowSettingSchema.optional(),
  allowAnnouncementsEmailNotifications: stringSettingSchema.optional(),
  allowMarketingEmailNotifications: stringSettingSchema.optional(),
  eppEnrollmentStatus: stringSettingSchema.optional(),
  allowSensitiveIssues: stringSettingSchema.optional(),
  allowFacialAgeEstimation: stringSettingSchema.optional(),
  allowCrossAgeGroupStudioCollaboration: stringSettingSchema.optional()
})

export type UserSettingsAndOptions = z.infer<typeof userSettingsAndOptionsSchema>

// Combined settings response
export const combinedAccountSettingsSchema = z.object({
  accountSettings: accountSettingsJsonSchema,
  userSettings: userSettingsAndOptionsSchema
})

export type CombinedAccountSettings = z.infer<typeof combinedAccountSettingsSchema>

// ============================================================================
// UPDATE SETTINGS SCHEMAS
// ============================================================================

// Privacy levels enum values
export const privacyLevelValues = [
  'NoOne',
  'Friends',
  'FriendsAndFollowing',
  'FriendsFollowingAndFollowers',
  'AllAuthenticatedUsers',
  'AllUsers'
] as const

export type PrivacyLevel = (typeof privacyLevelValues)[number]

// Trade privacy values
export const tradePrivacyValues = [
  'Undefined',
  'Disabled',
  'NoOne',
  'Friends',
  'TopFriends',
  'Following',
  'Followers',
  'All'
] as const

export type TradePrivacy = (typeof tradePrivacyValues)[number]

// Trade value/quality filter
export const tradeValueValues = ['Undefined', 'None', 'Low', 'Medium', 'High'] as const

export type TradeValue = (typeof tradeValueValues)[number]

// Theme types
export const themeTypeValues = ['Dark', 'Light'] as const

export type ThemeType = (typeof themeTypeValues)[number]

// Content restriction levels
export const contentRestrictionLevelValues = ['NoRestrictions', 'Teen', 'PreTeen', 'Child'] as const

export type ContentRestrictionLevel = (typeof contentRestrictionLevelValues)[number]

// Online status privacy levels (for whoCanSeeMyOnlineStatus / join privacy)
export const onlineStatusPrivacyValues = [
  'NoOne',
  'Friends',
  'FriendsFollowingAndFollowers',
  'AllUsers'
] as const

export type OnlineStatusPrivacy = (typeof onlineStatusPrivacyValues)[number]

// Update request schemas
export const updateInventoryPrivacyRequestSchema = z.object({
  inventoryPrivacy: z.enum(privacyLevelValues)
})

export const updateTradePrivacyRequestSchema = z.object({
  tradePrivacy: z.enum(tradePrivacyValues)
})

export const updateTradeValueRequestSchema = z.object({
  tradeValue: z.enum(tradeValueValues)
})

export const updateAppChatPrivacyRequestSchema = z.object({
  appChatPrivacy: z.enum(privacyLevelValues)
})

export const updateGameChatPrivacyRequestSchema = z.object({
  gameChatPrivacy: z.enum(privacyLevelValues)
})

export const updatePrivacyRequestSchema = z.object({
  phoneDiscovery: z.enum(privacyLevelValues)
})

export const updateThemeRequestSchema = z.object({
  themeType: z.string()
})

export const updateContentRestrictionRequestSchema = z.object({
  contentRestrictionLevel: z.enum(contentRestrictionLevelValues)
})

export const updateWhoCanJoinMeInExperiencesRequestSchema = z.object({
  whoCanJoinMeInExperiences: z.enum(privacyLevelValues)
})

export const sendVerificationEmailRequestSchema = z.object({
  freeItem: z.boolean().optional()
})

// Response schemas
export const updateSettingResponseSchema = z.object({}).passthrough()

export const privacyUpdateResponseSchema = z.object({
  privacySettingResponse: z.string().optional(),
  tradePrivacy: z.string().optional(),
  inventoryPrivacy: z.string().optional()
})

export type PrivacyUpdateResponse = z.infer<typeof privacyUpdateResponseSchema>

// ============================================================================
// REDEEM PROMO CODE SCHEMAS
// ============================================================================

export const redeemPromoCodeRequestSchema = z.object({
  code: z.string()
})

export const redeemPromoCodeResponseSchema = z.object({
  errorMsg: z.string().nullable().optional(),
  success: z.boolean(),
  successMsg: z.string().nullable().optional()
})

export type RedeemPromoCodeResponse = z.infer<typeof redeemPromoCodeResponseSchema>

// ============================================================================
// DESCRIPTION API SCHEMAS (/v1/description)
// ============================================================================

export const descriptionResponseSchema = z.object({
  description: z.string()
})

export type DescriptionResponse = z.infer<typeof descriptionResponseSchema>

export const updateDescriptionRequestSchema = z.object({
  description: z.string()
})

// ============================================================================
// GENDER API SCHEMAS (/v1/gender)
// ============================================================================

export const genderValues = ['1', '2', '3'] as const // 1=Unknown, 2=Male, 3=Female
export type GenderValue = (typeof genderValues)[number]

export const genderResponseSchema = z.object({
  gender: z.number()
})

export type GenderResponse = z.infer<typeof genderResponseSchema>

export const updateGenderRequestSchema = z.object({
  gender: z.string()
})

// ============================================================================
// BIRTHDATE API SCHEMAS (/v1/birthdate)
// ============================================================================

export const birthdateResponseSchema = z.object({
  birthMonth: z.number(),
  birthDay: z.number(),
  birthYear: z.number()
})

export type BirthdateResponse = z.infer<typeof birthdateResponseSchema>

export const updateBirthdateRequestSchema = z.object({
  birthMonth: z.number(),
  birthDay: z.number(),
  birthYear: z.number()
})

// ============================================================================
// PROMOTION CHANNELS API SCHEMAS (/v1/promotion-channels)
// ============================================================================

export const promotionChannelsVisibilityValues = [
  'NoOne',
  'Friends',
  'FriendsFollowingAndFollowers',
  'AllUsers'
] as const
export type PromotionChannelsVisibility = (typeof promotionChannelsVisibilityValues)[number]

export const promotionChannelsResponseSchema = z.object({
  facebook: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  youtube: z.string().nullable().optional(),
  twitch: z.string().nullable().optional(),
  promotionChannelsVisibilityPrivacy: z.string().optional()
})

export type PromotionChannelsResponse = z.infer<typeof promotionChannelsResponseSchema>

export const updatePromotionChannelsRequestSchema = z.object({
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  youtube: z.string().optional(),
  twitch: z.string().optional(),
  promotionChannelsVisibilityPrivacy: z.string().optional()
})
