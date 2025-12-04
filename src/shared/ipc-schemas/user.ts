import { z } from 'zod'
import { AccountStatus } from '../../renderer/src/types'
import { cursorResultSchema } from './common'

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string()
})
export type UserSummary = z.infer<typeof userSummarySchema>

export const baseStatsSchema = z.object({
  followerCount: z.number(),
  followingCount: z.number(),
  friendCount: z.number(),
  userId: z.number()
})

export const accountStatsSchema = baseStatsSchema.extend({
  robuxBalance: z.number()
})

export const friendStatsSchema = baseStatsSchema.extend({
  description: z.string().optional(),
  created: z.string().optional(),
  username: z.string(),
  displayName: z.string()
})

export const extendedUserDetailsSchema = z.object({
  isPremium: z.boolean(),
  isAdmin: z.boolean(),
  avatarImageUrl: z.string().nullable()
})

export const detailedStatsSchema = z.object({
  joinDate: z.string(),
  description: z.string(),
  groupCount: z.number(),
  placeVisits: z.number()
})

export type AccountStats = z.infer<typeof accountStatsSchema>
export type FriendStats = z.infer<typeof friendStatsSchema>
export type ExtendedUserDetails = z.infer<typeof extendedUserDetailsSchema>
export type DetailedStats = z.infer<typeof detailedStatsSchema>

export const deployHistorySchema = z.record(z.string(), z.array(z.string()))
export type DeployHistory = z.infer<typeof deployHistorySchema>

const stringOrNumberSchema = z.union([z.string(), z.number()])

export const userPreviewSchema = z
  .object({
    id: stringOrNumberSchema,
    userId: stringOrNumberSchema.optional(),
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().catch(''),
    userPresenceType: z.number().int().optional(),
    lastLocation: z.string().optional(),
    placeId: stringOrNumberSchema.nullable().optional(),
    gameId: stringOrNumberSchema.nullable().optional(),
    description: z.string().optional(),
    created: z.string().optional(),
    originSourceType: z.string().optional(),
    sourceUniverseId: stringOrNumberSchema.nullable().optional(),
    contactName: z.string().nullable().optional(),
    senderNickname: z.string().optional(),
    mutualFriendsList: z.array(z.string()).optional()
  })
  .passthrough()

export const userCursorResultSchema = cursorResultSchema.extend({
  data: z.array(userPreviewSchema)
})

export type UserPreview = z.infer<typeof userPreviewSchema>
export type UserCursorResult = z.infer<typeof userCursorResultSchema>

export const userGroupRoleSchema = z.object({
  group: z.object({
    id: z.number(),
    name: z.string(),
    memberCount: z.number().optional(),
    hasVerifiedBadge: z.boolean().optional()
  }),
  role: z.object({
    id: z.number(),
    name: z.string(),
    rank: z.number()
  })
})

export const robloxBadgeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional()
})

export const playerBadgeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  enabled: z.boolean().optional(),
  awardCount: z.number().optional()
})

export const usernameHistorySchema = z.object({
  data: z.array(
    z.object({
      name: z.string()
    })
  ),
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional()
})

export type UserGroupRole = z.infer<typeof userGroupRoleSchema>
export type RobloxBadge = z.infer<typeof robloxBadgeSchema>
export type PlayerBadge = z.infer<typeof playerBadgeSchema>
export type UsernameHistory = z.infer<typeof usernameHistorySchema>

// ============================================================================
// PRESENCE SCHEMAS
// ============================================================================

export const presenceSchema = z.object({
  userPresenceType: z.number(),
  lastLocation: z.string().nullable().optional(),
  placeId: z.number().nullable().optional(),
  rootPlaceId: z.number().nullable().optional(),
  gameId: z.string().nullable().optional(),
  universeId: z.number().nullable().optional(),
  userId: z.number(),
  lastOnline: z.string().nullable().optional()
})

export const userPresenceResponseSchema = z.object({
  userPresences: z.array(presenceSchema).default([])
})

export const batchAccountStatusSchema = z.record(
  z.string(),
  z
    .object({
      userId: z.number(),
      presence: presenceSchema.nullable()
    })
    .nullable()
)

export type Presence = z.infer<typeof presenceSchema>
export type BatchAccountStatus = z.infer<typeof batchAccountStatusSchema>

// ============================================================================
// ACCOUNT SCHEMAS
// ============================================================================

export const accountStatusSchema = z.nativeEnum(AccountStatus)

export const accountSchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    username: z.string(),
    userId: z.string(),
    cookie: z.string().optional(),
    status: accountStatusSchema.default(AccountStatus.Offline),
    notes: z.string().default(''),
    avatarUrl: z.string().default(''),
    lastActive: z.string().default(new Date().toISOString()),
    robuxBalance: z.number().default(0),
    friendCount: z.number().default(0),
    followerCount: z.number().default(0),
    followingCount: z.number().default(0),
    isPremium: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
    joinDate: z.string().optional(),
    placeVisits: z.number().optional(),
    totalFavorites: z.number().optional(),
    concurrentPlayers: z.number().optional(),
    groupMemberCount: z.number().optional()
  })
  .passthrough()

export type AccountSnapshot = z.infer<typeof accountSchema>

// ============================================================================
// FRIENDS SCHEMAS
// ============================================================================

export const friendSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  description: z.string().optional().nullable(),
  isOnline: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  friendFrequentScore: z.number().optional(),
  friendFrequentRank: z.number().optional(),
  hasVerifiedBadge: z.boolean().optional(),
  externalAppDisplayName: z.string().optional().nullable()
})

export const friendsPageSchema = z
  .object({
    PageItems: z.array(friendSchema).optional(),
    NextCursor: z.string().nullable().optional()
  })
  .passthrough()

export const friendRequestSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  friendRequest: z
    .object({
      sentAt: z.string().optional(),
      senderId: z.number().optional(),
      sourceUniverseId: z.number().optional()
    })
    .optional(),
  mutualFriendsList: z.array(z.string()).optional(),
  hasVerifiedBadge: z.boolean().optional()
})

export const followersResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      name: z.string().optional().nullable(),
      displayName: z.string().optional().nullable(),
      created: z.string().optional()
    })
  ),
  nextPageCursor: z.string().nullable().optional(),
  previousPageCursor: z.string().nullable().optional()
})

export type Friend = z.infer<typeof friendSchema>
export type FriendRequest = z.infer<typeof friendRequestSchema>

// ============================================================================
// PROFILE PLATFORM API SCHEMAS
// ============================================================================

export const profileHeaderCountsSchema = z.object({
  friendsCount: z.number().optional(),
  followersCount: z.number().optional(),
  followingsCount: z.number().optional(),
  mutualFriendsCount: z.number().optional(),
  isFriendsCountEnabled: z.boolean().optional(),
  isFollowersCountEnabled: z.boolean().optional(),
  isFollowingsCountEnabled: z.boolean().optional(),
  isMutualFriendsCountEnabled: z.boolean().optional()
})

export const profileHeaderNamesSchema = z.object({
  primaryName: z.string().optional(),
  username: z.string().optional(),
  displayName: z.string().optional()
})

export const profileHeaderSchema = z.object({
  userId: z.number(),
  isPremium: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isRobloxAdmin: z.boolean().optional(),
  counts: profileHeaderCountsSchema.optional(),
  names: profileHeaderNamesSchema.optional(),
  contextualInformation: z
    .object({
      context: z.string().optional()
    })
    .nullable()
    .optional(),
  editName: z
    .object({
      field: z.string().optional(),
      value: z.string().nullable().optional(),
      isEdited: z.boolean().optional()
    })
    .nullable()
    .optional()
})

export const profileAboutSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  socialLinks: z
    .array(
      z.object({
        type: z.string().optional(),
        url: z.string().optional(),
        title: z.string().optional()
      })
    )
    .nullable()
    .optional(),
  nameHistory: z.array(z.string()).nullable().optional(),
  joinDateTime: z.string().optional()
})

export const profileWearingAssetSchema = z.object({
  assetId: z.number(),
  itemType: z.string().optional()
})

export const profileCurrentlyWearingSchema = z.object({
  assets: z.array(profileWearingAssetSchema).optional()
})

export const profileFavoriteExperienceSchema = z.object({
  universeId: z.number()
})

export const profileFavoriteExperiencesSchema = z.object({
  experiences: z.array(profileFavoriteExperienceSchema).optional()
})

export const profileFriendsSchema = z.object({
  friends: z
    .array(
      z.object({
        userId: z.number().optional(),
        id: z.number().optional()
      })
    )
    .optional()
})

export const profileCollectionAssetSchema = z.object({
  assetId: z.number(),
  itemType: z.string().optional()
})

export const profileCollectionsSchema = z.object({
  assets: z.array(profileCollectionAssetSchema).optional()
})

export const profileRobloxBadgeTypeSchema = z.object({
  id: z.number(),
  value: z.string().optional(),
  description: z.string().optional(),
  imageName: z.string().optional()
})

export const profileRobloxBadgeSchema = z.object({
  id: z.number(),
  type: profileRobloxBadgeTypeSchema.optional(),
  userId: z.number().optional(),
  createdTime: z
    .object({
      seconds: z.number().optional(),
      nanos: z.number().optional()
    })
    .optional()
})

export const profileRobloxBadgesSchema = z.object({
  robloxBadgeList: z.array(profileRobloxBadgeSchema).optional()
})

export const profilePlayerBadgesSchema = z.object({
  badges: z.array(z.number()).optional()
})

export const profileStatisticsSchema = z.object({
  userJoinedDate: z.string().optional(),
  numberOfVisits: z.number().optional()
})

export const profileActionsSchema = z.object({
  buttons: z
    .array(
      z.object({
        type: z.string().optional()
      })
    )
    .optional(),
  contextual: z.array(z.string()).optional()
})

export const profileComponentsSchema = z.object({
  UserProfileHeader: profileHeaderSchema.optional(),
  About: profileAboutSchema.optional(),
  CurrentlyWearing: profileCurrentlyWearingSchema.optional(),
  FavoriteExperiences: profileFavoriteExperiencesSchema.optional(),
  Friends: profileFriendsSchema.optional(),
  Collections: profileCollectionsSchema.optional(),
  RobloxBadges: profileRobloxBadgesSchema.optional(),
  PlayerBadges: profilePlayerBadgesSchema.optional(),
  Statistics: profileStatisticsSchema.optional(),
  Actions: profileActionsSchema.optional()
})

export const userProfileResponseSchema = z.object({
  profileType: z.string().optional(),
  profileId: z.string().optional(),
  componentOrdering: z.array(z.string()).optional(),
  components: profileComponentsSchema.optional(),
  onlyEssentialComponents: z.any().nullable().optional(),
  gracefulDegradationEnabled: z.boolean().optional()
})

export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>
export type ProfileHeader = z.infer<typeof profileHeaderSchema>
export type ProfileAbout = z.infer<typeof profileAboutSchema>
export type ProfileCurrentlyWearing = z.infer<typeof profileCurrentlyWearingSchema>
export type ProfileCollections = z.infer<typeof profileCollectionsSchema>
export type ProfileRobloxBadges = z.infer<typeof profileRobloxBadgesSchema>
export type ProfileStatistics = z.infer<typeof profileStatisticsSchema>
