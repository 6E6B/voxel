import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { TabId } from '@renderer/shared/types'

type LoadableComponent<T extends ComponentType<any>> = LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>
}

function lazyWithPreload<T extends ComponentType<any>>(
    loader: () => Promise<{ default: T }>
): LoadableComponent<T> {
    let loadedModule: Promise<{ default: T }> | null = null

    const load = () => {
        if (!loadedModule) {
            loadedModule = loader()
        }

        return loadedModule
    }

    const Component = lazy(load) as LoadableComponent<T>
    Component.preload = load
    return Component
}

export const AccountsTab = lazyWithPreload(() => import('@renderer/features/auth'))
export const ProfileTab = lazyWithPreload(() => import('@renderer/features/profile'))
export const FriendsTab = lazyWithPreload(() => import('@renderer/features/friends'))
export const GroupsTab = lazyWithPreload(() => import('@renderer/features/groups'))
export const GamesTab = lazyWithPreload(() => import('@renderer/features/games'))
export const CatalogTab = lazyWithPreload(() => import('@renderer/features/catalog'))
export const InventoryTab = lazyWithPreload(() => import('@renderer/features/inventory'))
export const TransactionsTab = lazyWithPreload(() => import('@renderer/features/transactions'))
export const SettingsTab = lazyWithPreload(() => import('@renderer/features/settings'))
export const AvatarTab = lazyWithPreload(() => import('@renderer/features/avatar'))
export const InstallTab = lazyWithPreload(() => import('@renderer/features/install'))

const TAB_PRELOADERS: Record<TabId, () => Promise<unknown>> = {
    Accounts: AccountsTab.preload,
    Profile: ProfileTab.preload,
    Friends: FriendsTab.preload,
    Groups: GroupsTab.preload,
    Games: GamesTab.preload,
    Catalog: CatalogTab.preload,
    Inventory: InventoryTab.preload,
    Transactions: TransactionsTab.preload,
    Settings: SettingsTab.preload,
    Avatar: AvatarTab.preload,
    Install: InstallTab.preload
}

export function preloadTab(tabId: TabId): Promise<unknown> {
    return TAB_PRELOADERS[tabId]()
}

export function preloadAllTabs(): void {
    for (const preload of Object.values(TAB_PRELOADERS)) {
        preload()
    }
}