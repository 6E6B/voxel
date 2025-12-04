/// <reference path="./window.d.ts" />
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { Account, AccountStatus, JoinMethod } from './types'
import { mapPresenceToStatus, isActiveStatus } from './utils/statusUtils'
import JoinModal from './components/Modals/JoinModal'
import EditNoteModal from './features/auth/Modals/EditNoteModal'
import AddAccountModal from './features/auth/Modals/AddAccountModal'
import UniversalProfileModal from './components/Modals/UniversalProfileModal'
import GameDetailsModal from './features/games/Modals/GameDetailsModal'
import AccessoryDetailsModal from './features/avatar/Modals/AccessoryDetailsModal'
import Sidebar from './components/UI/navigation/Sidebar'
import NotificationTray from './components/UI/feedback/NotificationTray'
import SnackbarContainer from './features/system/components/SnackbarContainer'

import ContextMenu from './components/UI/menus/ContextMenu'
import AccountsTab from './features/auth/index'
import ProfileTab from './features/profile/index'
import FriendsTab from './features/friends/index'
import GroupsTab from './features/groups/index'
import GamesTab from './features/games/index'
import CatalogTab from './features/catalog/index'
import InventoryTab from './features/inventory/index'
import TransactionsTab from './features/transactions/index'
import LogsTab from './features/system/LogsView'
import SettingsTab from './features/settings/index'
import AvatarTab from './features/avatar/index'
import InstallTab from './features/install/index'
import CommandPalette from './features/command-palette/index'
import PinLockScreen from './components/UI/security/PinLockScreen'
import { OnboardingScreen, useHasCompletedOnboarding } from './features/onboarding'
import { useSidebarResize } from './hooks/useSidebarResize'
import { useClickOutside } from './hooks/useClickOutside'
import { useNotification } from './features/system/stores/useSnackbarStore'
import InstanceSelectionModal from './components/Modals/InstanceSelectionModal'
import { useInstallations } from './features/install/stores/useInstallationsStore'
import { LoadingSpinnerFullPage } from './components/UI/feedback/LoadingSpinner'
import {
  useAccountsManager,
  useAccountStatusPolling,
  useSettingsManager,
  useFriends
} from './hooks/queries'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../shared/queryKeys'
import { useCommandPaletteStore } from './features/command-palette/stores/useCommandPaletteStore'
import { initCatalogSearchIndex } from './features/command-palette/hooks'
import { useFriendPresenceNotifications } from './hooks/useFriendPresenceNotifications'
import {
  useNotificationTrayStore,
  useNotifyServerLocation
} from './features/system/stores/useNotificationTrayStore'

import {
  useActiveTab,
  useModals,
  useOpenModal,
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
  useSetPendingLaunchConfig,
  useAvailableInstallations,
  useSetAvailableInstallations,
  useAppUnlocked,
  useSetAppUnlocked
} from './stores/useUIStore'

import { useSelectedIds, useSetSelectedIds } from './stores/useSelectionStore'

interface JoinConfig {
  method: JoinMethod
  target: string
}

const isMac = window.platform?.isMac ?? false

const App: React.FC = () => {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  useEffect(() => {
    initCatalogSearchIndex()
  }, [])

  const hasCompletedOnboarding = useHasCompletedOnboarding()

  const isAppUnlocked = useAppUnlocked()
  const setAppUnlocked = useSetAppUnlocked()

  const handlePinUnlock = useCallback(() => {
    setAppUnlocked(true)
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.list() })
  }, [queryClient, setAppUnlocked])

  const notifyServerLocation = useNotifyServerLocation()
  const addTrayNotification = useNotificationTrayStore((state) => state.addNotification)

  const openCommandPalette = useCommandPaletteStore((s) => s.open)
  const isCommandPaletteOpen = useCommandPaletteStore((s) => s.isOpen)

  const activeTab = useActiveTab()
  const modals = useModals()
  const openModal = useOpenModal()
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
  const setPendingLaunchConfig = useSetPendingLaunchConfig()
  const availableInstallations = useAvailableInstallations()
  const setAvailableInstallations = useSetAvailableInstallations()

  const selectedIds = useSelectedIds()
  const setSelectedIds = useSetSelectedIds()

  const { accounts, isLoading: isLoadingAccounts, setAccounts, addAccount } = useAccountsManager()
  const { settings, isLoading: isLoadingSettings, updateSettings } = useSettingsManager()

  useAccountStatusPolling()

  const initialSelectionApplied = useRef(false)

  useEffect(() => {
    if (!isLoadingAccounts && !isLoadingSettings && !initialSelectionApplied.current) {
      if (settings.primaryAccountId && accounts.some((a) => a.id === settings.primaryAccountId)) {
        setSelectedIds(new Set([settings.primaryAccountId]))
      }
      initialSelectionApplied.current = true
    }
  }, [isLoadingAccounts, isLoadingSettings, accounts, settings.primaryAccountId, setSelectedIds])

  const sidebarRef = useRef<HTMLElement>(null)
  const { sidebarWidth, isResizing, setIsResizing } = useSidebarResize()

  const filterRef = useRef<HTMLDivElement>(null)

  useClickOutside(filterRef, () => {})

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
  }, [activeMenu])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!isCommandPaletteOpen) {
          openCommandPalette()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openCommandPalette, isCommandPaletteOpen])

  const selectedAccountId = useMemo(() => {
    return selectedIds.size === 1 ? Array.from(selectedIds)[0] : null
  }, [selectedIds])

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null
  }, [accounts, selectedAccountId])

  const { data: friendsData = [] } = useFriends(selectedAccount)

  useFriendPresenceNotifications(friendsData, !!selectedAccount, selectedAccount?.id)

  const [quickProfileUserId, setQuickProfileUserId] = useState<string | null>(null)

  const [commandPaletteAccessory, setCommandPaletteAccessory] = useState<{
    id: number
    name: string
    imageUrl?: string
  } | null>(null)

  const handleCommandPaletteViewProfile = useCallback((userId: string) => {
    setQuickProfileUserId(userId)
  }, [])

  const handleCommandPaletteViewAccessory = useCallback(
    (item: { id: number; name: string; imageUrl?: string }) => {
      setCommandPaletteAccessory(item)
    },
    []
  )

  const multiInstanceAllowed = !isMac && settings.allowMultipleInstances

  const performLaunch = async (config: JoinConfig, installPath?: string) => {
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

    try {
      if (config.method === JoinMethod.PlaceId) {
        launchPlaceId = config.target
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
          showNotification('First selected account needs a valid cookie to check presence', 'error')
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

      for (const account of accountsToLaunch) {
        if (!account.cookie) continue

        try {
          const logsBeforeLaunch = notifyServerLocation ? await window.api.getLogs() : []
          const logTimestampBefore =
            logsBeforeLaunch.length > 0 ? logsBeforeLaunch[0].lastModified : 0

          await window.api.launchGame(
            account.cookie,
            launchPlaceId,
            launchJobId,
            launchFriendId,
            installPath
          )
          showNotification(`Launched successfully for ${account.displayName}`, 'success')

          if (notifyServerLocation) {
            const pollForServerLocation = async () => {
              const maxAttempts = 15 // Poll for up to 30 seconds
              const pollInterval = 2000 // 2 seconds between polls

              for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise((r) => setTimeout(r, pollInterval))

                try {
                  const currentLogs = await window.api.getLogs()
                  const newLog = currentLogs.find(
                    (log) =>
                      log.lastModified > logTimestampBefore &&
                      log.serverIp &&
                      log.placeId === String(launchPlaceId)
                  )

                  if (newLog?.serverIp) {
                    const region = await window.api.getRegionFromAddress(newLog.serverIp)
                    if (region && region !== 'Unknown' && region !== 'Failed') {
                      addTrayNotification({
                        type: 'info',
                        title: 'Server Location',
                        message: `Connected to server in ${region}`,
                        gameInfo: {
                          name: `Place ${launchPlaceId}`,
                          placeId: String(launchPlaceId)
                        }
                      })

                      if ('Notification' in window) {
                        if (Notification.permission === 'granted') {
                          new Notification('Server Location', {
                            body: `Connected to server in ${region}`,
                            icon: undefined // Could add an app icon here
                          })
                        } else if (Notification.permission !== 'denied') {
                          Notification.requestPermission().then((permission) => {
                            if (permission === 'granted') {
                              new Notification('Server Location', {
                                body: `Connected to server in ${region}`,
                                icon: undefined
                              })
                            }
                          })
                        }
                      }
                    }
                    return
                  }
                } catch (pollError) {
                  console.warn('Error polling for server location:', pollError)
                }
              }
              console.warn('Timed out waiting for server location from logs')
            }

            pollForServerLocation()
          }

          await new Promise((r) => setTimeout(r, 3000))
        } catch (e: any) {
          console.error(`Failed to launch for ${account.displayName}`, e)
          showNotification(`Failed to launch for ${account.displayName}: ${e.message}`, 'error')
        }
      }
    } catch (error: any) {
      console.error('Launch error:', error)
      showNotification(`Launch failed: ${error.message}`, 'error')
    }
  }

  const installations = useInstallations()

  const handleLaunch = (config: JoinConfig) => {
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
  }

  const handleCommandPaletteLaunchGame = useCallback(
    (method: JoinMethod, target: string) => {
      if (selectedIds.size === 0) {
        showNotification('Select an account first to launch a game', 'warning')
        return
      }
      handleLaunch({ method, target })
    },
    [selectedIds.size, showNotification]
  )

  const handleInstanceSelect = (path?: string) => {
    closeModal('instanceSelection')
    if (pendingLaunchConfig) {
      performLaunch(pendingLaunchConfig, path)
      setPendingLaunchConfig(null)
    }
  }

  const handleFriendJoin = (placeId: string, jobId?: string, userId?: string) => {
    let config: JoinConfig
    if (userId) {
      config = { method: JoinMethod.Friend, target: `${userId}:${placeId}` }
    } else if (jobId) {
      config = { method: JoinMethod.JobId, target: `${placeId}:${jobId}` }
    } else {
      config = { method: JoinMethod.PlaceId, target: placeId }
    }
    handleLaunch(config)
  }

  const handleIndividualRemove = (id: string) => {
    if (window.confirm('Are you sure you want to remove this account?')) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id))
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds)
        newSet.delete(id)
        setSelectedIds(newSet)
      }
    }
    setActiveMenu(null)
  }

  const handleReauth = (id: string) => {
    showNotification(`Re-authenticating account ${id}... (Mock Action)`, 'info')
    setActiveMenu(null)
  }

  const handleEditNote = (id: string) => {
    const account = accounts.find((a) => a.id === id)
    if (account) {
      setEditingAccount(account)
    }
    setActiveMenu(null)
  }

  const handleSaveNote = (id: string, newNote: string) => {
    setAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...acc, notes: newNote } : acc)))
    if (infoAccount?.id === id) {
      setInfoAccount({ ...infoAccount, notes: newNote })
    }
  }

  const handleAddAccount = async (cookie: string) => {
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

      addAccount(newAccount)
      closeModal('addAccount')
      showNotification(`Successfully added account: ${newAccount.displayName}`, 'success')
    } catch (error) {
      console.error('Failed to add account:', error)
      showNotification('Failed to add account. Please check the cookie and try again.', 'error')
    }
  }

  if (isLoadingAccounts || isLoadingSettings) {
    return (
      <div className="flex h-screen w-full bg-black text-neutral-300 font-sans">
        <LoadingSpinnerFullPage label="Loading..." />
      </div>
    )
  }

  return (
    <div
      id="app-container"
      className="flex h-screen w-full bg-black text-neutral-300 font-sans overflow-hidden overflow-x-hidden selection:bg-neutral-800 selection:text-white"
    >
      {/* Sidebar */}
      <Sidebar
        sidebarWidth={sidebarWidth}
        isResizing={isResizing}
        sidebarRef={sidebarRef}
        onResizeStart={() => setIsResizing(true)}
        selectedAccount={selectedAccount}
        showProfileCard={settings.showSidebarProfileCard}
      />

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col min-w-0 bg-neutral-950 h-full relative overflow-hidden">
        {/* Title Bar spacer */}
        <div
          className="h-[45px] bg-neutral-950 flex-shrink-0 w-full border-b border-neutral-800 flex items-center justify-end"
          style={
            {
              WebkitAppRegion: 'drag',
              paddingRight: isMac ? '16px' : '138px'
            } as React.CSSProperties
          }
        >
          {/* Search and Notification Bell */}
          <div
            className="flex items-center mr-2 gap-2"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                openCommandPalette()
              }}
              className="relative p-2 rounded-md transition-all hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200"
              title="Search (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </button>
            <NotificationTray onOpenUserProfile={handleCommandPaletteViewProfile} />
            {!isMac && <div className="w-px h-5 bg-neutral-700 mx-2" />}
          </div>
        </div>
        {/* Tab panels - conditional rendering for performance */}
        <div className="flex-1 flex flex-col h-full min-h-0 w-full relative">
          {activeTab === 'Accounts' && (
            <AccountsTab
              accounts={accounts}
              onAccountsChange={setAccounts}
              allowMultipleInstances={multiInstanceAllowed}
            />
          )}

          {activeTab === 'Profile' &&
            (selectedAccount ? (
              <ProfileTab account={selectedAccount} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <p>Select an account to view profile</p>
              </div>
            ))}

          {activeTab === 'Friends' && (
            <FriendsTab selectedAccount={selectedAccount} onFriendJoin={handleFriendJoin} />
          )}

          {activeTab === 'Groups' && <GroupsTab selectedAccount={selectedAccount} />}

          {activeTab === 'Games' && <GamesTab onGameSelect={setSelectedGame} />}

          {activeTab === 'Catalog' && (
            <CatalogTab
              onItemSelect={handleCommandPaletteViewAccessory}
              onCreatorSelect={(creatorId) => setQuickProfileUserId(String(creatorId))}
              cookie={accounts.find((a) => a.cookie)?.cookie}
            />
          )}

          {activeTab === 'Inventory' && <InventoryTab account={selectedAccount} />}

          {activeTab === 'Transactions' && <TransactionsTab account={selectedAccount} />}

          {activeTab === 'Logs' && <LogsTab />}

          {activeTab === 'Avatar' && <AvatarTab account={selectedAccount} />}

          {activeTab === 'Install' && <InstallTab />}

          {activeTab === 'Settings' && (
            <SettingsTab
              accounts={accounts}
              settings={settings}
              onUpdateSettings={updateSettings}
            />
          )}
        </div>
      </main>

      {/* Global Modals */}
      <JoinModal
        isOpen={modals.join}
        onClose={() => closeModal('join')}
        onLaunch={handleLaunch}
        selectedCount={selectedIds.size}
      />

      <AddAccountModal
        isOpen={modals.addAccount}
        onClose={() => closeModal('addAccount')}
        onAdd={handleAddAccount}
      />

      <EditNoteModal
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
        onSave={handleSaveNote}
        account={editingAccount}
      />

      <UniversalProfileModal
        isOpen={!!infoAccount}
        onClose={() => setInfoAccount(null)}
        userId={infoAccount?.userId || null}
        selectedAccount={infoAccount}
        initialData={{
          name: infoAccount?.username,
          displayName: infoAccount?.displayName,
          status: infoAccount?.status,
          headshotUrl: infoAccount?.avatarUrl
        }}
      />

      <GameDetailsModal
        isOpen={!!selectedGame}
        onClose={() => setSelectedGame(null)}
        onLaunch={handleLaunch}
        game={selectedGame}
      />

      <InstanceSelectionModal
        isOpen={modals.instanceSelection}
        onClose={() => {
          closeModal('instanceSelection')
          setPendingLaunchConfig(null)
        }}
        onSelect={handleInstanceSelect}
        installations={availableInstallations}
      />

      <UniversalProfileModal
        isOpen={!!quickProfileUserId}
        onClose={() => setQuickProfileUserId(null)}
        userId={quickProfileUserId}
        selectedAccount={accounts.find((a) => a.cookie) || null}
        initialData={{}}
      />

      <AccessoryDetailsModal
        isOpen={!!commandPaletteAccessory}
        onClose={() => setCommandPaletteAccessory(null)}
        assetId={commandPaletteAccessory?.id || null}
        account={accounts.find((a) => a.cookie) || null}
        initialData={
          commandPaletteAccessory
            ? {
                name: commandPaletteAccessory.name,
                imageUrl: commandPaletteAccessory.imageUrl || ''
              }
            : undefined
        }
      />

      {/* Command Palette */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <CommandPalette
            onViewProfile={handleCommandPaletteViewProfile}
            onLaunchGame={handleCommandPaletteLaunchGame}
            onViewAccessory={handleCommandPaletteViewAccessory}
          />
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <ContextMenu
        activeMenu={activeMenu}
        accounts={accounts}
        onViewDetails={setInfoAccount}
        onEditNote={handleEditNote}
        onReauth={handleReauth}
        onRemove={handleIndividualRemove}
        onClose={() => setActiveMenu(null)}
      />

      {/* Snackbar Notifications (replaces NotificationProvider) */}
      <SnackbarContainer />

      {/* PIN Lock Screen Overlay */}
      <AnimatePresence>
        {settings.pinCode && !isAppUnlocked && <PinLockScreen onUnlock={handlePinUnlock} />}
      </AnimatePresence>

      {/* Onboarding Screen Overlay */}
      <AnimatePresence>{!hasCompletedOnboarding && <OnboardingScreen />}</AnimatePresence>
    </div>
  )
}

export default App
