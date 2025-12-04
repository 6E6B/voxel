import React, { useState, useRef } from 'react'
import {
  Users,
  UserCheck,
  Gamepad2,
  Settings,
  Menu,
  ChevronLeft,
  ScrollText,
  Box,
  HardDrive,
  ShoppingBag,
  Package,
  ArrowRightLeft,
  LogOut,
  ChevronUp,
  User,
  Heart,
  UsersRound
} from 'lucide-react'
import { Account } from '@renderer/types'
import SidebarItem from './SidebarItem'
import { Button } from '../buttons/Button'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '../display/Tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useActiveTab,
  useSetActiveTab,
  useSidebarCollapsed,
  useToggleSidebarCollapsed
} from '../../../stores/useUIStore'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { SlidingNumber } from '@renderer/components/UI/specialized/SlidingNumber'
import { formatNumber } from '@renderer/utils/numberUtils'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { useAccountsManager, useAccountStats } from '../../../features/auth/api/useAccounts'
import CreditsDialog from '../dialogs/CreditsDialog'

// Bottom Profile Card Component with dropdown menu
interface ProfileCardProps {
  account: Account
  isCollapsed: boolean
  onSettingsClick: () => void
  onTransactionsClick: () => void
}

const ProfileCard = ({
  account,
  isCollapsed,
  onSettingsClick,
  onTransactionsClick
}: ProfileCardProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreditsOpen, setIsCreditsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { removeAccount } = useAccountsManager()
  const { data: accountStats } = useAccountStats(account.cookie)

  // Use live robux balance if available, otherwise fall back to stored value
  const robuxBalance = accountStats?.robuxBalance ?? account.robuxBalance

  useClickOutside(containerRef, () => setIsDropdownOpen(false))

  const handleCardClick = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleSignOut = () => {
    removeAccount(account.id)
    setIsDropdownOpen(false)
  }

  const dropdownItems = [
    {
      icon: ArrowRightLeft,
      label: 'Transactions',
      onClick: () => {
        onTransactionsClick()
        setIsDropdownOpen(false)
      }
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        onSettingsClick()
        setIsDropdownOpen(false)
      }
    },
    {
      icon: Heart,
      label: 'Credits',
      onClick: () => {
        setIsCreditsOpen(true)
        setIsDropdownOpen(false)
      }
    },
    {
      icon: LogOut,
      label: 'Sign out',
      onClick: handleSignOut,
      danger: true
    }
  ]

  // Collapsed state - just show avatar with tooltip
  if (isCollapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="px-3 py-3" ref={containerRef}>
              <button
                onClick={handleCardClick}
                className="relative w-full flex justify-center group"
              >
                <img
                  className={`h-10 w-10 rounded-full bg-neutral-900 object-cover border-2 transition-all duration-200 ${
                    isDropdownOpen
                      ? 'border-neutral-600 ring-2 ring-neutral-600/30'
                      : 'border-neutral-700 group-hover:border-neutral-500'
                  }`}
                  src={account.avatarUrl}
                  alt={account.displayName}
                />
              </button>

              {/* Collapsed Dropdown */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute bottom-full left-3 mb-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    {/* Mini profile header */}
                    <div className="p-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2.5">
                        <img
                          className="h-8 w-8 rounded-full bg-neutral-900 object-cover border border-neutral-700"
                          src={account.avatarUrl}
                          alt={account.displayName}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-white truncate">
                            {account.displayName}
                          </div>
                          <div className="text-neutral-500 text-xs truncate">
                            @{account.username}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-sm">
                        <RobuxIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <SlidingNumber
                          number={robuxBalance}
                          formatter={formatNumber}
                          className="font-semibold text-white"
                        />
                      </div>
                    </div>
                    <div className="p-1.5">
                      {dropdownItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={item.onClick}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                            item.danger
                              ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                          }`}
                        >
                          <item.icon size={16} />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{account.displayName}</TooltipContent>
        </Tooltip>
        <CreditsDialog isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
      </>
    )
  }

  // Expanded state
  return (
    <div className="px-3 py-3 relative" ref={containerRef}>
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full left-3 right-3 mb-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-1.5">
              {dropdownItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    item.danger
                      ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <item.icon size={16} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <button
        onClick={handleCardClick}
        className={`w-full rounded-xl border transition-all duration-200 text-left ${
          isDropdownOpen
            ? 'border-[var(--accent-color-border)] bg-[rgba(var(--accent-color-rgb),0.08)]'
            : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800/60 hover:border-neutral-700'
        }`}
      >
        <div className="p-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                className={`h-10 w-10 rounded-full bg-neutral-900 object-cover border-2 transition-all duration-200 ${
                  isDropdownOpen ? 'border-neutral-600' : 'border-neutral-700'
                }`}
                src={account.avatarUrl}
                alt={account.displayName}
              />
            </div>

            {/* Name, username, and robux */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-white truncate">
                    {account.displayName}
                  </div>
                  <div className="text-neutral-500 text-xs truncate">@{account.username}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <RobuxIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <SlidingNumber
                    number={robuxBalance}
                    formatter={formatNumber}
                    className="text-sm font-semibold text-white"
                  />
                </div>
              </div>
            </div>

            {/* Chevron indicator */}
            <div
              className={`flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? '' : 'rotate-180'}`}
            >
              <ChevronUp size={16} className="text-neutral-500" />
            </div>
          </div>
        </div>
      </button>
      <CreditsDialog isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
    </div>
  )
}

interface SidebarProps {
  sidebarWidth: number
  isResizing: boolean
  sidebarRef: React.RefObject<HTMLElement | null>
  onResizeStart: () => void
  selectedAccount: Account | null
  showProfileCard: boolean
}

const isMac = window.platform?.isMac ?? false

const Sidebar = ({
  sidebarWidth,
  isResizing,
  sidebarRef,
  onResizeStart,
  selectedAccount,
  showProfileCard
}: SidebarProps) => {
  // Using individual selectors for optimized re-renders
  const activeTab = useActiveTab()
  const setActiveTab = useSetActiveTab()
  const isSidebarCollapsed = useSidebarCollapsed()
  const toggleSidebarCollapsed = useToggleSidebarCollapsed()

  const shouldAnimateLayout = !isResizing

  return (
    <TooltipProvider>
      <motion.aside
        ref={sidebarRef}
        style={{ width: isSidebarCollapsed ? '72px' : `${sidebarWidth}px` }}
        className={`flex flex-col border-r border-neutral-800 bg-[#111111] z-30 relative ${
          isSidebarCollapsed ? 'min-w-[72px]' : ''
        } ${!isResizing ? 'transition-[width] duration-300 ease-in-out' : ''}`}
        layout={shouldAnimateLayout}
      >
        {/* Sidebar Header - extra top padding on macOS for traffic lights */}
        <div
          className={`flex items-center shrink-0 bg-[#111111] transition-all duration-300 ${
            isSidebarCollapsed ? 'justify-center px-0' : 'justify-between pl-6 pr-4'
          }`}
          style={{
            height: isMac ? '72px' : '72px',
            paddingTop: isMac ? '28px' : '0px'
          }}
        >
          <div
            className={`font-bold text-xl tracking-tight text-white transition-all duration-200 flex items-center gap-2 ${
              isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
            }`}
          >
            Voxel
          </div>
          {!isMac && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebarCollapsed}
              className="text-neutral-500 hover:text-white hover:bg-neutral-800"
            >
              {isSidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
            </Button>
          )}
        </div>

        {/* Nav Items */}
        <motion.div
          className="flex-1 py-2 overflow-y-auto scrollbar-hide"
          layout={shouldAnimateLayout}
          layoutScroll={shouldAnimateLayout}
        >
          <nav>
            <SidebarItem
              icon={User}
              label="Profile"
              isActive={activeTab === 'Profile'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Profile')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={Users}
              label="Accounts"
              isActive={activeTab === 'Accounts'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Accounts')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={UserCheck}
              label="Friends"
              isActive={activeTab === 'Friends'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Friends')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={UsersRound}
              label="Groups"
              isActive={activeTab === 'Groups'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Groups')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={Box}
              label="Avatar"
              isActive={activeTab === 'Avatar'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Avatar')}
              disableLayoutAnimation={isResizing}
            />

            {/* Separator */}
            <div className="my-2 mx-3 border-t border-neutral-800" />

            <SidebarItem
              icon={Gamepad2}
              label="Games"
              isActive={activeTab === 'Games'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Games')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={ShoppingBag}
              label="Catalog"
              isActive={activeTab === 'Catalog'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Catalog')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={Package}
              label="Inventory"
              isActive={activeTab === 'Inventory'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Inventory')}
              disableLayoutAnimation={isResizing}
            />

            {/* Separator */}
            <div className="my-2 mx-3 border-t border-neutral-800" />

            <SidebarItem
              icon={HardDrive}
              label="Install"
              isActive={activeTab === 'Install'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Install')}
              disableLayoutAnimation={isResizing}
            />
            <SidebarItem
              icon={ScrollText}
              label="Logs"
              isActive={activeTab === 'Logs'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => setActiveTab('Logs')}
              disableLayoutAnimation={isResizing}
            />
          </nav>
        </motion.div>

        {/* Bottom Profile Card */}
        <div className="border-t border-neutral-800 shrink-0 bg-[#111111] relative">
          {selectedAccount && showProfileCard ? (
            <ProfileCard
              account={selectedAccount}
              isCollapsed={isSidebarCollapsed}
              onSettingsClick={() => setActiveTab('Settings')}
              onTransactionsClick={() => setActiveTab('Transactions')}
            />
          ) : (
            <div className="py-3">
              <nav>
                <SidebarItem
                  icon={Settings}
                  label="Settings"
                  isActive={activeTab === 'Settings'}
                  isCollapsed={isSidebarCollapsed}
                  onClick={() => setActiveTab('Settings')}
                  disableLayoutAnimation={isResizing}
                />
              </nav>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        {!isSidebarCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onMouseDown={onResizeStart}
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:w-1.5 transition-all z-40"
                style={{
                  background: isResizing ? 'rgb(115, 115, 115)' : 'transparent',
                  right: '-2px',
                  width: '4px'
                }}
              >
                <div className="absolute inset-0 hover:bg-neutral-600/50 transition-colors" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Drag to resize</TooltipContent>
          </Tooltip>
        )}
      </motion.aside>
    </TooltipProvider>
  )
}

export default Sidebar
