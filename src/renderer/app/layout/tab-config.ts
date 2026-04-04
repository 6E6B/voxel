import { SIDEBAR_TAB_IDS } from '@shared/config/navigation'
import { TabId } from '@renderer/shared/types'

export const persistentHeaderTabs: TabId[] = [
    'Accounts',
    'Profile',
    'Friends',
    'Groups',
    'Games',
    'Catalog',
    'Inventory',
    'Transactions',
    'Install',
    'Avatar'
]

export const tabFallbackTitles: Partial<Record<(typeof SIDEBAR_TAB_IDS)[number], string>> = {
    Accounts: 'Accounts',
    Profile: 'Profile',
    Friends: 'Friends',
    Groups: 'Groups',
    Games: 'Games',
    Catalog: 'Catalog',
    Inventory: 'Inventory',
    Transactions: 'Transactions',
    Avatar: 'Avatar',
    Install: 'Installations',
    Settings: 'Settings'
}