import React, { Suspense, useEffect, useState, useTransition } from 'react'
import { Account, Game, Settings, TabId } from '@renderer/shared/types'
import {
    AccountsTab,
    AvatarTab,
    CatalogTab,
    FriendsTab,
    GamesTab,
    GroupsTab,
    InstallTab,
    InventoryTab,
    ProfileTab,
    SettingsTab,
    TransactionsTab
} from './tab-loaders'

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
    // Keep showing the current tab until the next tab's lazy chunk is ready.
    // startTransition tells React to NOT show the Suspense fallback for
    // already-revealed content — it holds the old UI until the new one resolves.
    const [displayedTab, setDisplayedTab] = useState(activeTab)
    const [, startTransition] = useTransition()

    useEffect(() => {
        startTransition(() => {
            setDisplayedTab(activeTab)
        })
    }, [activeTab, startTransition])

    let content: React.ReactNode = null

    switch (displayedTab) {
        case 'Accounts':
            content = (
                <AccountsTab
                    accounts={accounts}
                    onAccountsChange={onAccountsChange}
                    allowMultipleInstances={multiInstanceAllowed}
                />
            )
            break
        case 'Profile':
            content = selectedAccount ? (
                <ProfileTab
                    account={selectedAccount}
                    privacyMode={settings.privacyMode}
                    onJoinGame={onFriendJoin}
                />
            ) : (
                <EmptySelection message="Select an account to view profile" />
            )
            break
        case 'Friends':
            content = <FriendsTab selectedAccount={selectedAccount} onFriendJoin={onFriendJoin} />
            break
        case 'Groups':
            content = <GroupsTab selectedAccount={selectedAccount} />
            break
        case 'Games':
            content = <GamesTab onGameSelect={onGameSelect} />
            break
        case 'Catalog':
            content = (
                <CatalogTab
                    onItemSelect={onAccessorySelect}
                    onCreatorSelect={onCreatorSelect}
                    cookie={accounts.find((a) => a.cookie)?.cookie}
                />
            )
            break
        case 'Inventory':
            content = <InventoryTab account={selectedAccount} />
            break
        case 'Transactions':
            content = <TransactionsTab account={selectedAccount} />
            break
        case 'Avatar':
            content = <AvatarTab account={selectedAccount} />
            break
        case 'Install':
            content = <InstallTab />
            break
        case 'Settings':
            content = (
                <SettingsTab
                    accounts={accounts}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                />
            )
            break
        default:
            content = null
            break
    }

    return <Suspense fallback={null}>{content}</Suspense>
}

export default AppTabContent