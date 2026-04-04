import { queryKeys } from '@renderer/shared/query/queryKeys'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Palette,
  Bell,
  Shield,
  Sliders,
  Plus,
  Trash2,
  Check,
  Info,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  MonitorSmartphone,
  Sun,
  Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import {
  Account,
  Settings,
  TabId,
  ThemePreference,
  TintPreference,
  DEFAULT_ACCENT_COLOR
} from '@renderer/shared/types'
import { cn } from '@renderer/shared/lib/utils'
import { applyAccentColor } from '@renderer/shared/utils/themeUtils'
import {
  DEFAULT_SIDEBAR_TAB_ORDER,
  LOCKED_SIDEBAR_TABS,
  sanitizeSidebarHidden,
  sanitizeSidebarOrder
} from '@shared/config/navigation'
import CustomCheckbox from '@renderer/shared/ui/buttons/CustomCheckbox'
import CustomDropdown, { DropdownOption } from '@renderer/shared/ui/menus/CustomDropdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import { HexColorPicker } from '@renderer/shared/ui/inputs/HexColorPicker'
import {
  useNotificationTrayStore,
  useNotifyFriendOnline,
  useNotifyFriendInGame,
  useNotifyFriendRemoved
} from '../system/useNotificationTrayStore'
import { useSetAppUnlocked } from '@renderer/shared/stores/useUIStore'
import PinSetupDialog from '@renderer/shared/ui/specialized/PinSetupDialog'
import { useInstallations } from '../install/useInstallationsStore'
import {
  CustomFont,
  getGoogleFontUrl,
  loadFont,
  unloadFont,
  applyFont,
  isValidGoogleFontFamily
} from '@renderer/shared/utils/fontUtils'
import { UpdaterCard } from '../updater'
import PrivacyPolicyModal from '@renderer/app/dialogs/PrivacyPolicyModal'
import { SIDEBAR_TAB_DEFINITION_MAP, SidebarTabDefinition } from '@renderer/shared/ui/navigation/sidebarTabs'

interface SettingsTabProps {
  accounts: Account[]
  settings: Settings
  onUpdateSettings: (newSettings: Partial<Settings>) => void
}

const isMac = window.platform?.isMac ?? false

/* ─── Toggle switch ────────────────────────────────────────────────────── */
const ToggleSwitch: React.FC<{
  checked: boolean
  onChange: () => void
  disabled?: boolean
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={cn(
      'relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]',
      checked ? 'bg-[var(--accent-color)]' : 'bg-neutral-600',
      disabled && 'opacity-40 cursor-not-allowed'
    )}
  >
    <motion.span
      className="pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-sm"
      animate={{ x: checked ? 20 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
)

/* ─── Divider ──────────────────────────────────────────────────────────── */
const Divider = () => <div className="h-px bg-[var(--color-border)] mx-1" />

/* ─── Setting row: label on left, control on right ─────────────────────── */
const SettingRow: React.FC<{
  label: string
  description?: string
  children?: React.ReactNode
  htmlFor?: string
}> = ({ label, description, children, htmlFor }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 min-h-[44px]">
    <label htmlFor={htmlFor} className="flex-1 min-w-0 cursor-default">
      <div className="text-[13px] text-[var(--color-text-primary)]">{label}</div>
      {description && (
        <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{description}</p>
      )}
    </label>
    {children && <div className="shrink-0">{children}</div>}
  </div>
)

/* ─── Toggle row: label + switch ───────────────────────────────────────── */
const ToggleSettingRow: React.FC<{
  label: string
  description?: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
  hint?: React.ReactNode
}> = ({ label, description, checked, onChange, disabled, hint }) => (
  <div className="py-2.5 min-h-[44px]">
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-[var(--color-text-primary)]">{label}</div>
        {description && (
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
    {hint && <div className="mt-1.5">{hint}</div>}
  </div>
)

/* ─── Section group with title ─────────────────────────────────────────── */
const SectionGroup: React.FC<{
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
}> = ({ title, actions, children }) => (
  <div>
    {title && (
      <div className="flex items-center justify-between gap-3 mb-1">
        <h4 className="text-[11px] font-medium text-[var(--color-text-muted)] tracking-wide">{title}</h4>
        {actions}
      </div>
    )}
    <div className="divide-y divide-[var(--color-border)]">{children}</div>
  </div>
)

const SettingsTab: React.FC<SettingsTabProps> = ({ accounts, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'notifications' | 'security' | 'about'
  >('general')
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [draftAccentColor, setDraftAccentColor] = useState(settings.accentColor)
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

  useEffect(() => {
    if (!isColorPickerOpen) {
      setDraftAccentColor(settings.accentColor)
    }
  }, [settings.accentColor, isColorPickerOpen])

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
  const setNotifyFriendOnline = useNotificationTrayStore((state) => state.setNotifyFriendOnline)
  const setNotifyFriendInGame = useNotificationTrayStore((state) => state.setNotifyFriendInGame)
  const setNotifyFriendRemoved = useNotificationTrayStore((state) => state.setNotifyFriendRemoved)

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

  const handleOpenAccentColorPicker = () => {
    setDraftAccentColor(settings.accentColor)
    setIsColorPickerOpen(true)
  }

  const handleAccentColorChange = (accentColor: string) => {
    setDraftAccentColor(accentColor)
    applyAccentColor(accentColor)
  }

  const handleCloseAccentColorPicker = () => {
    applyAccentColor(settings.accentColor)
    setDraftAccentColor(settings.accentColor)
    setIsColorPickerOpen(false)
  }

  const handleSaveAccentColor = () => {
    if (draftAccentColor !== settings.accentColor) {
      onUpdateSettings({ accentColor: draftAccentColor })
    }
    setIsColorPickerOpen(false)
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

  const navItems = [
    { id: 'general' as const, label: 'General', icon: Sliders },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'about' as const, label: 'About', icon: Info }
  ]

  return (
    <div className="flex h-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]">

      {/* ─── Left sidebar nav ──────────────────────────────────────── */}
      <nav className="w-[248px] min-w-[248px] shrink-0 border-r border-[var(--color-border)] bg-[#0f0f0f] flex flex-col pt-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            layout="position"
            transition={{ layout: { duration: 0.18 } }}
            onMouseDown={() => setActiveTab(id)}
            className={cn(
              'w-full flex items-center gap-3 pl-[19px] pr-5 py-3 mb-0.5 text-[13px] font-medium transition-colors duration-200 relative',
              activeTab === id
                ? 'bg-[var(--accent-color-faint)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            )}
          >
            <AnimatePresence initial={false}>
              {activeTab === id && (
                <motion.div
                  key="indicator"
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent-color)]"
                  initial={{ opacity: 0, scaleY: 0.8 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
            <Icon size={17} strokeWidth={activeTab === id ? 2.35 : 1.9} className="shrink-0 relative z-10" />
            <span className="relative z-10">{label}</span>
          </motion.button>
        ))}
      </nav>

      {/* ─── Main content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-xl mx-auto px-10 py-8 pb-16">

          {/* ═══════════════ General ═══════════════ */}
          {activeTab === 'general' && (
            <div className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">General</h2>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Accounts, launch defaults, and integrations.</p>
              </div>

              <SectionGroup title="Defaults">
                <SettingRow label="Primary account" description="Auto-selected at startup.">
                  <CustomDropdown
                    options={accountOptions}
                    value={settings.primaryAccountId || ''}
                    onChange={handlePrimaryAccountChange}
                    placeholder="None"
                  />
                </SettingRow>

                <SettingRow label="Default installation" description="Roblox client used when launching.">
                  <CustomDropdown
                    options={installationOptions}
                    value={settings.defaultInstallationPath || ''}
                    onChange={handleDefaultInstallChange}
                    placeholder="System Default"
                  />
                </SettingRow>
              </SectionGroup>

              <SectionGroup title="Privacy">
                <ToggleSettingRow
                  label="Privacy mode"
                  description="Blur account names and avatars throughout the app."
                  checked={settings.privacyMode}
                  onChange={handlePrivacyModeToggle}
                />
              </SectionGroup>

              <SectionGroup
                title="Sidebar"
                actions={
                  <button
                    type="button"
                    onClick={handleResetNavigation}
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                }
              >
                <ToggleSettingRow
                  label="Profile card"
                  description="Show the selected account's quick profile."
                  checked={settings.showSidebarProfileCard}
                  onChange={handleProfileCardToggle}
                />
              </SectionGroup>

              <SectionGroup title="Tab order">
                <div className="py-2">
                  <div className="space-y-1">
                    {sidebarTabs.map((tab, index) => {
                      const isHidden = hiddenSidebarTabsSet.has(tab.id)
                      const isLocked = LOCKED_SIDEBAR_TABS.includes(tab.id)

                      return (
                        <div
                          key={tab.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--color-surface-inset)] border border-[var(--color-border)]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CustomCheckbox
                              checked={!isHidden || isLocked}
                              disabled={isLocked}
                              onChange={() => handleToggleTabVisibility(tab.id)}
                            />
                            <tab.icon size={15} className="text-[var(--color-text-muted)] shrink-0" />
                            <span className="text-[13px] text-[var(--color-text-primary)]">{tab.label}</span>
                            {isLocked && (
                              <span className="text-[10px] text-[var(--accent-color)] bg-[var(--accent-color-faint)] px-1.5 py-0.5 rounded">Required</span>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveTab(tab.id, -1)}
                              disabled={index === 0}
                              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTab(tab.id, 1)}
                              disabled={index === sidebarTabs.length - 1}
                              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </SectionGroup>

              <SectionGroup title="Integrations">
                <ToggleSettingRow
                  label="Discord Rich Presence"
                  description="Show your current game activity on Discord."
                  checked={discordRPCEnabled}
                  onChange={() => toggleDiscordRPC.mutate(!discordRPCEnabled)}
                  disabled={toggleDiscordRPC.isPending}
                  hint={
                    toggleDiscordRPC.isPending ? (
                      <p className="text-[11px] text-[var(--accent-color)]">
                        {discordRPCEnabled ? 'Disabling...' : 'Connecting to Discord...'}
                      </p>
                    ) : null
                  }
                />
              </SectionGroup>

              <SectionGroup title="Advanced">
                <ToggleSettingRow
                  label="Multiple instances"
                  description={
                    isMac
                      ? 'Unavailable on macOS.'
                      : 'Launch more than one Roblox client at the same time.'
                  }
                  checked={false}
                  onChange={() => { }}
                  disabled
                  hint={
                    !isMac ? (
                      <p className="text-[11px] text-yellow-500/80">
                        May violate Roblox Terms of Service. Use at your own risk.
                      </p>
                    ) : null
                  }
                />
              </SectionGroup>
            </div>
          )}

          {/* ═══════════════ Appearance ═══════════════ */}
          {activeTab === 'appearance' && (
            <div className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Appearance</h2>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Theme, accent color, and fonts.</p>
              </div>

              <SectionGroup title="Theme">
                <SettingRow label="Mode" description="Choose light, dark, or match your OS.">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--color-surface-inset)] border border-[var(--color-border)]">
                    {([
                      { value: 'system', icon: MonitorSmartphone, tip: 'System' },
                      { value: 'light', icon: Sun, tip: 'Light' },
                      { value: 'dark', icon: Moon, tip: 'Dark' }
                    ] as const).map(({ value, icon: Icon, tip }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleThemeChange(value)}
                        title={tip}
                        className={cn(
                          'p-1.5 rounded-md transition-colors',
                          settings.theme === value
                            ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        )}
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                  </div>
                </SettingRow>

                <SettingRow label="Tint" description="Base color cast for surfaces.">
                  <CustomDropdown
                    options={tintOptions}
                    value={settings.tint}
                    onChange={handleTintChange}
                    placeholder="Neutral"
                  />
                </SettingRow>
              </SectionGroup>

              <SectionGroup title="Accent color">
                <ToggleSettingRow
                  label="Dynamic accent"
                  description="Derive from your avatar's appearance."
                  checked={settings.useDynamicAccentColor}
                  onChange={() =>
                    onUpdateSettings({ useDynamicAccentColor: !settings.useDynamicAccentColor })
                  }
                />

                <div className={cn(
                  'py-2.5 transition-opacity duration-200',
                  settings.useDynamicAccentColor && 'opacity-40 pointer-events-none'
                )}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOpenAccentColorPicker}
                      className="h-9 w-9 rounded-lg border border-[var(--color-border)] cursor-pointer hover:ring-2 hover:ring-[var(--accent-color-ring)] transition-all shrink-0"
                      style={{ backgroundColor: settings.accentColor }}
                      aria-label="Pick color"
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      readOnly
                      spellCheck={false}
                      className="w-24 bg-[var(--color-surface-inset)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text-primary)] font-mono cursor-pointer focus:outline-none"
                      onClick={handleOpenAccentColorPicker}
                    />
                    <button
                      type="button"
                      onClick={handleResetAccent}
                      className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </SectionGroup>

              <SectionGroup title="Fonts">
                <div className="py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFontFamily}
                      onChange={(e) => {
                        setNewFontFamily(e.target.value)
                        setFontError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddFont()
                      }}
                      placeholder="Google Font name (e.g. Roboto)"
                      className="flex-1 bg-[var(--color-surface-inset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--accent-color)] focus:outline-none"
                    />
                    <button
                      onClick={handleAddFont}
                      disabled={isAddingFont || !newFontFamily.trim()}
                      className="px-3.5 py-2 bg-[var(--accent-color)] text-[var(--accent-color-foreground)] rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isAddingFont ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus size={15} />
                      )}
                      Add
                    </button>
                  </div>
                  {fontError && <p className="text-[12px] text-red-400 mt-1.5">{fontError}</p>}
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5">
                    Browse at{' '}
                    <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-color)] hover:underline">
                      fonts.google.com
                    </a>
                  </p>
                </div>

                <div className="py-2">
                  <div className="space-y-1">
                    <button
                      onClick={() => setActiveFontMutation.mutate(null)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-left',
                        activeFont === null
                          ? 'border-[var(--accent-color-border)] bg-[var(--accent-color-faint)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                      )}
                    >
                      <span className="text-[13px] text-[var(--color-text-primary)]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Inter (Default)
                      </span>
                      {activeFont === null && <Check size={15} className="text-[var(--accent-color)]" />}
                    </button>

                    {customFonts.map((font) => (
                      <div
                        key={font.family}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors',
                          activeFont === font.family
                            ? 'border-[var(--accent-color-border)] bg-[var(--accent-color-faint)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                        )}
                      >
                        <button
                          onClick={() => setActiveFontMutation.mutate(font.family)}
                          className="flex-1 text-left"
                        >
                          <span className="text-[13px] text-[var(--color-text-primary)]" style={{ fontFamily: `'${font.family}', sans-serif` }}>
                            {font.family}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          {activeFont === font.family && <Check size={15} className="text-[var(--accent-color)]" />}
                          <button
                            onClick={() => removeFontMutation.mutate(font.family)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-red-400 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {customFonts.length === 0 && (
                      <p className="text-[12px] text-[var(--color-text-muted)] py-3 text-center">No custom fonts added yet.</p>
                    )}
                  </div>
                </div>
              </SectionGroup>
            </div>
          )}

          {/* ═══════════════ Notifications ═══════════════ */}
          {activeTab === 'notifications' && (
            <div className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Notifications</h2>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Choose which events send you alerts.</p>
              </div>

              <SectionGroup title="Friend activity">
                <ToggleSettingRow
                  label="Friend comes online"
                  description="Get notified when a friend logs in."
                  checked={notifyFriendOnline}
                  onChange={() => setNotifyFriendOnline(!notifyFriendOnline)}
                />
                <ToggleSettingRow
                  label="Friend starts playing"
                  description="Get notified when a friend joins a game."
                  checked={notifyFriendInGame}
                  onChange={() => setNotifyFriendInGame(!notifyFriendInGame)}
                />
                <ToggleSettingRow
                  label="Friend removed you"
                  description="Get notified when someone unfriends you."
                  checked={notifyFriendRemoved}
                  onChange={() => setNotifyFriendRemoved(!notifyFriendRemoved)}
                />
              </SectionGroup>
            </div>
          )}

          {/* ═══════════════ Security ═══════════════ */}
          {activeTab === 'security' && (
            <div className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Security</h2>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">Protect access to the app.</p>
              </div>

              <SectionGroup title="App lock">
                <SettingRow label="PIN code" description="Require a 6-digit PIN when the app starts.">
                  <button
                    onClick={() => setIsPinDialogOpen(true)}
                    className={cn(
                      'px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-colors',
                      settings.pinCode
                        ? 'text-green-400 bg-green-500/10 hover:bg-green-500/15 border border-green-500/20'
                        : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-inset)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
                    )}
                  >
                    {settings.pinCode ? 'Enabled · Manage' : 'Set Up PIN'}
                  </button>
                </SettingRow>
              </SectionGroup>
            </div>
          )}

          {/* ═══════════════ About ═══════════════ */}
          {activeTab === 'about' && (
            <div className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">About</h2>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">App info and updates.</p>
              </div>

              <SectionGroup title="Updates">
                <div className="py-3">
                  <UpdaterCard />
                </div>
              </SectionGroup>

              <SectionGroup title="Project">
                <SettingRow label="Source code" description="Voxel is open-source.">
                  <a
                    href="https://github.com/6E6B/voxel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[var(--accent-color)] hover:underline"
                  >
                    GitHub <ExternalLink size={12} />
                  </a>
                </SettingRow>
                <SettingRow label="Report an issue" description="Found a bug or have feedback?">
                  <a
                    href="https://github.com/6E6B/voxel/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-[var(--accent-color)] hover:underline"
                  >
                    Issues <ExternalLink size={12} />
                  </a>
                </SettingRow>
              </SectionGroup>

              <SectionGroup title="Legal">
                <SettingRow label="Privacy policy" description="How we handle your data.">
                  <button
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-[12px] text-[var(--accent-color)] hover:underline"
                  >
                    View
                  </button>
                </SettingRow>
              </SectionGroup>
            </div>
          )}

        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      <Dialog isOpen={isColorPickerOpen} onClose={handleCloseAccentColorPicker}>
        <DialogContent className="max-w-sm overflow-visible">
          <DialogHeader>
            <DialogTitle>Accent color</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <HexColorPicker value={draftAccentColor} onChange={handleAccentColorChange} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                  <span className="h-4 w-4 rounded-full border border-[var(--color-border)]" style={{ backgroundColor: draftAccentColor }} />
                  <span className="font-mono">{draftAccentColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseAccentColorPicker}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAccentColor}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[var(--accent-color)] text-[var(--accent-color-foreground)] hover:opacity-90 transition-opacity"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
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


