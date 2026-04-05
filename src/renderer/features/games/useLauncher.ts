import { useCallback } from 'react'
import { Account, JoinConfig, JoinMethod } from '@renderer/shared/types'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import { useInstallations } from '@renderer/features/install/useInstallationsStore'
import {
    useOpenModal,
    useCloseModal,
    usePendingLaunchConfig,
    useSetPendingLaunchConfig,
    useSetAvailableInstallations
} from '@renderer/shared/stores/useUIStore'
import { useSelectedIds } from '@renderer/shared/stores/useSelectionStore'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'

const isMac = window.platform?.isMac ?? false

export function useLauncher(
    accounts: Account[],
    settings: { defaultInstallationPath?: string | null; allowMultipleInstances: boolean }
) {
    const { showNotification } = useNotification()
    const queryClient = useQueryClient()
    const selectedIds = useSelectedIds()
    const openModal = useOpenModal()
    const closeModal = useCloseModal()
    const pendingLaunchConfig = usePendingLaunchConfig()
    const setPendingLaunchConfig = useSetPendingLaunchConfig()
    const setAvailableInstallations = useSetAvailableInstallations()
    const installations = useInstallations()

    const multiInstanceAllowed = !isMac && settings.allowMultipleInstances

    const refreshRecentlyPlayed = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.games.recentlyPlayed() })
    }, [queryClient])

    const refreshRecentServers = useCallback(
        (placeId: string) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.servers.recent(placeId) })
        },
        [queryClient]
    )

    const performLaunch = useCallback(
        async (config: JoinConfig, installPath?: string) => {
            closeModal('join')

            const accountsToLaunch = accounts.filter((acc) => selectedIds.has(acc.id))
            if (accountsToLaunch.length === 0) {
                showNotification('No accounts selected', 'warning')
                return
            }

            if (accountsToLaunch.length > 1 && !multiInstanceAllowed) {
                showNotification(
                    isMac
                        ? 'Multi-instance is disabled on macOS.'
                        : 'Multi-instance launching is disabled in Settings.',
                    'warning'
                )
                return
            }

            let launchPlaceId: string | number = ''
            let launchJobId: string | undefined = undefined
            let launchFriendId: string | undefined = undefined
            let launchAccessCode: string | undefined = undefined

            try {
                if (config.method === JoinMethod.PlaceId) {
                    launchPlaceId = config.target
                } else if (config.method === JoinMethod.PrivateServer) {
                    // target format: "placeId:accessCode"
                    const colonIndex = config.target.indexOf(':')
                    if (colonIndex > 0) {
                        launchPlaceId = config.target.slice(0, colonIndex)
                        launchAccessCode = config.target.slice(colonIndex + 1)
                    } else {
                        showNotification('Invalid private server format', 'error')
                        return
                    }
                } else if (config.method === JoinMethod.Friend) {
                    const parts = config.target.split(':')
                    if (parts.length === 2) {
                        launchFriendId = parts[0]
                        launchPlaceId = parts[1]
                    }
                } else if (config.method === JoinMethod.Username) {
                    const targetUser = await window.api.getUserByUsername(config.target)
                    if (!targetUser) {
                        showNotification(`User "${config.target}" not found`, 'error')
                        return
                    }
                    const cookie = accountsToLaunch[0].cookie
                    if (!cookie) {
                        showNotification(
                            'First selected account needs a valid cookie to check presence',
                            'error'
                        )
                        return
                    }
                    const presence = await window.api.getUserPresence(cookie, targetUser.id)

                    if (!presence || presence.userPresenceType !== 2) {
                        showNotification(`${config.target} is not currently in a game`, 'warning')
                        return
                    }
                    const resolvedPlaceId = presence.rootPlaceId ?? presence.placeId
                    if (!resolvedPlaceId) {
                        showNotification('Unable to determine the game location for this user.', 'error')
                        return
                    }
                    launchPlaceId = resolvedPlaceId
                    launchJobId = presence.gameId ?? undefined
                } else if (config.method === JoinMethod.JobId) {
                    if (config.target.includes(':')) {
                        const [pid, jid] = config.target.split(':')
                        launchPlaceId = pid
                        launchJobId = jid
                    } else {
                        showNotification(
                            'Launching by Job ID requires Place ID. Use Format "PlaceID:JobID"',
                            'warning'
                        )
                        return
                    }
                }

                if (!launchPlaceId) {
                    showNotification('Invalid Place ID', 'error')
                    return
                }

                showNotification(`Launching ${accountsToLaunch.length} accounts...`, 'info')

                let launchedAny = false

                for (const account of accountsToLaunch) {
                    if (!account.cookie) continue

                    try {
                        await window.api.launchGame(
                            account.cookie,
                            launchPlaceId,
                            launchJobId,
                            launchFriendId,
                            installPath,
                            launchAccessCode
                        )
                        showNotification(`Launched successfully for ${account.displayName}`, 'success')
                        launchedAny = true

                        await new Promise((r) => setTimeout(r, 3000))
                    } catch (e: any) {
                        console.error(`Failed to launch for ${account.displayName}`, e)
                        showNotification(`Failed to launch for ${account.displayName}: ${e.message}`, 'error')
                    }
                }

                if (launchedAny) {
                    if (launchJobId || launchAccessCode) {
                        refreshRecentServers(String(launchPlaceId))
                    }

                    window.setTimeout(() => {
                        refreshRecentlyPlayed()
                    }, 4000)
                }
            } catch (error: any) {
                console.error('Launch error:', error)
                showNotification(`Launch failed: ${error.message}`, 'error')
            }
        },
        [
            closeModal,
            accounts,
            selectedIds,
            showNotification,
            multiInstanceAllowed,
            refreshRecentServers,
            refreshRecentlyPlayed
        ]
    )

    const handleLaunch = useCallback(
        (config: JoinConfig) => {
            const configuredPath =
                typeof settings.defaultInstallationPath === 'string'
                    ? settings.defaultInstallationPath.trim()
                    : ''

            if (configuredPath) {
                performLaunch(config, configuredPath)
                return
            }

            if (installations.length > 0) {
                if (installations.length === 1) {
                    performLaunch(config, installations[0].path)
                    return
                }
                setAvailableInstallations(installations)
                setPendingLaunchConfig(config)
                closeModal('join')
                openModal('instanceSelection')
                return
            }

            setAvailableInstallations([])
            setPendingLaunchConfig(config)
            closeModal('join')
            openModal('instanceSelection')
        },
        [
            settings.defaultInstallationPath,
            performLaunch,
            installations,
            setAvailableInstallations,
            setPendingLaunchConfig,
            closeModal,
            openModal
        ]
    )

    const handleInstanceSelect = useCallback(
        (path?: string) => {
            closeModal('instanceSelection')
            if (pendingLaunchConfig) {
                performLaunch(pendingLaunchConfig, path)
                setPendingLaunchConfig(null)
            }
        },
        [closeModal, pendingLaunchConfig, performLaunch, setPendingLaunchConfig]
    )

    const handleFriendJoin = useCallback(
        (placeId: string | number, jobId?: string, userId?: string | number) => {
            const placeTarget = typeof placeId === 'number' ? placeId.toString() : placeId
            let config: JoinConfig
            if (userId) {
                config = { method: JoinMethod.Friend, target: `${userId}:${placeTarget}` }
            } else if (jobId) {
                config = { method: JoinMethod.JobId, target: `${placeTarget}:${jobId}` }
            } else {
                config = { method: JoinMethod.PlaceId, target: placeTarget }
            }
            handleLaunch(config)
        },
        [handleLaunch]
    )

    const clearPendingLaunch = useCallback(() => {
        setPendingLaunchConfig(null)
    }, [setPendingLaunchConfig])

    return {
        multiInstanceAllowed,
        handleLaunch,
        handleFriendJoin,
        handleInstanceSelect,
        clearPendingLaunch
    }
}
