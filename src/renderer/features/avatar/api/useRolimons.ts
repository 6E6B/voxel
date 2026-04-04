import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import {
  rolimonsBadgeDetailSchema,
  rolimonsItemDetailsSchema,
  type RolimonsItemPage as RolimonsItemPageData,
  rolimonsPlayerSchema,
  rolimonsItemPageSchema
} from '@shared/contracts/rolimons'
import { robloxGet } from '@renderer/shared/lib/robloxApi'

// ============================================================================
// Types
// ============================================================================

// Rolimons item data structure (array format from API)
// Array indices: [Name, Acronym, RAP, Value, DefaultValue, Demand, Trend, Projected, Hyped, Rare]
export type RolimonsItemData = [
  string, // 0: Name
  string, // 1: Acronym
  number, // 2: RAP (Recent Average Price)
  number, // 3: Value (-1 means none set)
  number, // 4: Default Value
  number, // 5: Demand (-1 to 4)
  number, // 6: Trend (-1 to 4)
  number, // 7: Projected (-1 or 1)
  number, // 8: Hyped (-1 or 1)
  number // 9: Rare (-1 or 1)
]

// Parsed item info for easy access
export interface RolimonsItem {
  id: number
  name: string
  acronym: string
  rap: number
  value: number | null // null if -1
  defaultValue: number
  demand: number
  demandLabel: string
  trend: number
  trendLabel: string
  isProjected: boolean
  isHyped: boolean
  isRare: boolean
}

// Rolimons API response type
interface RolimonsApiResponse {
  success: boolean
  item_count: number
  items: Record<string, RolimonsItemData>
}

// Rolimons Player API response type
export interface RolimonsPlayerData {
  name?: string
  value?: number | null
  rap?: number | null
  rank?: number | null
  premium?: boolean
  privacy_enabled?: boolean
  terminated?: boolean
  stats_updated?: number | null
  last_online?: number | null
  last_location?: string
  rolibadges?: Record<string, number | string | boolean | null>
  rolibadgeDetails?: Array<{
    key: string
    title: string
    description: string
    acquiredTime?: number | null
  }>
}

// ============================================================================
// Constants
// ============================================================================

// Demand labels
export const DEMAND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Terrible',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Amazing'
}

// Trend labels
export const TREND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Lowering',
  1: 'Unstable',
  2: 'Stable',
  3: 'Raising',
  4: 'Fluctuating'
}

// Demand colors for UI
export const DEMAND_COLORS: Record<number, string> = {
  [-1]: 'text-neutral-500',
  0: 'text-red-500',
  1: 'text-orange-500',
  2: 'text-yellow-500',
  3: 'text-emerald-500',
  4: 'text-cyan-400'
}

// Trend colors for UI
export const TREND_COLORS: Record<number, string> = {
  [-1]: 'text-neutral-500',
  0: 'text-red-500',
  1: 'text-orange-500',
  2: 'text-yellow-500',
  3: 'text-emerald-500',
  4: 'text-purple-500'
}

export type RolimonsBadgeTier =
  | 'booster'
  | 'award_winner'
  | 'award_nominee'
  | 'artifact'
  | 'legendary'
  | 'epic'
  | 'rare'
  | 'uncommon'
  | 'common'

export interface RolimonsBadgeMeta {
  label: string
  description: string
  tier: RolimonsBadgeTier
  textColor: string
  backgroundColor: string
  borderColor: string
}

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized
  const value = Number.parseInt(expanded, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const createBadgePalette = (tier: RolimonsBadgeTier, textColor: string) => ({
  tier,
  textColor,
  backgroundColor: hexToRgba(textColor, 0.18),
  borderColor: hexToRgba(textColor, 0.42)
})

const ROLIMONS_BADGE_PALETTES = {
  booster: createBadgePalette('booster', '#f47fff'),
  awardWinner: createBadgePalette('award_winner', '#d9b75d'),
  awardNominee: createBadgePalette('award_nominee', '#d1d1d1'),
  artifact: createBadgePalette('artifact', '#ad2d36'),
  legendary: createBadgePalette('legendary', '#e78224'),
  epic: createBadgePalette('epic', '#ab0be1'),
  rare: createBadgePalette('rare', '#038dbe'),
  uncommon: createBadgePalette('uncommon', '#0bab52'),
  common: createBadgePalette('common', '#7a8288')
} satisfies Record<string, Omit<RolimonsBadgeMeta, 'label' | 'description'>>

// Rolimons badge metadata
export const ROLIMONS_BADGES: Record<string, RolimonsBadgeMeta> = {
  // Community Badges
  contributor: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: 'Contributor',
    description:
      "Contribute something substantial to Rolimon's such as content, artwork, or code used by the site or Discord server"
  },
  sword_fighting_champion: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: 'Sword Fighting Champion',
    description: "Win a Rolimon's sword fighting tournament hosted in our Discord server"
  },
  roli_award_winner: {
    ...ROLIMONS_BADGE_PALETTES.awardWinner,
    label: 'Roli Award Winner',
    description:
      'Win a Roli Award during our annual Roli Award ceremony hosted in our Discord server'
  },
  roli_award_nominee: {
    ...ROLIMONS_BADGE_PALETTES.awardNominee,
    label: 'Roli Award Nominee',
    description:
      'Get nominated for a Roli Award during our annual Roli Award ceremony hosted in our Discord server'
  },
  event_winner: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Event Winner',
    description:
      'Win an event hosted in our Discord server, such as an outfit competition or art competition'
  },
  game_night_winner: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Game Night Winner',
    description: 'Win a game night event hosted in our Discord server'
  },
  booster: {
    ...ROLIMONS_BADGE_PALETTES.booster,
    label: 'Booster',
    description:
      "Use your Discord Nitro Boost on the Rolimon's Discord Server then request the badge in our Support Server"
  },
  roligang: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Roligang',
    description: "Join the official Rolimon's Group on Roblox"
  },

  // Website Badges
  verified: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Verified',
    description: 'Verify your account on Rolimons'
  },
  create_10_trade_ads: {
    ...ROLIMONS_BADGE_PALETTES.common,
    label: 'Trade Advertiser',
    description: 'Create 10 trade ads'
  },
  create_100_trade_ads: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Frequent Trader',
    description: 'Create 100 trade ads'
  },
  create_1000_trade_ads: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Active Trader',
    description: 'Create 1,000 trade ads'
  },
  create_10000_trade_ads: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: 'Boundless Trader',
    description: 'Create 10,000 trade ads'
  },

  // Trading Badges - Value
  value_100k: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: '100K+',
    description: 'Own an inventory of limiteds worth at least one hundred thousand total value'
  },
  value_500k: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: '500K+',
    description: 'Own an inventory of limiteds worth at least five hundred thousand total value'
  },
  value_1m: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: '1M+',
    description: 'Own an inventory of limiteds worth at least one million total value'
  },
  value_5m: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: '5M+',
    description: 'Own an inventory of limiteds worth at least five million total value'
  },
  value_10m: {
    ...ROLIMONS_BADGE_PALETTES.awardWinner,
    label: '10M+',
    description: 'Own an inventory of limiteds worth at least ten million total value'
  },
  value_20m: {
    ...ROLIMONS_BADGE_PALETTES.artifact,
    label: '20M+',
    description: 'Own an inventory of limiteds worth at least twenty million total value'
  },
  value_100m: {
    ...ROLIMONS_BADGE_PALETTES.artifact,
    label: '100M+ Value',
    description: 'Own an inventory of limiteds worth at least one hundred million total value'
  },
  value_1b: {
    ...ROLIMONS_BADGE_PALETTES.artifact,
    label: '1B+ Value',
    description: 'Own an inventory of limiteds worth at least one billion total value'
  },

  // Trading Badges - Special Items
  own_lucky_cat_uaid: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Lucky Cat',
    description: 'Own the Lucky Cat item'
  },
  own_1_serial_1: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Serial #1',
    description: 'Own a serial #1 limited'
  },
  own_1_serial_1337: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'L337',
    description: 'Own a serial #1337 limited'
  },
  own_1_sequential_serial: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Sequential Serial',
    description: 'Own a limited with serial #123, #1234 or #12345'
  },
  own_1_serial_1_to_9: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Low Serial',
    description: 'Own a limited with a serial less than #10'
  },
  own_1_dominus: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Dominator',
    description: 'Own any limited dominus'
  },
  own_1_big_dominus: {
    ...ROLIMONS_BADGE_PALETTES.awardWinner,
    label: 'Big Dominator',
    description:
      'Own one of the bigger limited domini (Emp, Frig, Astra, Inf, Pittacium, Aur, Messor or Rex)'
  },
  own_1_stf: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Sparkly',
    description: 'Own a limited sparkle time fedora'
  },
  own_1_valued_federation_item: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Federated',
    description: 'Own a valued federation item'
  },
  own_1_immortal_sword: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Enduring',
    description: 'Own a limited immortal sword'
  },
  own_epic_katana_set: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Epic Blade Collector',
    description: 'Own the epic katana set (Blue, Crimson, Golden, Iris, Jade, Ocherous)'
  },
  katana_poses_when: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Katana poses when',
    description: 'Own the epic katana set (Blue, Crimson, Golden, Iris, Jade, Ocherous)'
  },
  own_1_kotn_item: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Evening Royalty',
    description: 'Own a limited king of the night item'
  },

  // Trading Badges - Collection
  own_10_items: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Collector',
    description: 'Own at least 10 limiteds'
  },
  own_100_items: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Devout Collector',
    description: 'Own at least 100 limiteds'
  },
  own_1000_items: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: 'Incurable Collector',
    description: 'Own at least 1000 limiteds'
  },
  own_1_rare: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Rare Owner',
    description: 'Own a rare limited'
  },
  own_3_rares: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Rare Enthusiast',
    description: 'Own 3 rare limiteds'
  },
  own_10_rares: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Rare Supremist',
    description: 'Own 10 rare limiteds'
  },
  own_5_noob: {
    ...ROLIMONS_BADGE_PALETTES.common,
    label: 'Noob',
    description: "Own 5 noob items (Noob Attacks, Noob Assists, Pocket Pals, Bag O' Noobs)"
  },
  own_15_noob: {
    ...ROLIMONS_BADGE_PALETTES.uncommon,
    label: 'Noobie',
    description: "Own 15 noob items (Noob Attacks, Noob Assists, Pocket Pals, Bag O' Noobs)"
  },
  own_10_of_1_item: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Mini Hoarder',
    description: 'Own 10 of one item'
  },
  own_50_of_1_item: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Hoarder',
    description: 'Own 50 of one item'
  },
  own_100_of_1_item: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: 'Mega Hoarder',
    description: 'Own 100 of one item'
  },
  own_10_pct_of_1_item: {
    ...ROLIMONS_BADGE_PALETTES.epic,
    label: 'Modest Enthusiasm',
    description: "Own 10% of an item's available copies (item must have 2+ available copies)"
  },
  own_25_pct_of_1_item: {
    ...ROLIMONS_BADGE_PALETTES.legendary,
    label: 'Unhealthy Obsession',
    description: "Own 25% of an item's available copies (item must have 2+ available copies)"
  },
  own_50_pct_of_1_item: {
    ...ROLIMONS_BADGE_PALETTES.artifact,
    label: 'Uncontrollable Addiction',
    description: "Own 50% of an item's available copies (item must have 2+ available copies)"
  },
  own_all_asset_types: {
    ...ROLIMONS_BADGE_PALETTES.rare,
    label: 'Accessorized',
    description: 'Own a limited from each asset type (Hat, Face, Gear, Hair Accessory, etc.)'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

// Parse raw item data into a more usable format
function parseItemData(id: number, data: RolimonsItemData): RolimonsItem {
  return {
    id,
    name: data[0],
    acronym: data[1],
    rap: data[2],
    value: data[3] === -1 ? null : data[3],
    defaultValue: data[4],
    demand: data[5],
    demandLabel: DEMAND_LABELS[data[5]] || 'Unknown',
    trend: data[6],
    trendLabel: TREND_LABELS[data[6]] || 'Unknown',
    isProjected: data[7] === 1,
    isHyped: data[8] === 1,
    isRare: data[9] === 1
  }
}

async function fetchRolimonsItemDetails(): Promise<RolimonsApiResponse> {
  return robloxGet(rolimonsItemDetailsSchema, 'https://api.rolimons.com/items/v2/itemdetails') as Promise<RolimonsApiResponse>
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch and cache all Rolimons limited item data.
 * Data is cached for 5 minutes.
 */
export function useRolimonsData() {
  return useQuery({
    queryKey: queryKeys.rolimons.itemDetails(),
    queryFn: fetchRolimonsItemDetails,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000 // Wait 5 seconds before retry (respect rate limits)
  })
}

/**
 * Hook to get a specific limited item's Rolimons data.
 * Reads from the React Query cache populated by useRolimonsData().
 */
export function useRolimonsItem(assetId: number | null): RolimonsItem | null {
  const { data } = useRolimonsData()

  if (!assetId || !data?.items) return null

  const itemData = data.items[String(assetId)]
  if (!itemData) return null

  return parseItemData(assetId, itemData)
}

/**
 * Hook to check if an asset is a limited tracked by Rolimons.
 */
export function useIsRolimonsLimited(assetId: number | null): boolean {
  const { data } = useRolimonsData()

  if (!assetId || !data?.items) return false
  return String(assetId) in data.items
}

/**
 * Get Rolimons item data directly from the cache (non-reactive).
 * Use this in event handlers or callbacks where you need synchronous access.
 */
export function getRolimonsItem(
  assetId: number,
  queryClient: ReturnType<typeof useQueryClient>
): RolimonsItem | null {
  const data = queryClient.getQueryData<RolimonsApiResponse>(queryKeys.rolimons.itemDetails())
  if (!data?.items) return null

  const itemData = data.items[String(assetId)]
  if (!itemData) return null

  return parseItemData(assetId, itemData)
}

/**
 * Hook that provides getRolimonsItem bound to the current query client.
 * Useful for callbacks that need synchronous cache access.
 */
export function useGetRolimonsItem() {
  const queryClient = useQueryClient()
  return (assetId: number) => getRolimonsItem(assetId, queryClient)
}

/**
 * Hook to fetch Rolimons player data (value, rap, badges, etc.)
 * Data is cached for 5 minutes.
 */
export function useRolimonsPlayer(userId: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: [...queryKeys.rolimons.player(userId ?? 0), 'web-scrape-v1'],
    queryFn: async (): Promise<RolimonsPlayerData | null> => {
      if (!userId) return null
      try {
        const data = await window.api.getRolimonsPlayerProfile(userId)
        const parsed = rolimonsPlayerSchema.extend({
          rolibadgeDetails: rolimonsBadgeDetailSchema.array().optional()
        }).safeParse(data)

        if (!parsed.success) {
          console.warn('[useRolimonsPlayer] Validation warning:', parsed.error.issues)
          return data as RolimonsPlayerData
        }

        return parsed.data as RolimonsPlayerData
      } catch (error) {
        console.error('Failed to fetch Rolimons player data:', error)
        return null
      }
    },
    enabled: enabled && userId !== null && userId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000
  })
}

/**
 * Hook to get loading state for Rolimons data
 */
export function useRolimonsLoading(): boolean {
  const { isLoading, isFetching } = useRolimonsData()
  return isLoading || isFetching
}

/**
 * Hook to get error state for Rolimons data
 */
export function useRolimonsError(): string | null {
  const { error } = useRolimonsData()
  return error ? (error as Error).message : null
}

/**
 * Hook to fetch detailed Rolimons item page data (value history, ownership, sales, etc.)
 * This fetches from the actual item page on rolimons.com
 */
export function useRolimonsItemPage(itemId: number | null, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.rolimons.itemPage(itemId ?? 0),
    queryFn: async (): Promise<RolimonsItemPageData | null> => {
      if (!itemId) return null
      try {
        const data = await window.api.getRolimonsItemPage(itemId)

        // Validate with Zod schema
        const parsed = rolimonsItemPageSchema.safeParse(data)
        if (!parsed.success) {
          console.warn('[useRolimonsItemPage] Validation warning:', parsed.error.issues)
        }

        return data
      } catch (error) {
        console.error('Failed to fetch Rolimons item page data:', error)
        return null
      }
    },
    enabled: enabled && itemId !== null && itemId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000
  })
}

