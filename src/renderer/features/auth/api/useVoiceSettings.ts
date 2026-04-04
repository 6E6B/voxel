import { useMemo } from 'react'
import { useQueries, UseQueryResult } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { Account } from '@renderer/shared/types'
import { VoiceSettings, voiceSettingsSchema } from '@shared/contracts/user'
import { robloxGet } from '@renderer/shared/lib/robloxApi'

export const useVoiceSettingsForAccounts = (accounts: Account[]) => {
  const accountsWithCookies = useMemo(() => accounts.filter((acc) => acc.cookie), [accounts])

  const voiceQueries = useQueries({
    queries: accountsWithCookies.map((account) => ({
      queryKey: queryKeys.accounts.voice(account.cookie!),
      queryFn: () =>
        robloxGet(voiceSettingsSchema, 'https://voice.roblox.com/v1/settings', {
          cookie: account.cookie!
        }),
      enabled: !!account.cookie,
      staleTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000
    }))
  }) as UseQueryResult<VoiceSettings | undefined>[]

  const statusByAccountId = useMemo(() => {
    const map: Record<string, VoiceSettings> = {}

    voiceQueries.forEach((query, index) => {
      const account = accountsWithCookies[index]
      if (account && query.data) {
        map[account.id] = query.data
      }
    })

    return map
  }, [accountsWithCookies, voiceQueries])

  const isLoading = voiceQueries.some((query) => query.isLoading)
  const isFetching = voiceQueries.some((query) => query.isFetching)

  return { statusByAccountId, isLoading, isFetching }
}

