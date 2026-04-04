import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import {
  transactionTypesSchema,
  transactionsResponseSchema,
  transactionTotalsSchema,
  type TransactionTypeEnum,
  type TransactionTimeFrame
} from '@shared/contracts/transactions'
import { robloxGet } from '@renderer/shared/lib/robloxApi'

export const useTransactionTypes = (cookie?: string, userId?: string | number) => {
  return useQuery({
    queryKey: queryKeys.transactions.types(cookie || ''),
    queryFn: () =>
      robloxGet(
        transactionTypesSchema,
        `https://apis.roblox.com/transaction-records/v1/users/${userId}/transaction-types`,
        { cookie: cookie! }
      ),
    enabled: !!cookie && !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

export const useTransactions = (
  cookie: string | undefined,
  transactionType: TransactionTypeEnum,
  enabled: boolean = true,
  userId?: string | number
) => {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions.list(cookie || '', transactionType),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: '100',
        transactionType,
        itemPricingType: 'PaidAndLimited'
      })
      if (pageParam) params.set('cursor', pageParam)

      return robloxGet(
        transactionsResponseSchema,
        `https://apis.roblox.com/transaction-records/v1/users/${userId}/transactions?${params}`,
        { cookie: cookie! }
      )
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.previousPageCursor ?? undefined,
    enabled: !!cookie && !!userId && enabled,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

export const useTransactionTotals = (
  cookie?: string,
  timeFrame: TransactionTimeFrame = 'Month',
  userId?: string | number
) => {
  const usedTypes = 6735032

  return useQuery({
    queryKey: queryKeys.transactions.totals(cookie || '', timeFrame),
    queryFn: () =>
      robloxGet(
        transactionTotalsSchema,
        `https://apis.roblox.com/transaction-records/v1/users/${userId}/transaction-totals?usedTypes=${usedTypes}&timeFrame=${timeFrame}&transactionType=summary`,
        { cookie: cookie! }
      ),
    enabled: !!cookie && !!userId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}
