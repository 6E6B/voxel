import { z } from 'zod'

// ============================================================================
// TRANSACTION TYPES SCHEMAS
// ============================================================================

export const transactionTypesSchema = z.object({
  HasPurchase: z.boolean(),
  HasSale: z.boolean(),
  HasAffiliatePayout: z.boolean(),
  HasAffiliateSale: z.boolean(),
  HasGroupPayout: z.boolean(),
  HasCurrencyPurchase: z.boolean(),
  HasTradeRobux: z.boolean(),
  HasPremiumStipend: z.boolean(),
  HasEngagementPayout: z.boolean(),
  HasGroupEngagementPayout: z.boolean(),
  HasAdSpend: z.boolean(),
  HasDevEx: z.boolean(),
  HasPendingRobux: z.boolean(),
  HasIndividualToGroup: z.boolean(),
  HasCSAdjustment: z.boolean(),
  HasAdsRevsharePayout: z.boolean(),
  HasGroupAdsRevsharePayout: z.boolean(),
  HasSubscriptionsRevsharePayout: z.boolean(),
  HasGroupSubscriptionsRevsharePayout: z.boolean(),
  HasPublishingAdvanceRebates: z.boolean(),
  HasLicensingPayment: z.boolean()
})

export type TransactionTypes = z.infer<typeof transactionTypesSchema>

export const redeemPromoCodeResponseSchema = z.object({
  success: z.boolean(),
  successMsg: z.string().optional(),
  errorMsg: z.string().optional()
})

export type RedeemPromoCodeResponse = z.infer<typeof redeemPromoCodeResponseSchema>

// ============================================================================
// TRANSACTION SCHEMAS
// ============================================================================

export const transactionAgentSchema = z.object({
  id: z.number(),
  type: z.string(),
  name: z.string()
})

export const transactionDetailsSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  type: z.string()
})

export const transactionCurrencySchema = z.object({
  amount: z.number(),
  type: z.string()
})

export const transactionSchema = z.object({
  id: z.number(),
  idHash: z.string(),
  transactionType: z.string(),
  created: z.string(),
  isPending: z.boolean(),
  agent: transactionAgentSchema,
  details: transactionDetailsSchema.nullable(),
  currency: transactionCurrencySchema,
  purchaseToken: z.string().nullable()
})

export type Transaction = z.infer<typeof transactionSchema>

export const transactionsResponseSchema = z.object({
  previousPageCursor: z.string().nullable(),
  nextPageCursor: z.string().nullable(),
  data: z.array(transactionSchema)
})

export type TransactionsResponse = z.infer<typeof transactionsResponseSchema>

// ============================================================================
// TRANSACTION TOTALS SCHEMA (from /transaction-totals API)
// ============================================================================

export const transactionTotalsSchema = z.object({
  salesTotal: z.number(),
  purchasesTotal: z.number(),
  affiliateSalesTotal: z.number(),
  groupPayoutsTotal: z.number(),
  currencyPurchasesTotal: z.number(),
  premiumStipendsTotal: z.number(),
  tradeSystemEarningsTotal: z.number(),
  tradeSystemCostsTotal: z.number(),
  premiumPayoutsTotal: z.number(),
  groupPremiumPayoutsTotal: z.number(),
  adSpendTotal: z.number(),
  developerExchangeTotal: z.number(),
  pendingRobuxTotal: z.number(),
  incomingRobuxTotal: z.number(),
  outgoingRobuxTotal: z.number(),
  individualToGroupTotal: z.number(),
  csAdjustmentTotal: z.number(),
  adsRevsharePayoutsTotal: z.number(),
  groupAdsRevsharePayoutsTotal: z.number(),
  subscriptionsRevshareTotal: z.number(),
  groupSubscriptionsRevshareTotal: z.number(),
  subscriptionsRevshareOutgoingTotal: z.number(),
  groupSubscriptionsRevshareOutgoingTotal: z.number(),
  publishingAdvanceRebatesTotal: z.number(),
  affiliatePayoutTotal: z.number(),
  licensingPaymentTotal: z.number(),
  licensingPaymentClawbackOutgoingTotal: z.number()
})

export type TransactionTotals = z.infer<typeof transactionTotalsSchema>

// Time frame options for the totals API
export const transactionTimeFrameSchema = z.enum(['Day', 'Week', 'Month', 'Year'])

export type TransactionTimeFrame = z.infer<typeof transactionTimeFrameSchema>

// Transaction type enum for API
export const transactionTypeEnumSchema = z.enum([
  'Purchase',
  'Sale',
  'AffiliatePayout',
  'AffiliateSale',
  'GroupPayout',
  'CurrencyPurchase',
  'TradeRobux',
  'PremiumStipend',
  'EngagementPayout',
  'GroupEngagementPayout',
  'AdSpend',
  'DevEx',
  'PendingRobux',
  'IndividualToGroup',
  'CSAdjustment',
  'AdsRevsharePayout',
  'GroupAdsRevsharePayout',
  'SubscriptionsRevsharePayout',
  'GroupSubscriptionsRevsharePayout',
  'PublishingAdvanceRebates',
  'LicensingPayment'
])

export type TransactionTypeEnum = z.infer<typeof transactionTypeEnumSchema>
