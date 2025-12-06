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
import { Account, Settings, TabId } from '../../types'
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
import {
  DEFAULT_SIDEBAR_TAB_ORDER,
  LOCKED_SIDEBAR_TABS,
  sanitizeSidebarHidden,
  sanitizeSidebarOrder
} from '@shared/navigation'
import {
  SIDEBAR_TAB_DEFINITION_MAP,
  SidebarTabDefinition
} from '../../constants/sidebarTabs'

interface SettingsTabProps {
  accounts: Account[]
  settings: Settings
  onUpdateSettings: (newSettings: Partial<Settings>) => void
}

const isMac = window.platform?.isMac ?? false

const SettingsTab: React.FC<SettingsTabProps> = ({ accounts, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'notifications' | 'security' | 'about'
  >('general')
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [newFontFamily, setNewFontFamily] = useState('')
  const [fontError, setFontError] = useState<string | null>(null)
  const [isAddingFont, setIsAddingFont] = useState(false)
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
  const hiddenSidebarTabsSet = useMemo(
    () => new Set(sidebarHiddenTabs),
    [sidebarHiddenTabs]
  )

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

  const handlePrimaryAccountChange = (value: string) => {
    onUpdateSettings({ primaryAccountId: value === '' ? null : value })
  }

  const handleDefaultInstallChange = (value: string) => {
    onUpdateSettings({ defaultInstallationPath: value === '' ? undefined : value })
  }

  const handleMultiInstanceChange = () => {
    if (isMac) return
    onUpdateSettings({ allowMultipleInstances: !settings.allowMultipleInstances })
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
      subLabel: `@${account.username}`
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

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      <div className="shrink-0 h-[72px] bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-6 z-20">
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>

      {/* Tabs Header */}
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-950">
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
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-neutral-900/50 active:bg-neutral-900',
                activeTab === 'general' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <Sliders size={16} />
              General
            </button>

            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-neutral-900/50 active:bg-neutral-900',
                activeTab === 'appearance'
                  ? 'text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <Type size={16} />
              Appearance
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-neutral-900/50 active:bg-neutral-900',
                activeTab === 'notifications'
                  ? 'text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <Bell size={16} />
              Notifications
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-neutral-900/50 active:bg-neutral-900',
                activeTab === 'security' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <Shield size={16} />
              Security
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-neutral-900/50 active:bg-neutral-900',
                activeTab === 'about' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
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
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">General Settings</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  Manage your account and application preferences.
                </p>

                <div className="space-y-6">
                  {/* Primary Account Setting */}
                  <div className="flex flex-col space-y-2">
                    <label
                      htmlFor="primary-account"
                      className="text-sm font-medium text-neutral-400 flex items-center"
                    >
                      <Users size={16} className="mr-2" />
                      Primary Account
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      This account will be automatically selected when the application starts.
                    </p>
                    <CustomDropdown
                      options={accountOptions}
                      value={settings.primaryAccountId || ''}
                      onChange={handlePrimaryAccountChange}
                      placeholder="Select Primary Account"
                    />
                  </div>

                  {/* Accent Color Setting */}
                  <div className="flex flex-col space-y-2">
                    <label
                      htmlFor="accent-color"
                      className="text-sm font-medium text-neutral-400 flex items-center"
                    >
                      <Palette size={16} className="mr-2" />
                      Accent Color
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Customize the highlight color used for buttons, indicators, and focus rings.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsColorPickerOpen(true)}
                        className="h-12 w-12 rounded-lg border border-neutral-800 bg-transparent cursor-pointer hover:border-neutral-700 transition-colors flex-shrink-0"
                        style={{ backgroundColor: settings.accentColor }}
                        aria-label="Select accent color"
                      />
                      <div className="flex-1 flex flex-col justify-center">
                        <label
                          htmlFor="accent-color-hex"
                          className="text-xs text-neutral-500 uppercase tracking-wide"
                        >
                          Hex Value
                        </label>
                        <input
                          id="accent-color-hex"
                          type="text"
                          value={settings.accentColor}
                          readOnly
                          placeholder="#ffffff"
                          spellCheck={false}
                          className="mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--accent-color)] focus:outline-none cursor-pointer"
                          onClick={() => setIsColorPickerOpen(true)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Default Installation Setting */}
                  <div className="flex flex-col space-y-2">
                    <label
                      htmlFor="default-install"
                      className="text-sm font-medium text-neutral-400 flex items-center"
                    >
                      <HardDrive size={16} className="mr-2" />
                      Default Installation
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Select the specific Roblox version to use when launching games. If not set,
                      you will be prompted to choose.
                    </p>
                    <CustomDropdown
                      options={installationOptions}
                      value={settings.defaultInstallationPath || ''}
                      onChange={handleDefaultInstallChange}
                      placeholder="Select Installation"
                    />
                  </div>

                  {/* Multi-Instance Setting */}
                  <div className="flex items-start space-x-3 p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                    <div className="mt-1 opacity-50 pointer-events-none">
                      <CustomCheckbox checked={false} onChange={() => {}} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-300 block mb-1">
                        Allow Multiple Instances
                      </label>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {isMac
                          ? 'Disabled on macOS.'
                          : 'Enable launching multiple Roblox clients simultaneously.'}
                        {!isMac && (
                          <span className="block mt-1 text-yellow-600/80">
                            Note: This feature is considered to be against the Roblox Terms of
                            Service. Use at your own risk.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Sidebar Profile Card Setting */}
                  <div className="flex items-start space-x-3 p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                    <div className="mt-1">
                      <CustomCheckbox
                        checked={settings.showSidebarProfileCard}
                        onChange={handleProfileCardToggle}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-300 block mb-1">
                        Show Sidebar Profile Card
                      </label>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Display the selected account's quick profile card to see your profile
                        faster.
                      </p>
                    </div>
                  </div>

                  {/* Sidebar Tabs Setting */}
                  <div className="p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <label className="text-sm font-medium text-neutral-300 block mb-1">
                          Sidebar Tabs
                        </label>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          Hide tabs you do not use and reorder the sidebar to match your workflow.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetNavigation}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/40 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Reset
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sidebarTabs.map((tab, index) => {
                        const isHidden = hiddenSidebarTabsSet.has(tab.id)
                        const isLocked = LOCKED_SIDEBAR_TABS.includes(tab.id)

                        return (
                          <div
                            key={tab.id}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900/50"
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
                                className="p-2 rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label={`Move ${tab.label} up`}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveTab(tab.id, 1)}
                                disabled={index === sidebarTabs.length - 1}
                                className="p-2 rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label={`Move ${tab.label} down`}
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Appearance</h3>
                <p className="text-sm text-neutral-400 mb-6">Customize fonts and visual styles.</p>

                <div className="space-y-6">
                  {/* Custom Fonts Section */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-neutral-400 flex items-center">
                      <Type size={16} className="mr-2" />
                      Custom Fonts
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Add fonts from Google Fonts to use in the application.
                    </p>

                    {/* Add Font Input */}
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

                    {fontError && <p className="text-xs text-red-400 mt-1">{fontError}</p>}

                    <p className="text-xs text-neutral-600 mt-1">
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
                  </div>

                  {/* Active Font Selection */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-neutral-400">Active Font</label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Select which font to use for the application interface.
                    </p>

                    <div className="space-y-2">
                      {/* Default Font Option */}
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

                      {/* Custom Fonts List */}
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Notifications</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  Configure how and when you want to be notified.
                </p>

                <div className="space-y-4">
                  {/* Friend Online Notifications */}
                  <div className="flex items-start space-x-3 p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                    <div className="mt-1">
                      <CustomCheckbox
                        checked={notifyFriendOnline}
                        onChange={() => setNotifyFriendOnline(!notifyFriendOnline)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-300 block mb-1">
                        Friend Online Notifications
                      </label>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Get notified when your friends come online.
                      </p>
                    </div>
                  </div>

                  {/* Friend In-Game Notifications */}
                  <div className="flex items-start space-x-3 p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                    <div className="mt-1">
                      <CustomCheckbox
                        checked={notifyFriendInGame}
                        onChange={() => setNotifyFriendInGame(!notifyFriendInGame)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-300 block mb-1">
                        Friend In-Game Notifications
                      </label>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Get notified when your friends start playing a game.
                      </p>
                    </div>
                  </div>

                  {/* Friend Removed Notifications */}
                  <div className="flex items-start space-x-3 p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                    <div className="mt-1">
                      <CustomCheckbox
                        checked={notifyFriendRemoved}
                        onChange={() => setNotifyFriendRemoved(!notifyFriendRemoved)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-300 block mb-1">
                        Friend Removed Notifications
                      </label>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Get notified when someone unfriends you.
                      </p>
                    </div>
                  </div>

                  {/* Server Location Notifications */}
                  <div className="flex items-start space-x-3 p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50 hover:border-neutral-700/50 transition-colors">
                    <div className="mt-1">
                      <CustomCheckbox
                        checked={notifyServerLocation}
                        onChange={() => setNotifyServerLocation(!notifyServerLocation)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-300 block mb-1">
                        Server Location Notifications
                      </label>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Get notified of the server location when joining a Roblox game.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Security</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  Manage security settings and access controls.
                </p>

                <div className="space-y-6">
                  {/* PIN Lock Setting */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-neutral-400 flex items-center">
                      <Lock size={16} className="mr-2" />
                      PIN Lock
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Protect your app with a 6-digit PIN code that must be entered on startup.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsPinDialogOpen(true)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          settings.pinCode
                            ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20'
                            : 'text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700'
                        }`}
                      >
                        {settings.pinCode ? 'PIN Enabled - Click to Manage' : 'Set Up PIN'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Settings */}
          {activeTab === 'about' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">About</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  Application information and updates.
                </p>

                <div className="space-y-6">
                  {/* Updates Section */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-neutral-400 flex items-center">
                      <Info size={16} className="mr-2" />
                      Updates
                    </label>
                    <p className="text-xs text-neutral-500 mb-2">
                      Check for and install application updates.
                    </p>
                    <UpdaterCard />
                  </div>

                  {/* App Info */}
                  <div className="p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50">
                    <h4 className="text-sm font-medium text-white mb-3">Voxel</h4>
                    <p className="text-xs text-neutral-500 mb-3">
                      The open-source Roblox launcher.
                    </p>
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
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
