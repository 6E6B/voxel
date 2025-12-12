import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  User,
  Shield,
  Eye,
  MessageSquare,
  Bell,
  Settings2,
  Crown,
  Mail,
  Calendar,
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingCart,
  Users,
  Gamepad2,
  Palette,
  FileText,
  Share2,
  Cake
} from 'lucide-react'
import { Account } from '../../types'
import { cn } from '../../lib/utils'
import Skeleton from '../../components/UI/display/Skeleton'
import CustomDropdown, { DropdownOption } from '../../components/UI/menus/CustomDropdown'
import type {
  PrivacyLevel,
  TradePrivacy,
  TradeValue,
  OnlineStatusPrivacy
} from '../../../../shared/ipc-schemas/accountSettings'

interface AccountSettingsTabProps {
  account: Account | null
}

type SettingsSection = 'account' | 'privacy' | 'communication' | 'security'

// Privacy level options for dropdowns
const PRIVACY_OPTIONS: DropdownOption[] = [
  { value: 'NoOne', label: 'No One' },
  { value: 'Friends', label: 'Friends' },
  { value: 'FriendsAndFollowing', label: 'Friends & Following' },
  { value: 'FriendsFollowingAndFollowers', label: 'Friends, Following & Followers' },
  { value: 'AllAuthenticatedUsers', label: 'All Logged-in Users' },
  { value: 'AllUsers', label: 'Everyone' }
]

const TRADE_PRIVACY_OPTIONS: DropdownOption[] = [
  { value: 'NoOne', label: 'No One' },
  { value: 'Friends', label: 'Friends' },
  { value: 'All', label: 'Everyone' }
]

const TRADE_VALUE_OPTIONS: DropdownOption[] = [
  { value: 'None', label: 'None' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' }
]

const THEME_OPTIONS: DropdownOption[] = [
  { value: 'Dark', label: 'Dark' },
  { value: 'Light', label: 'Light' }
]

const ONLINE_STATUS_PRIVACY_OPTIONS: DropdownOption[] = [
  { value: 'NoOne', label: 'No One' },
  { value: 'Friends', label: 'Friends' },
  { value: 'FriendsFollowingAndFollowers', label: 'Friends, Following & Followers' },
  { value: 'AllUsers', label: 'Everyone' }
]

const formatDays = (days: number): string => {
  const years = Math.floor(days / 365)
  const remainingDays = days % 365
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}, ${remainingDays} days`
  }
  return `${days} days`
}

const formatTimeWindow = (startMinutes: number, endMinutes: number): string => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
  }
  return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`
}

const SettingBadge: React.FC<{
  enabled: boolean
  label?: string
}> = ({ enabled, label }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium',
      enabled
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        : 'bg-neutral-800/50 text-neutral-500 border border-neutral-700/50'
    )}
  >
    {enabled ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    {label || (enabled ? 'Enabled' : 'Disabled')}
  </span>
)

const SettingValue: React.FC<{
  value: string
  variant?: 'default' | 'accent'
}> = ({ value, variant = 'default' }) => (
  <span
    className={cn(
      'text-sm font-medium',
      variant === 'accent' ? 'text-[var(--accent-color)]' : 'text-neutral-200'
    )}
  >
    {value.replace(/([A-Z])/g, ' $1').trim()}
  </span>
)

const SettingCard: React.FC<{
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}> = ({ icon, title, description, children, className }) => (
  <div
    className={cn(
      'p-4 bg-[var(--color-surface-strong)] rounded-[var(--radius-xl)] border border-neutral-800/50 hover:border-neutral-700/50 transition-colors [--card-radius:var(--radius-xl)] [--card-gap:0.5rem] [--control-radius:calc(var(--card-radius)_-_var(--card-gap))]',
      className
    )}
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
        <div className="space-y-3 mt-3">{children}</div>
      </div>
    </div>
  </div>
)

const SettingRow: React.FC<{
  label: string
  children: React.ReactNode
}> = ({ label, children }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/30 last:border-0">
    <span className="text-sm text-neutral-400">{label}</span>
    <div className="flex items-center gap-2">{children}</div>
  </div>
)

const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({ account }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const {
    data: combinedSettings,
    isLoading,
    error
  } = useQuery({
    queryKey: ['combined-account-settings', account?.id],
    queryFn: async () => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.getCombinedAccountSettings(account.cookie)
    },
    enabled: !!account?.cookie,
    staleTime: 1000 * 60 * 5,
    retry: 2
  })

  const accountSettings = combinedSettings?.accountSettings
  const userSettings = combinedSettings?.userSettings

  // Mutation hooks for updating settings
  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['combined-account-settings', account?.id] })
  }

  const updateInventoryPrivacy = useMutation({
    mutationFn: async (privacy: PrivacyLevel) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateInventoryPrivacy(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updateTradePrivacy = useMutation({
    mutationFn: async (privacy: TradePrivacy) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateTradePrivacy(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updateTradeValue = useMutation({
    mutationFn: async (value: TradeValue) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateTradeValue(account.cookie, value)
    },
    onSuccess: invalidateSettings
  })

  const updateAppChatPrivacy = useMutation({
    mutationFn: async (privacy: PrivacyLevel) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateAppChatPrivacy(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updateGameChatPrivacy = useMutation({
    mutationFn: async (privacy: PrivacyLevel) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateGameChatPrivacy(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updatePhoneDiscovery = useMutation({
    mutationFn: async (privacy: PrivacyLevel) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updatePrivacy(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updateOnlineStatusPrivacy = useMutation({
    mutationFn: async (privacy: OnlineStatusPrivacy) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateOnlineStatusPrivacy(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updateWhoCanJoinMeInExperiences = useMutation({
    mutationFn: async (privacy: PrivacyLevel) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateWhoCanJoinMeInExperiences(account.cookie, privacy)
    },
    onSuccess: invalidateSettings
  })

  const updateTheme = useMutation({
    mutationFn: async (themeType: string) => {
      if (!account?.cookie || !accountSettings?.UserId) throw new Error('No cookie or userId')
      return window.api.updateTheme(account.cookie, accountSettings.UserId, themeType)
    },
    onSuccess: invalidateSettings
  })

  const sendVerificationEmail = useMutation({
    mutationFn: async () => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.sendVerificationEmail(account.cookie, false)
    }
  })

  // ============================================================================
  // ACCOUNT INFORMATION API QUERIES & MUTATIONS
  // ============================================================================

  // Description
  const { data: descriptionData } = useQuery({
    queryKey: ['description', account?.id],
    queryFn: async () => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.getDescription(account.cookie)
    },
    enabled: !!account?.cookie,
    staleTime: 1000 * 60 * 5
  })

  const updateDescription = useMutation({
    mutationFn: async (description: string) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateDescription(account.cookie, description)
    },
    onSuccess: () => {
      setEditingDescription(null)
      queryClient.invalidateQueries({ queryKey: ['description', account?.id] })
    }
  })

  // Gender
  const { data: genderData } = useQuery({
    queryKey: ['gender', account?.id],
    queryFn: async () => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.getGender(account.cookie)
    },
    enabled: !!account?.cookie,
    staleTime: 1000 * 60 * 5
  })

  const updateGender = useMutation({
    mutationFn: async (gender: string) => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.updateGender(account.cookie, gender)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gender', account?.id] })
  })

  // Birthdate
  const { data: birthdateData } = useQuery({
    queryKey: ['birthdate', account?.id],
    queryFn: async () => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.getBirthdate(account.cookie)
    },
    enabled: !!account?.cookie,
    staleTime: 1000 * 60 * 5
  })

  // Promotion Channels (Social Links)
  const { data: promotionChannelsData } = useQuery({
    queryKey: ['promotion-channels', account?.id],
    queryFn: async () => {
      if (!account?.cookie) throw new Error('No cookie')
      return window.api.getPromotionChannels(account.cookie)
    },
    enabled: !!account?.cookie,
    staleTime: 1000 * 60 * 5
  })

  // Birthdate display helper
  const formatBirthdate = (month: number, day: number, year: number): string => {
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <User size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Eye size={16} /> },
    { id: 'communication', label: 'Communication', icon: <MessageSquare size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> }
  ]

  const sectionIndex = sections.findIndex((s) => s.id === activeSection)

  if (!account) {
    return (
      <div className="flex flex-col h-full bg-[var(--color-app-bg)]">
        <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center px-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Account Settings</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
          <p>Select an account to view settings</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
      {/* Header */}
      <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Account Settings</h2>
          {accountSettings && (
            <div className="flex items-center gap-2">
              {accountSettings.IsPremium && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Crown size={12} />
                  Premium
                </span>
              )}
              {accountSettings.IsAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                  <Shield size={12} />
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-sm text-neutral-400">
          {accountSettings && (
            <span className="flex items-center gap-2">
              <User size={14} />@{accountSettings.Name}
            </span>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex">
            <motion.div
              className="absolute bottom-0 h-0.5 bg-[var(--accent-color)] z-20"
              initial={false}
              animate={{
                left: `${sectionIndex * 25}%`,
                width: '25%'
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />

            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)]',
                  activeSection === section.id
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                )}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        <div className="max-w-4xl mx-auto pb-8">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <p className="text-sm font-medium">Failed to load account settings</p>
              <p className="text-sm mt-1 opacity-70">{(error as Error).message}</p>
            </div>
          )}

          {accountSettings && userSettings && (
            <>
              {/* Account Info Section */}
              {activeSection === 'account' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-lg font-semibold text-white mb-1">Account Information</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Your Roblox account details and settings.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingCard
                      icon={<User size={18} />}
                      title="Profile"
                      description="Your account identity"
                    >
                      <SettingRow label="Username">
                        <SettingValue value={accountSettings.Name} variant="accent" />
                      </SettingRow>
                      <SettingRow label="Display Name">
                        <SettingValue value={accountSettings.DisplayName} />
                      </SettingRow>
                      <SettingRow label="User ID">
                        <span className="text-sm text-neutral-300 font-mono">
                          {accountSettings.UserId}
                        </span>
                      </SettingRow>
                      <SettingRow label="Age Bracket">
                        <SettingBadge
                          enabled={accountSettings.UserAbove13}
                          label={accountSettings.UserAbove13 ? '13+' : 'Under 13'}
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<FileText size={18} />}
                      title="Description"
                      description="Your profile bio"
                    >
                      <div className="space-y-2">
                        <textarea
                          value={editingDescription ?? descriptionData?.description ?? ''}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          placeholder="Enter your profile description..."
                          className="w-full h-20 px-3 py-2 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-[var(--control-radius)] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-color)]/50 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          {editingDescription !== null &&
                            editingDescription !== (descriptionData?.description ?? '') && (
                              <>
                                <button
                                  onClick={() => updateDescription.mutate(editingDescription)}
                                  disabled={updateDescription.isPending}
                                  className="text-sm px-3 py-1.5 bg-[var(--accent-color)]/20 text-[var(--accent-color)] rounded-[var(--control-radius)] hover:bg-[var(--accent-color)]/30 transition-colors disabled:opacity-50"
                                >
                                  {updateDescription.isPending ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingDescription(null)}
                                  disabled={updateDescription.isPending}
                                  className="text-sm px-3 py-1.5 bg-neutral-700/50 text-neutral-400 rounded-[var(--control-radius)] hover:bg-neutral-700/70 transition-colors disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          {updateDescription.isSuccess && editingDescription === null && (
                            <span className="text-sm text-emerald-400">Saved!</span>
                          )}
                        </div>
                        {updateDescription.isError && (
                          <p className="text-sm text-red-400">Failed to update description</p>
                        )}
                      </div>
                    </SettingCard>

                    <SettingCard
                      icon={<Cake size={18} />}
                      title="Personal Info"
                      description="Your gender and birthdate"
                    >
                      <SettingRow label="Gender">
                        <CustomDropdown
                          value={String(genderData?.gender || 1)}
                          options={[
                            { value: '1', label: 'Not Specified' },
                            { value: '2', label: 'Male' },
                            { value: '3', label: 'Female' }
                          ]}
                          onChange={(v) => updateGender.mutate(v)}
                          isLoading={updateGender.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Birthdate">
                        {birthdateData ? (
                          <span className="text-sm text-neutral-300">
                            {formatBirthdate(
                              birthdateData.birthMonth,
                              birthdateData.birthDay,
                              birthdateData.birthYear
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-500">Not set</span>
                        )}
                      </SettingRow>
                      <SettingRow label="Birthdate Locked">
                        <SettingBadge enabled={accountSettings.IsBirthdateLocked} />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Mail size={18} />}
                      title="Contact Information"
                      description="Email and phone settings"
                    >
                      <SettingRow label="Email">
                        <span className="text-sm text-neutral-300">
                          {accountSettings.UserEmail}
                        </span>
                      </SettingRow>
                      <SettingRow label="Email Verified">
                        <div className="flex items-center gap-2">
                          <SettingBadge
                            enabled={accountSettings.IsEmailVerified}
                            label={accountSettings.IsEmailVerified ? 'Verified' : 'Not Verified'}
                          />
                          {!accountSettings.IsEmailVerified && accountSettings.IsEmailOnFile && (
                            <button
                              onClick={() => sendVerificationEmail.mutate()}
                              disabled={sendVerificationEmail.isPending}
                              className="text-sm px-2 py-1 bg-[var(--accent-color)]/20 text-[var(--accent-color)] rounded-[var(--control-radius)] hover:bg-[var(--accent-color)]/30 transition-colors"
                            >
                              {sendVerificationEmail.isPending ? 'Sending...' : 'Send Email'}
                            </button>
                          )}
                        </div>
                      </SettingRow>
                      <SettingRow label="Phone Feature">
                        <SettingBadge enabled={accountSettings.IsPhoneFeatureEnabled} />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Calendar size={18} />}
                      title="Account Age"
                      description="How long you've been on Roblox"
                    >
                      <SettingRow label="Account Age">
                        <SettingValue value={formatDays(accountSettings.AccountAgeInDays)} />
                      </SettingRow>
                      <SettingRow label="Previous Usernames">
                        <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                          {accountSettings.PreviousUserNames.split(', ')
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((name, i) => (
                              <span
                                key={i}
                                className="text-sm px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400"
                              >
                                {name}
                              </span>
                            ))}
                          {!accountSettings.PreviousUserNames && (
                            <span className="text-sm text-neutral-500">None</span>
                          )}
                        </div>
                      </SettingRow>
                      <SettingRow label="Robux for Username Change">
                        <span className="text-sm text-neutral-300 font-mono">
                          {accountSettings.RobuxRemainingForUsernameChange} R$
                        </span>
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Palette size={18} />}
                      title="Preferences"
                      description="Display and theme settings"
                    >
                      <SettingRow label="Theme">
                        <CustomDropdown
                          value={userSettings.themeType?.currentValue || 'Dark'}
                          options={THEME_OPTIONS}
                          onChange={(v) => updateTheme.mutate(v)}
                          isLoading={updateTheme.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Content Age Restriction">
                        <SettingValue
                          value={userSettings.contentAgeRestriction?.currentValue || 'None'}
                        />
                      </SettingRow>
                      <SettingRow label="Display Names">
                        <SettingBadge enabled={accountSettings.IsDisplayNamesEnabled} />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Share2 size={18} />}
                      title="Social Links"
                      description="Your promotion channels"
                    >
                      <SettingRow label="Facebook">
                        <span className="text-sm text-neutral-300 truncate max-w-[150px]">
                          {promotionChannelsData?.facebook || 'Not set'}
                        </span>
                      </SettingRow>
                      <SettingRow label="Twitter/X">
                        <span className="text-sm text-neutral-300 truncate max-w-[150px]">
                          {promotionChannelsData?.twitter || 'Not set'}
                        </span>
                      </SettingRow>
                      <SettingRow label="YouTube">
                        <span className="text-sm text-neutral-300 truncate max-w-[150px]">
                          {promotionChannelsData?.youtube || 'Not set'}
                        </span>
                      </SettingRow>
                      <SettingRow label="Twitch">
                        <span className="text-sm text-neutral-300 truncate max-w-[150px]">
                          {promotionChannelsData?.twitch || 'Not set'}
                        </span>
                      </SettingRow>
                      <SettingRow label="Visibility">
                        <span className="text-sm text-neutral-300">
                          {promotionChannelsData?.promotionChannelsVisibilityPrivacy
                            ?.replace(/([A-Z])/g, ' $1')
                            .trim() || 'Not set'}
                        </span>
                      </SettingRow>
                    </SettingCard>
                  </div>
                </div>
              )}

              {/* Privacy Section */}
              {activeSection === 'privacy' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-lg font-semibold text-white mb-1">Privacy Settings</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Control who can see your information and interact with you.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingCard
                      icon={<Eye size={18} />}
                      title="Visibility"
                      description="Who can see your activity"
                    >
                      <SettingRow label="Inventory">
                        <CustomDropdown
                          value={userSettings.whoCanSeeMyInventory?.currentValue || 'NoOne'}
                          options={PRIVACY_OPTIONS}
                          onChange={(v) => updateInventoryPrivacy.mutate(v as PrivacyLevel)}
                          isLoading={updateInventoryPrivacy.isPending}
                          disabled={!accountSettings.CanHideInventory}
                        />
                      </SettingRow>
                      <SettingRow label="Online Status">
                        <CustomDropdown
                          value={userSettings.whoCanSeeMyOnlineStatus?.currentValue || 'Friends'}
                          options={ONLINE_STATUS_PRIVACY_OPTIONS}
                          onChange={(v) =>
                            updateOnlineStatusPrivacy.mutate(v as OnlineStatusPrivacy)
                          }
                          isLoading={updateOnlineStatusPrivacy.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Who can join me?">
                        <CustomDropdown
                          value={userSettings.whoCanJoinMeInExperiences?.currentValue || 'Friends'}
                          options={PRIVACY_OPTIONS}
                          onChange={(v) =>
                            updateWhoCanJoinMeInExperiences.mutate(v as PrivacyLevel)
                          }
                          isLoading={updateWhoCanJoinMeInExperiences.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Social Networks">
                        <SettingValue
                          value={userSettings.whoCanSeeMySocialNetworks?.currentValue || 'NoOne'}
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Users size={18} />}
                      title="Social"
                      description="Friend and activity settings"
                    >
                      <SettingRow label="Phone Discoverability">
                        <CustomDropdown
                          value={
                            userSettings.phoneNumberDiscoverability?.currentValue === 'Discoverable'
                              ? 'AllUsers'
                              : 'NoOne'
                          }
                          options={PRIVACY_OPTIONS.slice(0, 2)}
                          onChange={(v) => updatePhoneDiscovery.mutate(v as PrivacyLevel)}
                          isLoading={updatePhoneDiscovery.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Friend Suggestions">
                        <SettingBadge
                          enabled={userSettings.friendSuggestions?.currentValue === 'Enabled'}
                        />
                      </SettingRow>
                      <SettingRow label="Update Friends About Activity">
                        <SettingBadge
                          enabled={
                            userSettings.updateFriendsAboutMyActivity?.currentValue === 'Yes'
                          }
                          label={
                            userSettings.updateFriendsAboutMyActivity?.currentValue === 'Yes'
                              ? 'Yes'
                              : 'No'
                          }
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Gamepad2 size={18} />}
                      title="Experiences"
                      description="Who can join you in games"
                    >
                      <SettingRow label="Join Me">
                        <SettingValue
                          value={userSettings.whoCanJoinMeInExperiences?.currentValue || 'Friends'}
                        />
                      </SettingRow>
                      <SettingRow label="Private Server Privacy">
                        <SettingValue
                          value={userSettings.privateServerPrivacy?.currentValue || 'AllUsers'}
                        />
                      </SettingRow>
                      <SettingRow label="Party Invite (1:1)">
                        <SettingValue
                          value={userSettings.whoCanOneOnOnePartyWithMe?.currentValue || 'Friends'}
                        />
                      </SettingRow>
                      <SettingRow label="Group Party">
                        <SettingValue
                          value={userSettings.whoCanGroupPartyWithMe?.currentValue || 'Friends'}
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<ShoppingCart size={18} />}
                      title="Trading"
                      description="Trade and commerce settings"
                    >
                      <SettingRow label="Can Trade">
                        <SettingBadge enabled={accountSettings.CanTrade} />
                      </SettingRow>
                      <SettingRow label="Who Can Trade">
                        <CustomDropdown
                          value={userSettings.whoCanTradeWithMe?.currentValue || 'NoOne'}
                          options={TRADE_PRIVACY_OPTIONS}
                          onChange={(v) => updateTradePrivacy.mutate(v as TradePrivacy)}
                          isLoading={updateTradePrivacy.isPending}
                          disabled={!accountSettings.CanTrade}
                        />
                      </SettingRow>
                      <SettingRow label="Trade Quality Filter">
                        <CustomDropdown
                          value={userSettings.tradeQualityFilter?.currentValue || 'None'}
                          options={TRADE_VALUE_OPTIONS}
                          onChange={(v) => updateTradeValue.mutate(v as TradeValue)}
                          isLoading={updateTradeValue.isPending}
                          disabled={!accountSettings.CanTrade}
                        />
                      </SettingRow>
                      <SettingRow label="Purchases">
                        <SettingBadge
                          enabled={userSettings.enablePurchases?.currentValue === 'Enabled'}
                        />
                      </SettingRow>
                    </SettingCard>
                  </div>
                </div>
              )}

              {/* Communication Section */}
              {activeSection === 'communication' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-lg font-semibold text-white mb-1">Communication Settings</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Manage chat, notifications, and messaging preferences.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingCard
                      icon={<MessageSquare size={18} />}
                      title="Chat Settings"
                      description="In-game and app chat"
                    >
                      <SettingRow label="App Chat">
                        <CustomDropdown
                          value={userSettings.whoCanChatWithMeInApp?.currentValue || 'Friends'}
                          options={PRIVACY_OPTIONS}
                          onChange={(v) => updateAppChatPrivacy.mutate(v as PrivacyLevel)}
                          isLoading={updateAppChatPrivacy.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Game Chat">
                        <CustomDropdown
                          value={
                            userSettings.whoCanChatWithMeInExperiences?.currentValue || 'AllUsers'
                          }
                          options={PRIVACY_OPTIONS}
                          onChange={(v) => updateGameChatPrivacy.mutate(v as PrivacyLevel)}
                          isLoading={updateGameChatPrivacy.isPending}
                        />
                      </SettingRow>
                      <SettingRow label="Whisper Chat">
                        <SettingValue
                          value={
                            userSettings.whoCanWhisperChatWithMeInExperiences?.currentValue ||
                            'AllUsers'
                          }
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Bell size={18} />}
                      title="Notifications"
                      description="How you receive updates"
                    >
                      <SettingRow label="Group Notifications">
                        <SettingBadge
                          enabled={
                            userSettings.allowEnableGroupNotifications?.currentValue === 'Allowed'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Email Notifications">
                        <SettingBadge
                          enabled={
                            userSettings.allowEnableEmailNotifications?.currentValue === 'Allowed'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Push Notifications">
                        <SettingBadge
                          enabled={
                            userSettings.allowEnablePushNotifications?.currentValue === 'Allowed'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Experience Notifications">
                        <SettingBadge
                          enabled={
                            userSettings.allowEnableExperienceNotifications?.currentValue ===
                            'Allowed'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Marketing Emails">
                        <SettingBadge
                          enabled={
                            userSettings.allowMarketingEmailNotifications?.currentValue ===
                            'Enabled'
                          }
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Clock size={18} />}
                      title="Do Not Disturb"
                      description="Quiet hours settings"
                    >
                      <SettingRow label="Status">
                        <SettingBadge
                          enabled={userSettings.doNotDisturb?.currentValue === 'Enabled'}
                        />
                      </SettingRow>
                      {userSettings.doNotDisturbTimeWindow && (
                        <SettingRow label="Time Window">
                          <span className="text-sm text-neutral-300">
                            {formatTimeWindow(
                              userSettings.doNotDisturbTimeWindow.currentValue.startTimeMinutes,
                              userSettings.doNotDisturbTimeWindow.currentValue.endTimeMinutes
                            )}
                          </span>
                        </SettingRow>
                      )}
                    </SettingCard>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h3 className="text-lg font-semibold text-white mb-1">Security Settings</h3>
                  <p className="text-sm text-neutral-400 mb-6">
                    Account security and verification status.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingCard
                      icon={<Shield size={18} />}
                      title="Two-Step Verification"
                      description="Enhanced account protection"
                    >
                      <SettingRow label="Status">
                        <SettingBadge
                          enabled={accountSettings.MyAccountSecurityModel.IsTwoStepEnabled}
                        />
                      </SettingRow>
                      <SettingRow label="Toggle Available">
                        <SettingBadge enabled={accountSettings.IsTwoStepToggleEnabled} />
                      </SettingRow>
                      <SettingRow label="2FA for Password Change">
                        <SettingBadge
                          enabled={accountSettings.ChangePasswordRequiresTwoStepVerification}
                        />
                      </SettingRow>
                      <SettingRow label="2FA for Email Change">
                        <SettingBadge
                          enabled={accountSettings.ChangeEmailRequiresTwoStepVerification}
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Lock size={18} />}
                      title="Account Protection"
                      description="PIN and restrictions"
                    >
                      <SettingRow label="Account PIN">
                        <SettingBadge
                          enabled={accountSettings.IsAccountPinEnabled}
                          label={accountSettings.IsAccountPinEnabled ? 'Set' : 'Not Set'}
                        />
                      </SettingRow>
                      <SettingRow label="Account Restrictions">
                        <SettingBadge
                          enabled={accountSettings.IsAccountRestrictionsFeatureEnabled}
                        />
                      </SettingRow>
                      <SettingRow label="Parental Spend Controls">
                        <SettingBadge enabled={accountSettings.IsParentalSpendControlsEnabled} />
                      </SettingRow>
                      <SettingRow label="Super Safe Privacy Mode">
                        <SettingBadge enabled={accountSettings.UseSuperSafePrivacyMode} />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Globe size={18} />}
                      title="Session Information"
                      description="Current session details"
                    >
                      <SettingRow label="IP Address">
                        <span className="text-sm text-neutral-300 font-mono">
                          {accountSettings.ClientIpAddress}
                        </span>
                      </SettingRow>
                      <SettingRow label="Valid Password">
                        <SettingBadge enabled={accountSettings.HasValidPasswordSet} />
                      </SettingRow>
                      <SettingRow label="Bound Auth Token">
                        <SettingBadge
                          enabled={
                            userSettings.boundAuthTokenValidation?.currentValue === 'Enabled'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Sign Out All Sessions">
                        <SettingBadge
                          enabled={
                            accountSettings.MyAccountSecurityModel.ShowSignOutFromAllSessions
                          }
                          label="Available"
                        />
                      </SettingRow>
                    </SettingCard>

                    <SettingCard
                      icon={<Settings2 size={18} />}
                      title="Permissions"
                      description="Third-party and data settings"
                    >
                      <SettingRow label="Third-Party Apps">
                        <SettingBadge
                          enabled={
                            userSettings.allowThirdPartyAppPermissions?.currentValue === 'Enabled'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Voice Data Usage">
                        <SettingBadge
                          enabled={userSettings.allowVoiceDataUsage?.currentValue === 'Enabled'}
                        />
                      </SettingRow>
                      <SettingRow label="Facial Age Estimation">
                        <SettingBadge
                          enabled={
                            userSettings.allowFacialAgeEstimation?.currentValue === 'Enabled'
                          }
                        />
                      </SettingRow>
                      <SettingRow label="Fast Track">
                        <SettingBadge enabled={accountSettings.IsFastTrackAccessible} />
                      </SettingRow>
                    </SettingCard>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountSettingsTab
