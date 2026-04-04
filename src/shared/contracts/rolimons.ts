import { z } from 'zod'

export const rolimonsBadgeDetailSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  acquiredTime: z.number().nullable().optional()
})

export const rolimonsItemDetailsSchema = z.object({
  success: z.boolean(),
  item_count: z.number(),
  items: z.record(z.string(), z.array(z.union([z.string(), z.number()])))
})

export const rolimonsPlayerSchema = z
  .object({
    name: z.string(),
    value: z.number().nullable(),
    rap: z.number().nullable(),
    rank: z.number().nullable(),
    premium: z.boolean(),
    privacy_enabled: z.boolean(),
    terminated: z.boolean(),
    stats_updated: z.number().nullable(),
    last_online: z.number().nullable(),
    last_location: z.string().nullable(),
    rolibadges: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])),
    rolibadgeDetails: z.array(rolimonsBadgeDetailSchema)
  })
  .partial()

export const rolimonsItemDetailsDataSchema = z
  .object({
    item_id: z.number().nullable(),
    item_name: z.string().nullable(),
    asset_type_id: z.number().nullable(),
    original_price: z.number().nullable(),
    created: z.number().nullable(),
    first_timestamp: z.number().nullable(),
    best_price: z.number().nullable(),
    favorited: z.number().nullable(),
    num_sellers: z.number().nullable(),
    rap: z.number().nullable(),
    owners: z.number().nullable(),
    bc_owners: z.number().nullable(),
    copies: z.number().nullable(),
    deleted_copies: z.number().nullable(),
    bc_copies: z.number().nullable(),
    hoarded_copies: z.number().nullable(),
    acronym: z.string().nullable(),
    valuation_method: z.string().nullable(),
    value: z.number().nullable(),
    demand: z.number().nullable(),
    trend: z.number().nullable(),
    projected: z.number().nullable(),
    hyped: z.number().nullable(),
    rare: z.number().nullable(),
    thumbnail_url_lg: z.string().nullable()
  })
  .partial()

export const rolimonsHistoryDataSchema = z
  .object({
    num_points: z.number().nullable(),
    timestamp: z.array(z.number()).nullable(),
    favorited: z.array(z.number()).nullable(),
    rap: z.array(z.number()).nullable(),
    best_price: z.array(z.number()).nullable(),
    num_sellers: z.array(z.number()).nullable()
  })
  .partial()

export const rolimonsSalesDataSchema = z
  .object({
    num_points: z.number().nullable(),
    timestamp: z.array(z.number()).nullable(),
    avg_daily_sales_price: z.array(z.number()).nullable(),
    sales_volume: z.array(z.number()).nullable()
  })
  .partial()

export const rolimonsOwnershipDataSchema = z
  .object({
    id: z.number().nullable(),
    num_points: z.number().nullable(),
    timestamps: z.array(z.number()).nullable(),
    owners: z.array(z.number()).nullable(),
    bc_owners: z.array(z.number()).nullable(),
    copies: z.array(z.number()).nullable(),
    deleted_copies: z.array(z.number()).nullable(),
    bc_copies: z.array(z.number()).nullable(),
    hoarded_copies: z.array(z.number()).nullable()
  })
  .partial()

export const rolimonsHoardsDataSchema = z
  .object({
    num_hoards: z.number().nullable(),
    owner_ids: z.array(z.string()).nullable(),
    owner_names: z.array(z.string()).nullable(),
    quantities: z.array(z.number()).nullable()
  })
  .partial()

export const rolimonsItemPageSchema = z
  .object({
    itemDetails: rolimonsItemDetailsDataSchema.nullable(),
    historyData: rolimonsHistoryDataSchema.nullable(),
    salesData: rolimonsSalesDataSchema.nullable(),
    ownershipData: rolimonsOwnershipDataSchema.nullable(),
    hoardsData: rolimonsHoardsDataSchema.nullable(),
    valueChanges: z
      .array(z.array(z.union([z.number(), z.string(), z.boolean(), z.null()])))
      .nullable()
  })
  .partial()

export type RolimonsItemDetails = z.infer<typeof rolimonsItemDetailsSchema>
export type RolimonsPlayer = z.infer<typeof rolimonsPlayerSchema>
export type RolimonsItemPage = z.infer<typeof rolimonsItemPageSchema>
export type RolimonsBadgeDetail = z.infer<typeof rolimonsBadgeDetailSchema>
