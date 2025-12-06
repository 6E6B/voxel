import type { LucideIcon } from 'lucide-react'
import { TabId } from '@renderer/types'
import {
  Box,
  Gamepad2,
  HardDrive,
  Newspaper,
  Package,
  ScrollText,
  Settings as SettingsIcon,
  ShoppingBag,
  User,
  UserCheck,
  Users,
  UsersRound
} from 'lucide-react'

export type SidebarSection = 'profile' | 'explore' | 'system'

export interface SidebarTabDefinition {
  id: TabId
  label: string
  icon: LucideIcon
  section: SidebarSection
  locked?: boolean
}

export const SIDEBAR_TAB_DEFINITIONS: SidebarTabDefinition[] = [
  { id: 'Profile', label: 'Profile', icon: User, section: 'profile' },
  { id: 'Accounts', label: 'Accounts', icon: Users, section: 'profile' },
  { id: 'Friends', label: 'Friends', icon: UserCheck, section: 'profile' },
  { id: 'Groups', label: 'Groups', icon: UsersRound, section: 'profile' },
  { id: 'Avatar', label: 'Avatar', icon: Box, section: 'profile' },
  { id: 'News', label: 'News', icon: Newspaper, section: 'profile' },
  { id: 'Games', label: 'Games', icon: Gamepad2, section: 'explore' },
  { id: 'Catalog', label: 'Catalog', icon: ShoppingBag, section: 'explore' },
  { id: 'Inventory', label: 'Inventory', icon: Package, section: 'explore' },
  { id: 'Install', label: 'Install', icon: HardDrive, section: 'system' },
  { id: 'Logs', label: 'Logs', icon: ScrollText, section: 'system' },
  { id: 'Settings', label: 'Settings', icon: SettingsIcon, section: 'system', locked: true }
]

export const SIDEBAR_TAB_DEFINITION_MAP: Record<TabId, SidebarTabDefinition | undefined> =
  SIDEBAR_TAB_DEFINITIONS.reduce(
    (acc, tab) => {
      acc[tab.id] = tab
      return acc
    },
    {} as Record<TabId, SidebarTabDefinition | undefined>
  )
