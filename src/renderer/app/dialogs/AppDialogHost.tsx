import React, { Suspense, lazy } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Account, Game, JoinConfig } from '@renderer/shared/types'
import ContextMenu from '@renderer/shared/ui/menus/ContextMenu'
import PinLockScreen from '@renderer/shared/ui/specialized/PinLockScreen'
import JoinModal from '@renderer/app/dialogs/JoinModal'
import InstanceSelectionModal from '@renderer/app/dialogs/InstanceSelectionModal'
import AddAccountModal from '@renderer/features/auth/dialogs/AddAccountModal'
import EditNoteModal from '@renderer/features/auth/dialogs/EditNoteModal'
import { OnboardingScreen } from '@renderer/features/onboarding'

const GameDetailsModal = lazy(() => import('@renderer/features/games/dialogs/GameDetailsModal'))
const AccessoryDetailsModal = lazy(
    () => import('@renderer/features/avatar/dialogs/AccessoryDetailsModal')
)
const UniversalProfileModal = lazy(() => import('@renderer/app/dialogs/UniversalProfileModal'))

interface ModalsState {
    join: boolean
    addAccount: boolean
    instanceSelection: boolean
}

interface AppDialogHostProps {
    accounts: Account[]
    selectedAccount: Account | null
    modals: ModalsState
    selectedIdsCount: number
    editingAccount: Account | null
    infoAccount: Account | null
    selectedGame: Game | null
    availableInstallations: RobloxInstallation[]
    pendingLaunchConfig: JoinConfig | null
    quickProfileUserId: string | null
    selectedAccessory: { id: number; name: string; imageUrl?: string } | null
    activeMenu: { id: string; x: number; y: number } | null
    hasCompletedOnboarding: boolean
    isAppUnlocked: boolean
    pinCode: string | null
    privacyMode: boolean
    onCloseModal: (modal: keyof ModalsState) => void
    onOpenJoinLaunch: (config: JoinConfig) => void
    onAddAccount: (cookie: string) => void
    onCloseEditingAccount: () => void
    onSaveNote: (id: string, newNote: string) => void
    onCloseInfoAccount: () => void
    onCloseSelectedGame: () => void
    onLaunchGame: (config: JoinConfig) => void
    onSelectGameInstallation: (path?: string) => void
    onClearPendingLaunch: () => void
    onCloseQuickProfile: () => void
    onCloseSelectedAccessory: () => void
    onViewProfile: (userId: string) => void
    onViewAccessory: (item: { id: number; name: string; imageUrl?: string }) => void
    onViewDetails: (account: Account) => void
    onEditNote: (id: string) => void
    onReauth: (id: string) => void
    onRemove: (id: string) => void
    onCloseContextMenu: () => void
    onUnlockPin: () => void
}

import type { RobloxInstallation } from '@renderer/shared/types'

const AppDialogHost: React.FC<AppDialogHostProps> = ({
    accounts,
    selectedAccount,
    modals,
    selectedIdsCount,
    editingAccount,
    infoAccount,
    selectedGame,
    availableInstallations,
    quickProfileUserId,
    selectedAccessory,
    activeMenu,
    hasCompletedOnboarding,
    isAppUnlocked,
    pinCode,
    privacyMode,
    onCloseModal,
    onOpenJoinLaunch,
    onAddAccount,
    onCloseEditingAccount,
    onSaveNote,
    onCloseInfoAccount,
    onCloseSelectedGame,
    onLaunchGame,
    onSelectGameInstallation,
    onClearPendingLaunch,
    onCloseQuickProfile,
    onCloseSelectedAccessory,
    onViewDetails,
    onEditNote,
    onReauth,
    onRemove,
    onCloseContextMenu,
    onUnlockPin
}) => {
    const fallbackAccount = selectedAccount || accounts.find((a) => a.cookie) || null

    return (
        <>
            <JoinModal
                isOpen={modals.join}
                onClose={() => onCloseModal('join')}
                onLaunch={onOpenJoinLaunch}
                selectedCount={selectedIdsCount}
            />

            <AddAccountModal
                isOpen={modals.addAccount}
                onClose={() => onCloseModal('addAccount')}
                onAdd={onAddAccount}
            />

            <EditNoteModal
                isOpen={!!editingAccount}
                onClose={onCloseEditingAccount}
                onSave={onSaveNote}
                account={editingAccount}
            />

            <Suspense fallback={null}>
                <UniversalProfileModal
                    isOpen={!!infoAccount}
                    onClose={onCloseInfoAccount}
                    userId={infoAccount?.userId || null}
                    selectedAccount={infoAccount}
                    privacyMode={privacyMode}
                    initialData={{
                        name: infoAccount?.username,
                        displayName: infoAccount?.displayName,
                        status: infoAccount?.status,
                        headshotUrl: infoAccount?.avatarUrl
                    }}
                />
            </Suspense>

            <Suspense fallback={null}>
                <GameDetailsModal
                    isOpen={!!selectedGame}
                    onClose={onCloseSelectedGame}
                    onLaunch={onLaunchGame}
                    game={selectedGame}
                    account={fallbackAccount}
                />
            </Suspense>

            <InstanceSelectionModal
                isOpen={modals.instanceSelection}
                onClose={() => {
                    onCloseModal('instanceSelection')
                    onClearPendingLaunch()
                }}
                onSelect={onSelectGameInstallation}
                installations={availableInstallations}
            />

            <Suspense fallback={null}>
                <UniversalProfileModal
                    isOpen={!!quickProfileUserId}
                    onClose={onCloseQuickProfile}
                    userId={quickProfileUserId}
                    selectedAccount={fallbackAccount}
                    privacyMode={privacyMode}
                    initialData={{}}
                />
            </Suspense>

            <Suspense fallback={null}>
                <AccessoryDetailsModal
                    isOpen={!!selectedAccessory}
                    onClose={onCloseSelectedAccessory}
                    assetId={selectedAccessory?.id || null}
                    account={fallbackAccount}
                    initialData={
                        selectedAccessory
                            ? {
                                name: selectedAccessory.name,
                                imageUrl: selectedAccessory.imageUrl || ''
                            }
                            : undefined
                    }
                />
            </Suspense>

            <ContextMenu
                activeMenu={activeMenu}
                accounts={accounts}
                onViewDetails={onViewDetails}
                onEditNote={onEditNote}
                onReauth={onReauth}
                onRemove={onRemove}
                onClose={onCloseContextMenu}
            />

            <AnimatePresence>
                {pinCode && !isAppUnlocked && <PinLockScreen onUnlock={onUnlockPin} />}
            </AnimatePresence>

            <AnimatePresence>{!hasCompletedOnboarding && <OnboardingScreen />}</AnimatePresence>
        </>
    )
}

export default AppDialogHost