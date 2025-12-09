import { z } from 'zod'

const stringOrNumberSchema = z.union([z.string(), z.number()])

// ============================================================================
// GAME SERVER SCHEMAS
// ============================================================================

export const gameServerSchema = z
  .object({
    id: z.string(),
    playing: z.number(),
    maxPlayers: z.number(),
    ping: z.number().nullable().optional(),
    fps: z.number().nullable().optional(),
    playerTokens: z.array(z.string()).optional(),
    vipServerId: z.string().nullable().optional(),
    serverType: z.string().optional(),
    status: z.string().optional(),
    placeId: stringOrNumberSchema.optional(),
    owner: z
      .object({
        id: stringOrNumberSchema.nullable().optional(),
        type: z.string().optional(),
        name: z.string().optional()
      })
      .partial()
      .optional(),
    friends: z.array(stringOrNumberSchema).optional()
  })
  .passthrough()

export const pagedServerSchema = z.object({
  previousPageCursor: z.string().nullable(),
  nextPageCursor: z.string().nullable(),
  data: z.array(gameServerSchema)
})

export const regionsBatchSchema = z.record(z.string(), z.string())
export type RegionLookup = z.infer<typeof regionsBatchSchema>

export type GameServerPayload = z.infer<typeof gameServerSchema>
export type ServerPage = z.infer<typeof pagedServerSchema>

// ============================================================================
// GAME DETAILS SCHEMAS
// ============================================================================

export const gameDetailsSchema = z
  .object({
    id: z.number(),
    rootPlaceId: z.number().nullable().optional(),
    name: z.string(),
    description: z.string().optional().nullable(),
    sourceName: z.string().nullable().optional(),
    sourceDescription: z.string().nullable().optional(),
    creator: z
      .object({
        id: z.number(),
        name: z.string(),
        type: z.string(),
        isRNVAccount: z.boolean().optional(),
        hasVerifiedBadge: z.boolean().optional()
      })
      .optional(),
    price: z.number().nullable().optional(),
    allowedGearGenres: z.array(z.string()).optional(),
    allowedGearCategories: z.array(z.string()).optional(),
    isGenreEnforced: z.boolean().optional(),
    copyingAllowed: z.boolean().optional(),
    playing: z.number().optional(),
    visits: z.number().optional(),
    maxPlayers: z.number().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    studioAccessToApisAllowed: z.boolean().optional(),
    createVipServersAllowed: z.boolean().optional(),
    universeAvatarType: z.string().optional(),
    genre: z.string().optional(),
    isAllGenre: z.boolean().optional(),
    isFavoritedByUser: z.boolean().optional(),
    favoritedCount: z.number().optional()
  })
  .passthrough()

export const placeDetailsSchema = z
  .object({
    placeId: z.number(),
    name: z.string(),
    description: z.string().optional().nullable(),
    url: z.string().optional(),
    builder: z.string().optional(),
    builderId: z.number().optional(),
    isPlayable: z.boolean().optional(),
    reasonProhibited: z.string().optional(),
    universeId: z.number().optional(),
    universeRootPlaceId: z.number().optional(),
    price: z.number().optional(),
    imageToken: z.string().optional()
  })
  .passthrough()

export const gameSortsSchema = z.object({
  sorts: z
    .array(
      z.object({
        token: z.string().optional(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        gameSetTargetId: z.number().nullable().optional(),
        timeOptionsAvailable: z.boolean().optional(),
        genre: z.string().optional(),
        contentType: z.string().optional(),
        id: z.union([z.string(), z.number()]).optional(),
        sortId: z.union([z.string(), z.number()]).optional(),
        sortDisplayName: z.string().optional()
      })
    )
    .optional(),
  data: z.array(z.any()).optional()
})

export const gameVoteSchema = z.object({
  id: z.number(),
  upVotes: z.number(),
  downVotes: z.number()
})

export const gameThumbnailSchema = z.object({
  targetId: z.number(),
  state: z.string(),
  imageUrl: z.string().nullable()
})

export const searchResponseSchema = z.object({
  searchResults: z
    .array(
      z.object({
        contentGroupType: z.string(),
        contents: z
          .array(
            z
              .object({
                universeId: z.number().optional(),
                name: z.string().optional(),
                playerCount: z.number().optional(),
                totalVisits: z.number().optional(),
                description: z.string().optional().nullable(),
                creatorName: z.string().optional()
              })
              .passthrough()
          )
          .optional()
      })
    )
    .optional(),
  keyword: z.string().optional()
})

export type GameDetails = z.infer<typeof gameDetailsSchema>
export type PlaceDetails = z.infer<typeof placeDetailsSchema>

export const socialLinkSchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  type: z.string()
})

export const socialLinksResponseSchema = z.object({
  data: z.array(socialLinkSchema)
})

export type SocialLink = z.infer<typeof socialLinkSchema>

export const voteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable(),
  modalType: z.string().nullable().optional(),
  model: z
    .object({
      showVotes: z.boolean(),
      upVotes: z.number(),
      downVotes: z.number(),
      canVote: z.boolean(),
      userVote: z.boolean().nullable(),
      hasVoted: z.boolean(),
      reasonForNotVoteable: z.string().optional()
    })
    .nullable()
    .optional()
})

export type VoteResponse = z.infer<typeof voteResponseSchema>

export const gamePassSchema = z.object({
  id: z.number(),
  productId: z.number().nullable(),
  name: z.string(),
  isForSale: z.boolean(),
  price: z.number().nullable(),
  isOwned: z.boolean(),
  creator: z
    .object({
      creatorType: z.string(),
      creatorId: z.number(),
      name: z.string(),
      deprecatedId: z.number().optional()
    })
    .optional(),
  displayName: z.string(),
  displayDescription: z.string().nullable().optional(),
  displayIconImageAssetId: z.number().optional(),
  created: z.string().optional(),
  updated: z.string().optional()
})

export const gamePassesResponseSchema = z.object({
  gamePasses: z.array(gamePassSchema),
  nextPageToken: z.string().nullable().optional()
})

export type GamePass = z.infer<typeof gamePassSchema>
export type GamePassesResponse = z.infer<typeof gamePassesResponseSchema>

// ============================================================================
// GROUP SCHEMAS
// ============================================================================

export const groupOwnerSchema = z.object({
  hasVerifiedBadge: z.boolean().optional(),
  userId: z.number().optional(),
  id: z.number().optional(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  type: z.string().optional()
})

export const groupDetailsSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    owner: groupOwnerSchema.nullable().optional(),
    shout: z
      .object({
        body: z.string().optional(),
        poster: groupOwnerSchema.nullable().optional(),
        created: z.string(),
        updated: z.string()
      })
      .passthrough()
      .nullable()
      .optional(),
    memberCount: z.number().optional(),
    isBuildersClubOnly: z.boolean().optional(),
    publicEntryAllowed: z.boolean().optional(),
    hasVerifiedBadge: z.boolean().optional(),
    hasSocialModules: z.boolean().optional(),
    isLocked: z.boolean().optional()
  })
  .passthrough()

export const groupRoleSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.number(),
  memberCount: z.number().optional()
})

export const groupRolesResponseSchema = z.object({
  groupId: z.number(),
  roles: z.array(groupRoleSchema)
})

export const groupGameSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  creator: z
    .object({
      id: z.number(),
      type: z.string()
    })
    .optional(),
  rootPlace: z
    .object({
      id: z.number(),
      type: z.string()
    })
    .optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  placeVisits: z.number().optional()
})

export const groupGamesResponseSchema = z.object({
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(groupGameSchema)
})

export const userGroupMembershipSchema = z.object({
  group: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    owner: groupOwnerSchema.nullable().optional(),
    shout: z
      .object({
        body: z.string().optional(),
        poster: groupOwnerSchema.nullable().optional(),
        created: z.string(),
        updated: z.string()
      })
      .nullable()
      .optional(),
    memberCount: z.number().optional(),
    isBuildersClubOnly: z.boolean().optional(),
    publicEntryAllowed: z.boolean().optional(),
    hasVerifiedBadge: z.boolean().optional()
  }),
  role: groupRoleSchema,
  isPrimaryGroup: z.boolean().optional()
})

export const userGroupsResponseSchema = z.object({
  data: z.array(userGroupMembershipSchema)
})

export const pendingGroupRequestRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  owner: groupOwnerSchema.nullable().optional(),
  memberCount: z.number().optional(),
  hasVerifiedBadge: z.boolean().optional(),
  created: z.string().optional()
})

export const pendingGroupRequestSchema = z.object({
  group: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    owner: groupOwnerSchema.nullable().optional(),
    memberCount: z.number().optional(),
    hasVerifiedBadge: z.boolean().optional()
  }),
  created: z.string().optional()
})

export const pendingGroupRequestsRawResponseSchema = z.object({
  data: z.array(pendingGroupRequestRawSchema)
})

export const pendingGroupRequestsResponseSchema = z.object({
  data: z.array(pendingGroupRequestSchema)
})

export const groupV2Schema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  owner: z
    .object({
      id: z.number(),
      type: z.string()
    })
    .nullable()
    .optional(),
  created: z.string().optional(),
  hasVerifiedBadge: z.boolean().optional()
})

export const groupsV2ResponseSchema = z.object({
  data: z.array(groupV2Schema)
})

export const groupSocialLinkSchema = z.object({
  id: z.number(),
  type: z.string(),
  url: z.string(),
  title: z.string()
})

export const groupSocialLinksResponseSchema = z.object({
  data: z.array(groupSocialLinkSchema)
})

export type GroupOwner = z.infer<typeof groupOwnerSchema>
export type GroupDetails = z.infer<typeof groupDetailsSchema>
export type GroupRole = z.infer<typeof groupRoleSchema>
export type GroupRolesResponse = z.infer<typeof groupRolesResponseSchema>
export type GroupGame = z.infer<typeof groupGameSchema>
export type GroupGamesResponse = z.infer<typeof groupGamesResponseSchema>
export type UserGroupMembership = z.infer<typeof userGroupMembershipSchema>
export type UserGroupsResponse = z.infer<typeof userGroupsResponseSchema>
export type PendingGroupRequestRaw = z.infer<typeof pendingGroupRequestRawSchema>
export type PendingGroupRequest = z.infer<typeof pendingGroupRequestSchema>
export type PendingGroupRequestsRawResponse = z.infer<typeof pendingGroupRequestsRawResponseSchema>
export type PendingGroupRequestsResponse = z.infer<typeof pendingGroupRequestsResponseSchema>
export type GroupV2 = z.infer<typeof groupV2Schema>
export type GroupsV2Response = z.infer<typeof groupsV2ResponseSchema>
export type GroupSocialLink = z.infer<typeof groupSocialLinkSchema>

export const groupWallPostSchema = z.object({
  id: z.number(),
  poster: z
    .object({
      user: z.object({
        userId: z.number(),
        username: z.string(),
        displayName: z.string(),
        hasVerifiedBadge: z.boolean().optional()
      }),
      role: z.object({
        id: z.number(),
        name: z.string(),
        rank: z.number()
      })
    })
    .nullable()
    .optional(),
  body: z.string(),
  created: z.string(),
  updated: z.string()
})

export const groupWallPostsResponseSchema = z.object({
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(groupWallPostSchema)
})

export const groupMemberSchema = z.object({
  user: z.object({
    userId: z.number(),
    username: z.string(),
    displayName: z.string(),
    hasVerifiedBadge: z.boolean().optional()
  }),
  role: z.object({
    id: z.number(),
    name: z.string(),
    rank: z.number()
  })
})

export const groupMembersResponseSchema = z.object({
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(groupMemberSchema)
})

export const groupRoleMemberSchema = z.object({
  hasVerifiedBadge: z.boolean().optional(),
  userId: z.number(),
  username: z.string(),
  displayName: z.string()
})

export const groupRoleMembersResponseSchema = z.object({
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(groupRoleMemberSchema)
})

export type GroupWallPost = z.infer<typeof groupWallPostSchema>
export type GroupWallPostsResponse = z.infer<typeof groupWallPostsResponseSchema>
export type GroupMember = z.infer<typeof groupMemberSchema>
export type GroupMembersResponse = z.infer<typeof groupMembersResponseSchema>
export type GroupRoleMember = z.infer<typeof groupRoleMemberSchema>
export type GroupRoleMembersResponse = z.infer<typeof groupRoleMembersResponseSchema>

export const groupStoreItemSchema = z.object({
  id: z.number(),
  itemType: z.string(),
  assetType: z.number().optional(),
  bundleType: z.number().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  creatorName: z.string().optional(),
  creatorTargetId: z.number().optional(),
  creatorType: z.string().optional(),
  creatorHasVerifiedBadge: z.boolean().optional(),
  price: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  lowestResalePrice: z.number().nullable().optional(),
  priceStatus: z.string().optional(),
  favoriteCount: z.number().optional(),
  collectibleItemId: z.string().nullable().optional(),
  totalQuantity: z.number().nullable().optional(),
  hasResellers: z.boolean().optional(),
  offSaleDeadline: z.string().nullable().optional(),
  saleLocationType: z.string().optional(),
  itemStatus: z.array(z.string()).optional(),
  itemRestrictions: z.array(z.string()).optional(),
  unitsAvailableForConsumption: z.number().optional(),
  productId: z.number().optional()
})

export const groupStoreResponseSchema = z.object({
  keyword: z.string().nullable().optional(),
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(groupStoreItemSchema)
})

export type GroupStoreItem = z.infer<typeof groupStoreItemSchema>
export type GroupStoreResponse = z.infer<typeof groupStoreResponseSchema>
