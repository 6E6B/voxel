import React from 'react'
import { Account, Game, Settings, TabId } from '@renderer/shared/types'
import AccountsTab from '@renderer/features/auth'
import ProfileTab from '@renderer/features/profile'
import FriendsTab from '@renderer/features/friends'
import GroupsTab from '@renderer/features/groups'
import GamesTab from '@renderer/features/games'
import CatalogTab from '@renderer/features/catalog'
import InventoryTab from '@renderer/features/inventory'
import TransactionsTab from '@renderer/features/transactions'
import SettingsTab from '@renderer/features/settings'
import AvatarTab from '@renderer/features/avatar'
import InstallTab from '@renderer/features/install'

interface AppTabContentProps {
    activeTab: TabId
    accounts: Account[]
    selectedAccount: Account | null
    settings: Settings
    multiInstanceAllowed: boolean
    onAccountsChange: React.Dispatch<React.SetStateAction<Account[]>>
    onFriendJoin: (placeId: string | number, jobId?: string, userId?: string | number) => void
    onGameSelect: (game: Game | null) => void
    onAccessorySelect: (item: { id: number; name: string; imageUrl?: string }) => void
    onCreatorSelect: (creatorId: string | number) => void
    onUpdateSettings: (newSettings: Partial<Settings>) => void
}

const EmptySelection: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)]">
        <p>{message}</p>
    </div>
)

const AppTabContent: React.FC<AppTabContentProps> = ({
    activeTab,
    accounts,
    selectedAccount,
    settings,
    multiInstanceAllowed,
    onAccountsChange,
    onFriendJoin,
    onGameSelect,
    onAccessorySelect,
    onCreatorSelect,
    onUpdateSettings
}) => {
    switch (activeTab) {
        case 'Accounts':
            return (
                <AccountsTab
                    accounts={accounts}
                    onAccountsChange={onAccountsChange}
                    allowMultipleInstances={multiInstanceAllowed}
                />
            )
        case 'Profile':
            return selectedAccount ? (
                <ProfileTab
                    account={selectedAccount}
                    privacyMode={settings.privacyMode}
                    onJoinGame={onFriendJoin}
                />
            ) : (
                <EmptySelection message="Select an account to view profile" />
            )
        case 'Friends':
            return <FriendsTab selectedAccount={selectedAccount} onFriendJoin={onFriendJoin} />
        case 'Groups':
            return <GroupsTab selectedAccount={selectedAccount} />
        case 'Games':
            return <GamesTab onGameSelect={onGameSelect} />
        case 'Catalog':
            return (
                <CatalogTab
                    onItemSelect={onAccessorySelect}
                    onCreatorSelect={onCreatorSelect}
                    cookie={accounts.find((a) => a.cookie)?.cookie}
                />
            )
        case 'Inventory':
            return <InventoryTab account={selectedAccount} />
        case 'Transactions':
            return <TransactionsTab account={selectedAccount} />
        case 'Avatar':
            return <AvatarTab account={selectedAccount} />
        case 'Install':
            return <InstallTab />
        case 'Settings':
            return (
                <SettingsTab
                    accounts={accounts}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                />
            )
        default:
            return null
    }
}

export default AppTabContent