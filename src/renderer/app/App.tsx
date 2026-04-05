import type { } from '../window'
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { applyAccentColor } from '@renderer/shared/utils/themeUtils'
import { getDominantAccentColorFromImageUrl } from '@renderer/shared/utils/imageAccentColor'
import AppTitleBar from '@renderer/app/layout/AppTitleBar'
import { persistentHeaderTabs, tabFallbackTitles } from '@renderer/app/layout/tab-config'
import AppTabContent from '@renderer/app/AppTabContent'
import AppDialogHost from '@renderer/app/dialogs/AppDialogHost'
import Sidebar from '@renderer/shared/ui/navigation/Sidebar'
import { PageHeaderHost, PageHeaderProvider } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import SnackbarContainer from '../features/system/SnackbarContainer'

import { useHasCompletedOnboarding } from '../features/onboarding'
import { useSidebarResize } from '@renderer/shared/hooks/useSidebarResize'
import { useClickOutside } from '@renderer/shared/hooks/useClickOutside'
import { useAccountsManager, useAccountStatusPolling } from '@renderer/features/auth/api/useAccounts'
import { useSettingsManager } from '@renderer/features/settings/useSettings'
import { useFriends } from '@renderer/features/friends/useFriends'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import {
    getVisibleSidebarTabs,
    sanitizeSidebarHidden,
    sanitizeSidebarOrder,
    SIDEBAR_TAB_IDS
} from '@shared/config/navigation'
import { useFriendPresenceNotifications } from '@renderer/shared/hooks/useFriendPresenceNotifications'
import { useAccountsViewMode } from '../features/settings/useSettings'
import { useTheme } from '@renderer/shared/theme/ThemeContext'
import { useStartupReady } from '@renderer/shared/utils/startup'
import { preloadAllTabs } from '@renderer/app/tab-loaders'

import {
    useActiveTab,
    useSetActiveTab,
    useModals,
    useCloseModal,
    useActiveMenu,
    useSetActiveMenu,
    useEditingAccount,
    useSetEditingAccount,
    useInfoAccount,
    useSetInfoAccount,
    useSelectedGame,
    useSetSelectedGame,
    usePendingLaunchConfig,
    useAvailableInstallations,
    useAppUnlocked,
    useSetAppUnlocked
} from '@renderer/shared/stores/useUIStore'

import { useSelectedIds, useSetSelectedIds } from '@renderer/shared/stores/useSelectionStore'
import { useLauncher } from '../features/games/useLauncher'
import { useAccountActions } from '../features/auth/useAccountActions'

const isMac = window.platform?.isMac ?? false

const App: React.FC = () => {
    const queryClient = useQueryClient()
    const hasCompletedOnboarding = useHasCompletedOnboarding()
    const isStartupReady = useStartupReady()

    // Preload all tab chunks in the background after first paint.
    useEffect(() => {
        if (isStartupReady) preloadAllTabs()
    }, [isStartupReady])

    const isAppUnlocked = useAppUnlocked()
    const setAppUnlocked = useSetAppUnlocked()

    const handlePinUnlock = useCallback(() => {
        setAppUnlocked(true)
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.list() })
    }, [queryClient, setAppUnlocked])

    const activeTab = useActiveTab()
    const setActiveTabState = useSetActiveTab()
    const modals = useModals()
    const closeModal = useCloseModal()
    const activeMenu = useActiveMenu()
    const setActiveMenu = useSetActiveMenu()
    const editingAccount = useEditingAccount()
    const setEditingAccount = useSetEditingAccount()
    const infoAccount = useInfoAccount()
    const setInfoAccount = useSetInfoAccount()
    const selectedGame = useSelectedGame()
    const setSelectedGame = useSetSelectedGame()
    const pendingLaunchConfig = usePendingLaunchConfig()
    const availableInstallations = useAvailableInstallations()

    const selectedIds = useSelectedIds()
    const setSelectedIds = useSetSelectedIds()

    useAccountsViewMode()
    useAccountStatusPolling(isStartupReady)

    const { accounts, isLoading: isLoadingAccounts, setAccounts, addAccount } = useAccountsManager()
    const { settings, isLoading: isLoadingSettings, updateSettings } = useSettingsManager()

    const {
        refreshAccountAvatarUrls,
        handleIndividualRemove,
        handleReauth,
        handleEditNote,
        handleSaveNote,
        handleAddAccount
    } = useAccountActions(accounts, isLoadingAccounts, setAccounts, addAccount, updateSettings, closeModal)

    const {
        multiInstanceAllowed,
        handleLaunch,
        handleFriendJoin,
        handleInstanceSelect,
        clearPendingLaunch
    } = useLauncher(accounts, settings)

    // --- Sidebar config ---
    const sidebarTabOrder = useMemo(
        () => sanitizeSidebarOrder(settings.sidebarTabOrder),
        [settings.sidebarTabOrder]
    )
    const sidebarHiddenTabs = useMemo(
        () => sanitizeSidebarHidden(settings.sidebarHiddenTabs),
        [settings.sidebarHiddenTabs]
    )
    const visibleSidebarTabs = useMemo(
        () => getVisibleSidebarTabs(sidebarTabOrder, sidebarHiddenTabs),
        [sidebarHiddenTabs, sidebarTabOrder]
    )

    // --- Account selection sync ---
    useEffect(() => {
        if (isLoadingAccounts || isLoadingSettings) return

        if (accounts.length === 0) {
            if (settings.primaryAccountId !== null) {
                updateSettings({ primaryAccountId: null })
            }
            if (selectedIds.size > 0) {
                setSelectedIds(new Set())
            }
            return
        }

        if (accounts.length === 1) {
            const onlyAccountId = accounts[0].id
            if (settings.primaryAccountId !== onlyAccountId) {
                updateSettings({ primaryAccountId: onlyAccountId })
            }
            if (selectedIds.size !== 1 || !selectedIds.has(onlyAccountId)) {
                setSelectedIds(new Set([onlyAccountId]))
            }
            return
        }

        const selectedAccountStillExists = Array.from(selectedIds).every((id) =>
            accounts.some((account) => account.id === id)
        )

        if (!selectedAccountStillExists) {
            if (settings.primaryAccountId && accounts.some((a) => a.id === settings.primaryAccountId)) {
                setSelectedIds(new Set([settings.primaryAccountId]))
            } else {
                setSelectedIds(new Set())
            }
            return
        }

        if (
            selectedIds.size === 0 &&
            settings.primaryAccountId &&
            accounts.some((a) => a.id === settings.primaryAccountId)
        ) {
            setSelectedIds(new Set([settings.primaryAccountId]))
        }
    }, [
        isLoadingAccounts,
        isLoadingSettings,
        accounts,
        settings.primaryAccountId,
        selectedIds,
        setSelectedIds,
        updateSettings
    ])

    // --- Sidebar resize ---
    const sidebarRef = useRef<HTMLElement>(null)
    const { sidebarWidth, isResizing, setIsResizing } = useSidebarResize()
    const filterRef = useRef<HTMLDivElement>(null)
    useClickOutside(filterRef, () => { })

    // --- Close active menu on outside click/scroll ---
    useEffect(() => {
        if (!activeMenu) return

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('[data-menu-id]') && !target.closest('.fixed.z-\\[1100\\]')) {
                setActiveMenu(null)
            }
        }
        const handleScroll = () => setActiveMenu(null)

        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('scroll', handleScroll, true)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [activeMenu, setActiveMenu])

    // --- Derived account state ---
    const selectedAccountId = useMemo(() => {
        return selectedIds.size === 1 ? Array.from(selectedIds)[0] : null
    }, [selectedIds])

    const selectedAccount = useMemo(() => {
        return accounts.find((a) => a.id === selectedAccountId) || null
    }, [accounts, selectedAccountId])

    useEffect(() => {
        if (!selectedAccountId || isLoadingAccounts) return
        void refreshAccountAvatarUrls()
    }, [isLoadingAccounts, refreshAccountAvatarUrls, selectedAccountId])

    // --- Dynamic accent color ---
    const accentAvatarUrl = useMemo(() => {
        if (selectedAccount?.avatarUrl) return selectedAccount.avatarUrl
        if (settings.primaryAccountId) {
            return accounts.find((a) => a.id === settings.primaryAccountId)?.avatarUrl ?? null
        }
        return null
    }, [accounts, selectedAccount?.avatarUrl, settings.primaryAccountId])

    useEffect(() => {
        if (!isStartupReady) return
        if (!settings.useDynamicAccentColor || !accentAvatarUrl) return
        const controller = new AbortController()
        getDominantAccentColorFromImageUrl(accentAvatarUrl, { signal: controller.signal })
            .then((hex) => {
                if (controller.signal.aborted) return
                applyAccentColor(hex)
            })
            .catch((error) => {
                if (controller.signal.aborted) return
                console.warn('[theme] failed to derive accent from avatar thumbnail', error)
            })
        return () => controller.abort()
    }, [accentAvatarUrl, isStartupReady, settings.useDynamicAccentColor])

    // --- Friends & presence ---
    const shouldLoadFriends = isStartupReady || activeTab === 'Friends'
    const { data: friendsData = [] } = useFriends(shouldLoadFriends ? selectedAccount : null)
    useFriendPresenceNotifications(
        friendsData,
        isStartupReady && !!selectedAccount,
        selectedAccount?.id
    )

    // --- Theme sync ---
    const { setTheme } = useTheme()
    useEffect(() => {
        setTheme(settings.theme ?? 'system')
    }, [settings.theme, setTheme])

    // --- Tab fallback ---
    useEffect(() => {
        const isSidebarTab = SIDEBAR_TAB_IDS.includes(activeTab)
        if (isSidebarTab && !visibleSidebarTabs.includes(activeTab)) {
            const fallbackTab = visibleSidebarTabs[0]
            if (fallbackTab) setActiveTabState(fallbackTab)
        }
    }, [activeTab, setActiveTabState, visibleSidebarTabs])

    // --- Discord RPC ---
    useEffect(() => {
        window.api.setDiscordRPCTab(activeTab).catch(() => { })
    }, [activeTab])

    const [quickProfileUserId, setQuickProfileUserId] = useState<string | null>(null)
    const [selectedAccessory, setSelectedAccessory] = useState<{
        id: number
        name: string
        imageUrl?: string
    } | null>(null)

    const activeTabFallbackTitle = tabFallbackTitles[activeTab]
    const showPersistentHeader = persistentHeaderTabs.includes(activeTab)

    const handleViewProfile = useCallback((userId: string) => {
        setQuickProfileUserId(userId)
    }, [])

    const handleViewAccessory = useCallback(
        (item: { id: number; name: string; imageUrl?: string }) => {
            setSelectedAccessory(item)
        },
        []
    )

    if (isLoadingAccounts || isLoadingSettings) {
        return <div className="h-screen w-full bg-[var(--color-app-bg)] font-sans" />
    }

    return (
        <div
            id="app-container"
            className={`flex h-screen w-full bg-[var(--color-app-bg)] text-[var(--color-text-muted)] font-sans overflow-hidden overflow-x-hidden selection:bg-[var(--accent-color-soft)] selection:text-[var(--color-text-primary)] ${settings.privacyMode ? 'privacy-mode' : ''}`}
        >
            <PageHeaderProvider>
                <Sidebar
                    sidebarWidth={sidebarWidth}
                    isResizing={isResizing}
                    sidebarRef={sidebarRef}
                    onResizeStart={() => setIsResizing(true)}
                    selectedAccount={selectedAccount}
                    showProfileCard={settings.showSidebarProfileCard}
                    privacyMode={settings.privacyMode}
                    tabOrder={sidebarTabOrder}
                    hiddenTabs={sidebarHiddenTabs}
                />

                <main className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface)] h-full relative overflow-hidden text-[var(--color-text-secondary)]">
                    <AppTitleBar
                        activeTab={activeTab}
                        activeTabFallbackTitle={activeTabFallbackTitle}
                        isMac={isMac}
                        friends={friendsData}
                        onOpenUserProfile={handleViewProfile}
                        onGameSelect={setSelectedGame}
                    />
                    {showPersistentHeader && <PageHeaderHost />}
                    <SnackbarContainer />

                    <div className="flex-1 flex flex-col h-full min-h-0 w-full relative">
                        <AppTabContent
                            activeTab={activeTab}
                            accounts={accounts}
                            selectedAccount={selectedAccount}
                            settings={settings}
                            multiInstanceAllowed={multiInstanceAllowed}
                            onAccountsChange={setAccounts}
                            onFriendJoin={handleFriendJoin}
                            onGameSelect={setSelectedGame}
                            onAccessorySelect={handleViewAccessory}
                            onCreatorSelect={(creatorId) => setQuickProfileUserId(String(creatorId))}
                            onUpdateSettings={updateSettings}
                        />
                    </div>
                </main>

                <AppDialogHost
                    accounts={accounts}
                    selectedAccount={selectedAccount}
                    modals={modals}
                    selectedIdsCount={selectedIds.size}
                    editingAccount={editingAccount}
                    infoAccount={infoAccount}
                    selectedGame={selectedGame}
                    availableInstallations={availableInstallations}
                    pendingLaunchConfig={pendingLaunchConfig}
                    quickProfileUserId={quickProfileUserId}
                    selectedAccessory={selectedAccessory}
                    activeMenu={activeMenu}
                    hasCompletedOnboarding={hasCompletedOnboarding}
                    isAppUnlocked={isAppUnlocked}
                    pinCode={settings.pinCode}
                    privacyMode={settings.privacyMode}
                    onCloseModal={closeModal}
                    onOpenJoinLaunch={handleLaunch}
                    onAddAccount={handleAddAccount}
                    onCloseEditingAccount={() => setEditingAccount(null)}
                    onSaveNote={handleSaveNote}
                    onCloseInfoAccount={() => setInfoAccount(null)}
                    onCloseSelectedGame={() => setSelectedGame(null)}
                    onLaunchGame={handleLaunch}
                    onSelectGameInstallation={handleInstanceSelect}
                    onClearPendingLaunch={clearPendingLaunch}
                    onCloseQuickProfile={() => setQuickProfileUserId(null)}
                    onCloseSelectedAccessory={() => setSelectedAccessory(null)}
                    onViewProfile={handleViewProfile}
                    onViewAccessory={handleViewAccessory}
                    onViewDetails={setInfoAccount}
                    onEditNote={handleEditNote}
                    onReauth={handleReauth}
                    onRemove={handleIndividualRemove}
                    onCloseContextMenu={() => setActiveMenu(null)}
                    onUnlockPin={handlePinUnlock}
                />
            </PageHeaderProvider>
        </div>
    )
}

export default App
