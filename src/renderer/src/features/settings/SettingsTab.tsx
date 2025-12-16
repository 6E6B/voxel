import React, { useEffect, useMemo, useState } from 'react'
import {
  Users,
  HardDrive,
  Palette,
  Bell,
  Lock,
  Shield,
  Sliders,
  Type,
  Plus,
  Trash2,
  Check,
  Info,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react'
import { motion } from 'framer-motion'
import Color from 'color'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import {
  Account,
  Settings,
  TabId,
  ThemePreference,
  TintPreference,
  DEFAULT_ACCENT_COLOR
} from '../../types'
import { cn } from '../../lib/utils'
import CustomCheckbox from '../../components/UI/buttons/CustomCheckbox'
import CustomDropdown, { DropdownOption } from '../../components/UI/menus/CustomDropdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '../../components/UI/dialogs/Dialog'
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerOutput,
  ColorPickerFormat
} from '../../components/UI/inputs/ColorPicker'
import {
  useNotificationTrayStore,
  useNotifyFriendOnline,
  useNotifyFriendInGame,
  useNotifyFriendRemoved,
  useNotifyServerLocation
} from '../system/stores/useNotificationTrayStore'
import { useSetAppUnlocked } from '../../stores/useUIStore'
import { queryKeys } from '../../../../shared/queryKeys'
import PinSetupDialog from '../../components/UI/security/PinSetupDialog'
import { useInstallations } from '../install/stores/useInstallationsStore'
import {
  CustomFont,
  getGoogleFontUrl,
  loadFont,
  unloadFont,
  applyFont,
  isValidGoogleFontFamily
} from '../../utils/fontUtils'
import { UpdaterCard } from '../updater'
import PrivacyPolicyModal from '../../components/Modals/PrivacyPolicyModal'
import {
  DEFAULT_SIDEBAR_TAB_ORDER,
  LOCKED_SIDEBAR_TABS,
  sanitizeSidebarHidden,
  sanitizeSidebarOrder
} from '@shared/navigation'
import { SIDEBAR_TAB_DEFINITION_MAP, SidebarTabDefinition } from '../../constants/sidebarTabs'

interface SettingsTabProps {
  accounts: Account[]
  settings: Settings
  onUpdateSettings: (newSettings: Partial<Settings>) => void
}

const isMac = window.platform?.isMac ?? false

const Section: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
}> = ({ title, description, children }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-400">{description}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
)

const SettingsCard: React.FC<{
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}> = ({ title, description, icon, actions, children }) => (
  <div className="p-4 bg-[var(--color-surface-strong)] rounded-[var(--radius-xl)] border border-neutral-800/50 hover:border-neutral-700/50 transition-colors space-y-3 [--card-radius:var(--radius-xl)] [--card-gap:0.5rem] [--control-radius:calc(var(--card-radius)_-_var(--card-gap))]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
            {icon}
          </div>
        )}
        <div>
          <h4 className="text-sm font-medium text-white">{title}</h4>
          {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
)

const ToggleRow: React.FC<{
  title: string
  description: React.ReactNode
  checked: boolean
  onChange: () => void
  disabled?: boolean
  icon?: React.ReactNode
  hint?: React.ReactNode
}> = ({ title, description, checked, onChange, disabled, icon, hint }) => (
  <div className="flex items-start gap-3 p-4 bg-[var(--color-surface-muted)] rounded-[var(--control-radius)] border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
    <div className="mt-1">
      <CustomCheckbox checked={checked} onChange={onChange} disabled={disabled} />
    </div>
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
      {hint}
    </div>
  </div>
)

const SettingsTab: React.FC<SettingsTabProps> = ({ accounts, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'notifications' | 'security' | 'about'
  >('general')
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [newFontFamily, setNewFontFamily] = useState('')
  const [fontError, setFontError] = useState<string | null>(null)
  const [isAddingFont, setIsAddingFont] = useState(false)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const setAppUnlocked = useSetAppUnlocked()

  // Use shared installations store instead of local state + localStorage
  const installations = useInstallations()

  const sidebarTabOrder = useMemo(
    () => sanitizeSidebarOrder(settings.sidebarTabOrder),
    [settings.sidebarTabOrder]
  )
  const sidebarHiddenTabs = useMemo(
    () => sanitizeSidebarHidden(settings.sidebarHiddenTabs),
    [settings.sidebarHiddenTabs]
  )
  const sidebarTabs = useMemo(
    () =>
      sidebarTabOrder
        .map((tabId) => SIDEBAR_TAB_DEFINITION_MAP[tabId])
        .filter(Boolean) as SidebarTabDefinition[],
    [sidebarTabOrder]
  )
  const hiddenSidebarTabsSet = useMemo(() => new Set(sidebarHiddenTabs), [sidebarHiddenTabs])

  // Custom fonts queries
  const { data: customFonts = [] } = useQuery({
    queryKey: ['customFonts'],
    queryFn: () => window.api.getCustomFonts(),
    staleTime: Infinity
  })

  const { data: activeFont = null } = useQuery({
    queryKey: ['activeFont'],
    queryFn: () => window.api.getActiveFont(),
    staleTime: Infinity
  })

  // Load fonts and apply active font on mount
  useEffect(() => {
    customFonts.forEach((font) => {
      loadFont(font).catch(console.error)
    })
  }, [customFonts])

  useEffect(() => {
    applyFont(activeFont)
  }, [activeFont])

  const addFontMutation = useMutation({
    mutationFn: async (font: CustomFont) => {
      await loadFont(font)
      await window.api.addCustomFont(font)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFonts'] })
      setNewFontFamily('')
      setFontError(null)
    },
    onError: (error: Error) => {
      setFontError(error.message)
    }
  })

  const removeFontMutation = useMutation({
    mutationFn: async (family: string) => {
      unloadFont(family)
      await window.api.removeCustomFont(family)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFonts'] })
      queryClient.invalidateQueries({ queryKey: ['activeFont'] })
    }
  })

  const setActiveFontMutation = useMutation({
    mutationFn: async (family: string | null) => {
      await window.api.setActiveFont(family)
      applyFont(family)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeFont'] })
    }
  })

  const handleAddFont = async () => {
    const trimmedFamily = newFontFamily.trim()
    if (!trimmedFamily) {
      setFontError('Please enter a font family name')
      return
    }

    if (!isValidGoogleFontFamily(trimmedFamily)) {
      setFontError('Invalid font family name. Use only letters, numbers, and spaces.')
      return
    }

    // Check if font already exists
    if (customFonts.some((f) => f.family.toLowerCase() === trimmedFamily.toLowerCase())) {
      setFontError('This font has already been added')
      return
    }

    setIsAddingFont(true)
    setFontError(null)

    try {
      const url = getGoogleFontUrl(trimmedFamily)
      await addFontMutation.mutateAsync({ family: trimmedFamily, url })
    } catch {
      setFontError('Failed to load font. Make sure the font name is correct.')
    } finally {
      setIsAddingFont(false)
    }
  }

  // Notification settings from store
  const notifyFriendOnline = useNotifyFriendOnline()
  const notifyFriendInGame = useNotifyFriendInGame()
  const notifyFriendRemoved = useNotifyFriendRemoved()
  const notifyServerLocation = useNotifyServerLocation()
  const setNotifyFriendOnline = useNotificationTrayStore((state) => state.setNotifyFriendOnline)
  const setNotifyFriendInGame = useNotificationTrayStore((state) => state.setNotifyFriendInGame)
  const setNotifyFriendRemoved = useNotificationTrayStore((state) => state.setNotifyFriendRemoved)
  const setNotifyServerLocation = useNotificationTrayStore((state) => state.setNotifyServerLocation)

  // Discord Rich Presence
  const { data: discordRPCEnabled = false, refetch: refetchDiscordRPC } = useQuery({
    queryKey: ['discordRPCEnabled'],
    queryFn: () => window.api.isDiscordRPCEnabled(),
    staleTime: 5000
  })

  const toggleDiscordRPC = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) {
        await window.api.enableDiscordRPC()
      } else {
        await window.api.disableDiscordRPC()
      }
    },
    onSuccess: () => {
      refetchDiscordRPC()
    }
  })

  const handlePrimaryAccountChange = (value: string) => {
    onUpdateSettings({ primaryAccountId: value === '' ? null : value })
  }

  const handleDefaultInstallChange = (value: string) => {
    onUpdateSettings({ defaultInstallationPath: value === '' ? undefined : value })
  }

  const handleThemeChange = (value: string) => {
    onUpdateSettings({ theme: value as ThemePreference })
  }

  const handleTintChange = (value: string) => {
    onUpdateSettings({ tint: value as TintPreference })
  }

  const handleAccentColorChange = (rgba: [number, number, number, number]) => {
    try {
      const color = Color.rgb(rgba[0], rgba[1], rgba[2], rgba[3])
      const hex = color.hex()
      onUpdateSettings({ accentColor: hex })
    } catch (e) {
      console.error('Failed to convert color:', e)
    }
  }

  const handleProfileCardToggle = () => {
    onUpdateSettings({ showSidebarProfileCard: !settings.showSidebarProfileCard })
  }

  const handlePrivacyModeToggle = () => {
    onUpdateSettings({ privacyMode: !settings.privacyMode })
  }

  const handleToggleTabVisibility = (tabId: TabId) => {
    if (LOCKED_SIDEBAR_TABS.includes(tabId)) return

    const nextHidden = hiddenSidebarTabsSet.has(tabId)
      ? sidebarHiddenTabs.filter((id) => id !== tabId)
      : [...sidebarHiddenTabs, tabId]

    onUpdateSettings({ sidebarHiddenTabs: nextHidden })
  }

  const handleMoveTab = (tabId: TabId, direction: number) => {
    const currentIndex = sidebarTabOrder.indexOf(tabId)
    if (currentIndex === -1) return

    const targetIndex = currentIndex + direction
    if (targetIndex < 0 || targetIndex >= sidebarTabOrder.length) return

    const nextOrder = [...sidebarTabOrder]
    const [moved] = nextOrder.splice(currentIndex, 1)
    nextOrder.splice(targetIndex, 0, moved)
    onUpdateSettings({ sidebarTabOrder: nextOrder })
  }

  const handleResetNavigation = () => {
    onUpdateSettings({
      sidebarTabOrder: DEFAULT_SIDEBAR_TAB_ORDER,
      sidebarHiddenTabs: []
    })
  }

  const handlePinSave = async (newPin: string | null, currentPin?: string) => {
    // Use secure setPin API - requires current PIN if one is already set
    const result = await window.api.setPin(newPin, currentPin)
    if (result.success) {
      // If PIN is set, mark app as unlocked so user isn't immediately locked out
      if (newPin) {
        setAppUnlocked(true)
      }
      // Invalidate settings query to update UI (pinCode: 'SET')
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.snapshot() })
    }
    return result
  }

  const accountOptions: DropdownOption[] = [
    { value: '', label: 'None' },
    ...accounts.map((account) => ({
      value: account.id,
      label: account.displayName,
      labelNode: settings.privacyMode ? (
        <span className="privacy-blur">{account.displayName}</span>
      ) : undefined,
      subLabel: `@${account.username}`,
      subLabelNode: settings.privacyMode ? (
        <span className="privacy-blur">@{account.username}</span>
      ) : undefined
    }))
  ]

  const installationOptions: DropdownOption[] = [
    { value: '', label: 'System Default' },
    ...installations.map((inst) => ({
      value: inst.path,
      label: inst.name,
      subLabel: inst.version.substring(0, 15) + '...'
    }))
  ]

  const themeOptions: DropdownOption[] = [
    { value: 'system', label: 'System', subLabel: 'Match OS setting' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ]

  const tintOptions: DropdownOption[] = [
    { value: 'neutral', label: 'Neutral', subLabel: 'Gray, no color cast' },
    { value: 'cool', label: 'Cool', subLabel: 'Slight blue tint (legacy)' }
  ]

  const handleResetAccent = () => {
    onUpdateSettings({ accentColor: DEFAULT_ACCENT_COLOR })
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
      <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h2>
      </div>

      {/* Tabs Header */}
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex">
            {/* Animated sliding indicator */}
            <motion.div
              className="absolute bottom-0 h-0.5 bg-[var(--accent-color)] z-20"
              initial={false}
              animate={{
                left:
                  activeTab === 'general'
                    ? '0%'
                    : activeTab === 'appearance'
                      ? '20%'
                      : activeTab === 'notifications'
                        ? '40%'
                        : activeTab === 'security'
                          ? '60%'
                          : '80%',
                width: '20%'
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />

            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-muted)]',
                activeTab === 'general'
                  ? 'text-[var(--color-text-primary)] bg-[var(--accent-color-faint)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Sliders size={16} />
              General
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-muted)]',
                activeTab === 'appearance'
                  ? 'text-[var(--color-text-primary)] bg-[var(--accent-color-faint)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Type size={16} />
              Appearance
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-muted)]',
                activeTab === 'notifications'
                  ? 'text-[var(--color-text-primary)] bg-[var(--accent-color-faint)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Bell size={16} />
              Notifications
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-muted)]',
                activeTab === 'security'
                  ? 'text-[var(--color-text-primary)] bg-[var(--accent-color-faint)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Shield size={16} />
              Security
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-muted)]',
                activeTab === 'about'
                  ? 'text-[var(--color-text-primary)] bg-[var(--accent-color-faint)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Info size={16} />
              About
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        <div className="max-w-2xl mx-auto pb-8">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">General Settings</h3>
                <p className="text-sm text-neutral-400">
                  Manage your account and application preferences.
                </p>
              </div>

              <Section
                title="Accounts & launch"
                description="Set the defaults for selecting accounts and launching Roblox."
              >
                <SettingsCard
                  title="Primary account"
                  description="Automatically select this account when the application starts."
                  icon={<Users size={16} />}
                >
                  <CustomDropdown
                    options={accountOptions}
                    value={settings.primaryAccountId || ''}
                    onChange={handlePrimaryAccountChange}
                    placeholder="Select primary account"
                  />
                </SettingsCard>

                <SettingsCard
                  title="Default installation"
                  description="Choose which Roblox installation to use when launching games. If not set, you'll be prompted each time."
                  icon={<HardDrive size={16} />}
                >
                  <CustomDropdown
                    options={installationOptions}
                    value={settings.defaultInstallationPath || ''}
                    onChange={handleDefaultInstallChange}
                    placeholder="Select installation"
                  />
                </SettingsCard>
              </Section>

              <Section
                title="Privacy"
                description="Hide your account identity when sharing screenshots or streaming."
              >
                <SettingsCard
                  title="Privacy mode"
                  description="Blur account names and avatars throughout the app."
                  icon={<EyeOff size={16} />}
                >
                  <ToggleRow
                    title="Enable privacy mode"
                    description={
                      'Blurs all account names and pictures in the Accounts tab, sidebar card, and other places your account identity appears.'
                    }
                    checked={settings.privacyMode}
                    onChange={handlePrivacyModeToggle}
                  />
                </SettingsCard>
              </Section>

              <Section
                title="Navigation"
                description="Control what shows in the sidebar and how it's ordered."
              >
                <SettingsCard
                  title="Sidebar profile card"
                  description="Display the selected account's quick profile in the sidebar."
                  icon={<Users size={16} />}
                >
                  <ToggleRow
                    title="Show sidebar profile card"
                    description="Display the selected account's quick profile card to see your profile faster."
                    checked={settings.showSidebarProfileCard}
                    onChange={handleProfileCardToggle}
                  />
                </SettingsCard>

                <SettingsCard
                  title="Sidebar tabs"
                  description="Hide tabs you do not use and reorder the sidebar to match your workflow."
                  icon={<Sliders size={16} />}
                  actions={
                    <button
                      type="button"
                      onClick={handleResetNavigation}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/40 transition-colors"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  }
                >
                  <div className="space-y-2">
                    {sidebarTabs.map((tab, index) => {
                      const isHidden = hiddenSidebarTabsSet.has(tab.id)
                      const isLocked = LOCKED_SIDEBAR_TABS.includes(tab.id)

                      return (
                        <div
                          key={tab.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--control-radius)] border border-neutral-800 bg-[var(--color-surface-muted)]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CustomCheckbox
                              checked={!isHidden || isLocked}
                              disabled={isLocked}
                              onChange={() => handleToggleTabVisibility(tab.id)}
                            />
                            <tab.icon size={16} className="text-neutral-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white">{tab.label}</div>
                              <div className="flex items-center gap-1 text-xs text-neutral-500">
                                {isLocked ? (
                                  <span className="text-[var(--accent-color)] font-medium">
                                    Always visible
                                  </span>
                                ) : isHidden ? (
                                  <>
                                    <EyeOff size={12} />
                                    Hidden
                                  </>
                                ) : (
                                  <>
                                    <Eye size={12} />
                                    Visible
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveTab(tab.id, -1)}
                              disabled={index === 0}
                              className="p-2 rounded-[var(--control-radius)] border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              aria-label={`Move ${tab.label} up`}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTab(tab.id, 1)}
                              disabled={index === sidebarTabs.length - 1}
                              className="p-2 rounded-[var(--control-radius)] border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              aria-label={`Move ${tab.label} down`}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </SettingsCard>
              </Section>

              <Section title="Integrations" description="Connect Altman with external services.">
                <SettingsCard
                  title="Discord Rich Presence"
                  description="Show your current activity on Discord, including the game you're playing."
                  icon={<Bell size={16} />}
                >
                  <ToggleRow
                    title="Discord Rich Presence"
                    description="Let Discord display when you're browsing or playing through Altman."
                    checked={discordRPCEnabled}
                    onChange={() => toggleDiscordRPC.mutate(!discordRPCEnabled)}
                    disabled={toggleDiscordRPC.isPending}
                    hint={
                      toggleDiscordRPC.isPending ? (
                        <p className="text-xs text-[var(--accent-color)]">
                          {discordRPCEnabled ? 'Disabling...' : 'Connecting to Discord...'}
                        </p>
                      ) : null
                    }
                  />
                </SettingsCard>
              </Section>

              <Section
                title="Advanced"
                description="Power options that may have platform or policy restrictions."
              >
                <SettingsCard
                  title="Multiple instances"
                  description={
                    isMac
                      ? 'Disabled on macOS.'
                      : 'Enable launching multiple Roblox clients simultaneously.'
                  }
                  icon={<Lock size={16} />}
                >
                  <ToggleRow
                    title="Allow multiple instances"
                    description={
                      isMac
                        ? 'This option is unavailable on macOS.'
                        : 'Launch more than one Roblox client at the same time.'
                    }
                    checked={false}
                    onChange={() => { }}
                    disabled
                    hint={
                      !isMac && (
                        <span className="text-xs text-yellow-600/80">
                          Note: This feature is considered to be against the Roblox Terms of
                          Service. Use at your own risk.
                        </span>
                      )
                    }
                  />
                </SettingsCard>
              </Section>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Appearance</h3>
                <p className="text-sm text-neutral-400">
                  Customize fonts and visual styles across the app.
                </p>
              </div>

              <Section
                title="Theme & colors"
                description="Adjust the overall look of the interface."
              >
                <SettingsCard
                  title="Theme"
                  description="Choose light or dark mode, or follow your system preference."
                  icon={<Palette size={16} />}
                >
                  <CustomDropdown
                    options={themeOptions}
                    value={settings.theme}
                    onChange={handleThemeChange}
                    placeholder="Select theme"
                  />
                </SettingsCard>

                <SettingsCard
                  title="Tint"
                  description="Choose the base tint used for surfaces and backgrounds."
                  icon={<Palette size={16} />}
                >
                  <CustomDropdown
                    options={tintOptions}
                    value={settings.tint}
                    onChange={handleTintChange}
                    placeholder="Select tint"
                  />
                </SettingsCard>

                <SettingsCard
                  title="Accent color"
                  description="Customize the highlight color used for buttons, indicators, and focus rings."
                  icon={<Palette size={16} />}
                >
                  <ToggleRow
                    title="Dynamic accent color"
                    description="Automatically derive the accent color from your avatar's appearance."
                    checked={settings.useDynamicAccentColor}
                    onChange={() =>
                      onUpdateSettings({ useDynamicAccentColor: !settings.useDynamicAccentColor })
                    }
                  />

                  <div
                    className={cn(
                      'flex items-center gap-3 transition-opacity duration-200',
                      settings.useDynamicAccentColor && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(true)}
                      className="h-12 w-12 rounded-[var(--control-radius)] border border-neutral-800 bg-transparent cursor-pointer hover:border-neutral-700 transition-colors flex-shrink-0"
                      style={{ backgroundColor: settings.accentColor }}
                      aria-label="Select accent color"
                    />
                    <div className="flex-1 flex flex-col justify-center gap-2">
                      <label
                        htmlFor="accent-color-hex"
                        className="text-xs text-neutral-500 uppercase tracking-wide"
                      >
                        Hex value
                      </label>
                      <input
                        id="accent-color-hex"
                        type="text"
                        value={settings.accentColor}
                        readOnly
                        placeholder="#ffffff"
                        spellCheck={false}
                        className="mt-1 w-full bg-[var(--color-surface-muted)] border border-neutral-800 rounded-[var(--radius-md)] px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] focus:outline-none cursor-pointer"
                        onClick={() => setIsColorPickerOpen(true)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleResetAccent}
                          className="px-3 py-2 text-xs font-medium rounded-[var(--control-radius)] border border-neutral-800 text-neutral-200 hover:border-neutral-700 hover:text-white transition-colors"
                        >
                          Reset to default
                        </button>
                        <span className="text-xs text-neutral-500 self-center">
                          Default: {DEFAULT_ACCENT_COLOR}
                        </span>
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </Section>

              <Section
                title="Typography"
                description="Manage the fonts used throughout the interface."
              >
                <SettingsCard
                  title="Custom fonts"
                  description="Add fonts from Google Fonts to use in the application."
                  icon={<Type size={16} />}
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFontFamily}
                      onChange={(e) => {
                        setNewFontFamily(e.target.value)
                        setFontError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddFont()
                        }
                      }}
                      placeholder="Enter Google Font name (e.g., Roboto)"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[var(--accent-color)] focus:outline-none"
                    />
                    <button
                      onClick={handleAddFont}
                      disabled={isAddingFont || !newFontFamily.trim()}
                      className="px-4 py-2 bg-[var(--accent-color)] text-[var(--accent-color-foreground)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isAddingFont ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Add
                    </button>
                  </div>

                  {fontError && <p className="text-xs text-red-400">{fontError}</p>}

                  <p className="text-xs text-neutral-600">
                    Browse available fonts at{' '}
                    <a
                      href="https://fonts.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-color)] hover:underline"
                    >
                      fonts.google.com
                    </a>
                  </p>
                </SettingsCard>

                <SettingsCard
                  title="Active font"
                  description="Select which font to use for the application interface."
                  icon={<Type size={16} />}
                >
                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveFontMutation.mutate(null)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                        activeFont === null
                          ? 'border-[var(--accent-color)] bg-[var(--accent-color-faint)]'
                          : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-sm text-white"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          Inter (Default)
                        </span>
                      </div>
                      {activeFont === null && (
                        <Check size={16} className="text-[var(--accent-color)]" />
                      )}
                    </button>

                    {customFonts.map((font) => (
                      <div
                        key={font.family}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                          activeFont === font.family
                            ? 'border-[var(--accent-color)] bg-[var(--accent-color-faint)]'
                            : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700'
                        )}
                      >
                        <button
                          onClick={() => setActiveFontMutation.mutate(font.family)}
                          className="flex-1 flex items-center gap-3 text-left"
                        >
                          <span
                            className="text-sm text-white"
                            style={{ fontFamily: `'${font.family}', sans-serif` }}
                          >
                            {font.family}
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          {activeFont === font.family && (
                            <Check size={16} className="text-[var(--accent-color)]" />
                          )}
                          <button
                            onClick={() => removeFontMutation.mutate(font.family)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="Remove font"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {customFonts.length === 0 && (
                      <p className="text-sm text-neutral-600 py-4 text-center">
                        No custom fonts added yet. Add a font from Google Fonts above.
                      </p>
                    )}
                  </div>
                </SettingsCard>
              </Section>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Notifications</h3>
                <p className="text-sm text-neutral-400">
                  Configure how and when you want to be notified.
                </p>
              </div>

              <Section
                title="Friend activity"
                description="Choose which friend updates trigger an alert."
              >
                <SettingsCard
                  title="Friend alerts"
                  description="Notifications about your friends coming online, joining games, or removing you."
                  icon={<Bell size={16} />}
                >
                  <ToggleRow
                    title="Friend online"
                    description="Get notified when your friends come online."
                    checked={notifyFriendOnline}
                    onChange={() => setNotifyFriendOnline(!notifyFriendOnline)}
                    icon={<Users size={14} />}
                  />
                  <ToggleRow
                    title="Friend starts playing"
                    description="Get notified when your friends start playing a game."
                    checked={notifyFriendInGame}
                    onChange={() => setNotifyFriendInGame(!notifyFriendInGame)}
                    icon={<Bell size={14} />}
                  />
                  <ToggleRow
                    title="Friend removed you"
                    description="Get notified when someone unfriends you."
                    checked={notifyFriendRemoved}
                    onChange={() => setNotifyFriendRemoved(!notifyFriendRemoved)}
                    icon={<Trash2 size={14} />}
                  />
                </SettingsCard>
              </Section>

              <Section title="Sessions" description="Surface details about the servers you join.">
                <SettingsCard
                  title="Server information"
                  description="Show the server location when joining a Roblox game."
                  icon={<Info size={16} />}
                >
                  <ToggleRow
                    title="Server location notifications"
                    description="Get notified of the server location when joining a Roblox game."
                    checked={notifyServerLocation}
                    onChange={() => setNotifyServerLocation(!notifyServerLocation)}
                    icon={<Info size={14} />}
                  />
                </SettingsCard>
              </Section>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Security</h3>
                <p className="text-sm text-neutral-400">
                  Manage security settings and access controls.
                </p>
              </div>

              <Section title="Access control" description="Protect the app with a 6-digit PIN.">
                <SettingsCard
                  title="PIN lock"
                  description="Set a PIN that must be entered when Altman starts."
                  icon={<Lock size={16} />}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setIsPinDialogOpen(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${settings.pinCode
                        ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20'
                        : 'text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700'
                        }`}
                    >
                      {settings.pinCode ? 'PIN Enabled - Click to Manage' : 'Set Up PIN'}
                    </button>
                    <p className="text-xs text-neutral-500">
                      Require the PIN at startup to keep your launcher locked down.
                    </p>
                  </div>
                </SettingsCard>
              </Section>
            </div>
          )}

          {/* About Settings */}
          {activeTab === 'about' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">About</h3>
                <p className="text-sm text-neutral-400">Application information and updates.</p>
              </div>

              <Section title="Updates" description="Check for and install application updates.">
                <SettingsCard
                  title="Updates"
                  description="Stay current with the latest release."
                  icon={<Info size={16} />}
                >
                  <UpdaterCard />
                </SettingsCard>
              </Section>

              <Section title="About Voxel" description="Project info and helpful links.">
                <SettingsCard
                  title="Voxel"
                  description="The open-source Roblox launcher."
                  icon={<Info size={16} />}
                >
                  <div className="flex gap-4">
                    <a
                      href="https://github.com/6E6B/voxel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-color)] hover:underline"
                    >
                      GitHub Repository
                    </a>
                    <a
                      href="https://github.com/6E6B/voxel/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-color)] hover:underline"
                    >
                      Report an Issue
                    </a>
                  </div>
                </SettingsCard>
              </Section>

              <Section title="Legal" description="Terms and policies.">
                <SettingsCard
                  title="Privacy Policy"
                  description="Read about how we handle your data."
                  icon={<Shield size={16} />}
                >
                  <button
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-xs text-[var(--accent-color)] hover:underline flex items-center gap-1"
                  >
                    View Privacy Policy
                  </button>
                </SettingsCard>
              </Section>
            </div>
          )}
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      <Dialog isOpen={isColorPickerOpen} onClose={() => setIsColorPickerOpen(false)}>
        <DialogContent className="max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Pick Accent Color</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <ColorPicker
              value={settings.accentColor}
              onChange={handleAccentColorChange}
              className="w-full"
            >
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 items-stretch">
                  <div className="flex-1 h-64 rounded-lg overflow-hidden border border-neutral-800">
                    <ColorPickerSelection className="h-full" />
                  </div>
                  <div className="w-8 h-64 rounded-lg border border-neutral-800 bg-neutral-900 p-1 flex items-center justify-center">
                    <ColorPickerHue orientation="vertical" className="h-full w-full rounded-full" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div>
                      <ColorPickerEyeDropper />
                    </div>
                    <div className="flex-1">
                      <ColorPickerFormat />
                    </div>
                    <div>
                      <ColorPickerOutput />
                    </div>
                  </div>
                </div>
              </div>
            </ColorPicker>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <PinSetupDialog
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onSave={handlePinSave}
        currentPin={settings.pinCode}
      />
    </div>
  )
}

export default SettingsTab
