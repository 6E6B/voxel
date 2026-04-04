import { useCallback, useRef, useEffect } from 'react'
import { Account, AccountStatus } from '@renderer/shared/types'
import { mapPresenceToStatus, isActiveStatus } from '@renderer/shared/utils/statusUtils'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import {
    useSetActiveMenu,
    useSetEditingAccount,
    useInfoAccount,
    useSetInfoAccount
} from '@renderer/shared/stores/useUIStore'
import { useSelectedIds, useSetSelectedIds } from '@renderer/shared/stores/useSelectionStore'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'

export function useAccountActions(
    accounts: Account[],
    isLoadingAccounts: boolean,
    setAccounts: React.Dispatch<React.SetStateAction<Account[]>>,
    addAccount: (account: Account) => void,
    updateSettings: (newSettings: Record<string, any>) => void,
    closeModal: (modal: 'join' | 'addAccount' | 'instanceSelection') => void
) {
    const { showNotification } = useNotification()
    const queryClient = useQueryClient()
    const setActiveMenu = useSetActiveMenu()
    const setEditingAccount = useSetEditingAccount()
    const infoAccount = useInfoAccount()
    const setInfoAccount = useSetInfoAccount()
    const selectedIds = useSelectedIds()
    const setSelectedIds = useSetSelectedIds()

    const lastAvatarRefreshAtRef = useRef(0)
    const avatarRefreshInFlightRef = useRef(false)

    const refreshAccountAvatarUrls = useCallback(
        async (options?: { force?: boolean }) => {
            const force = options?.force ?? false
            const now = Date.now()
            const minIntervalMs = 60 * 1000
            if (!force && now - lastAvatarRefreshAtRef.current < minIntervalMs) return
            if (avatarRefreshInFlightRef.current) return

            avatarRefreshInFlightRef.current = true
            const currentAccounts = queryClient.getQueryData<Account[]>(queryKeys.accounts.list()) || []
            const userIds = currentAccounts
                .map((a) => Number(a.userId))
                .filter((id) => Number.isFinite(id))

            if (userIds.length === 0) {
                avatarRefreshInFlightRef.current = false
                return
            }

            try {
                const cookie = currentAccounts.find((a) => a.cookie)?.cookie
                const avatarMap = await window.api.getBatchUserAvatars(userIds, '420x420', cookie)
                setAccounts((prev) => {
                    let changed = false
                    const next = prev.map((acc) => {
                        const uid = Number(acc.userId)
                        const nextUrl = Number.isFinite(uid) ? avatarMap[uid] : null

                        if (nextUrl && nextUrl !== acc.avatarUrl) {
                            changed = true
                            return { ...acc, avatarUrl: nextUrl }
                        }
                        return acc
                    })

                    return changed ? next : prev
                })

                lastAvatarRefreshAtRef.current = now
            } catch (error) {
                console.warn('[accounts] failed to refresh avatar thumbnails', error)
            } finally {
                avatarRefreshInFlightRef.current = false
            }
        },
        [queryClient, setAccounts]
    )

    // Keep account avatars from going stale
    const initialAvatarRefreshRef = useRef(false)
    useEffect(() => {
        if (isLoadingAccounts) return

        if (!initialAvatarRefreshRef.current) {
            void refreshAccountAvatarUrls({ force: true })
            initialAvatarRefreshRef.current = true
        }

        const intervalId = window.setInterval(() => {
            void refreshAccountAvatarUrls()
        }, 60 * 1000)
        return () => {
            window.clearInterval(intervalId)
        }
    }, [isLoadingAccounts, refreshAccountAvatarUrls])

    const handleIndividualRemove = useCallback(
        (id: string) => {
            if (window.confirm('Are you sure you want to remove this account?')) {
                setAccounts((prev) => prev.filter((acc) => acc.id !== id))
                if (selectedIds.has(id)) {
                    const newSet = new Set(selectedIds)
                    newSet.delete(id)
                    setSelectedIds(newSet)
                }
            }
            setActiveMenu(null)
        },
        [setAccounts, selectedIds, setSelectedIds, setActiveMenu]
    )

    const handleReauth = useCallback(
        (id: string) => {
            showNotification(`Re-authenticating account ${id}... (Mock Action)`, 'info')
            setActiveMenu(null)
        },
        [showNotification, setActiveMenu]
    )

    const handleEditNote = useCallback(
        (id: string) => {
            const account = accounts.find((a) => a.id === id)
            if (account) {
                setEditingAccount(account)
            }
            setActiveMenu(null)
        },
        [accounts, setEditingAccount, setActiveMenu]
    )

    const handleSaveNote = useCallback(
        (id: string, newNote: string) => {
            setAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...acc, notes: newNote } : acc)))
            if (infoAccount?.id === id) {
                setInfoAccount({ ...infoAccount, notes: newNote })
            }
        },
        [setAccounts, infoAccount, setInfoAccount]
    )

    const handleAddAccount = useCallback(
        async (cookie: string) => {
            try {
                const cookieValue = cookie.trim()
                const expectedStart =
                    '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_'

                let actualCookieValue = cookieValue
                const match = cookieValue.match(/\.ROBLOSECURITY=([^;]+)/)
                if (match) {
                    actualCookieValue = match[1]
                }

                if (!actualCookieValue.startsWith(expectedStart)) {
                    showNotification(
                        'Invalid cookie format. The cookie must start with the Roblox security warning.',
                        'error'
                    )
                    return
                }

                const data = await window.api.validateCookie(cookie)

                if (accounts.some((acc) => acc.id === data.id.toString())) {
                    showNotification('Account already added!', 'warning')
                    return
                }

                const avatarUrl = await window.api.getAvatarUrl(data.id.toString())

                let status = AccountStatus.Offline
                try {
                    const statusData = await window.api.getAccountStatus(actualCookieValue)
                    if (statusData) {
                        status = mapPresenceToStatus(statusData.userPresenceType)
                    }
                } catch (e) {
                    console.warn('Failed to fetch account status:', e)
                }

                const newAccount: Account = {
                    id: data.id.toString(),
                    displayName: data.displayName,
                    username: data.name,
                    userId: data.id.toString(),
                    cookie: actualCookieValue,
                    status: status,
                    notes: 'Imported via cookie',
                    avatarUrl: avatarUrl,
                    lastActive: isActiveStatus(status) ? new Date().toISOString() : '',
                    robuxBalance: 0,
                    friendCount: 0,
                    followerCount: 0,
                    followingCount: 0
                }

                const isFirstAccount = accounts.length === 0
                addAccount(newAccount)

                if (isFirstAccount) {
                    updateSettings({ primaryAccountId: newAccount.id })
                }

                closeModal('addAccount')
                showNotification(`Successfully added account: ${newAccount.displayName}`, 'success')
            } catch (error) {
                console.error('Failed to add account:', error)
                showNotification('Failed to add account. Please check the cookie and try again.', 'error')
            }
        },
        [accounts, addAccount, closeModal, showNotification, updateSettings]
    )

    return {
        refreshAccountAvatarUrls,
        handleIndividualRemove,
        handleReauth,
        handleEditNote,
        handleSaveNote,
        handleAddAccount
    }
}
