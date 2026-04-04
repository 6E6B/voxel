import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, Smartphone, Loader2, Check, AlertTriangle, RefreshCw } from 'lucide-react'
import { Tabs } from '@renderer/shared/ui/navigation/Tabs'
import { useSetSelectedIds } from '@renderer/shared/stores/useSelectionStore'
import {
  logQuickLogin,
  logQuickLoginError,
  quickLoginAttemptDetails
} from '@renderer/features/auth/quickLoginLogging'
import { Account, AccountStatus } from '@renderer/shared/types'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import type { QuickLoginCode, QuickLoginStatus } from '@shared/contracts/auth'
import type { UserSummary } from '@shared/contracts/user'

interface AddAccountStepProps {
  onAccountAdded: () => void
  onSkip: () => void
}

const AddAccountStep: React.FC<AddAccountStepProps> = ({ onAccountAdded, onSkip }) => {
  const queryClient = useQueryClient()
  const setSelectedIds = useSetSelectedIds()
  const [method, setMethod] = useState<'quick' | 'cookie'>('quick')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cookie method state
  const [cookie, setCookie] = useState('')
  const [isCookieBlurred, setIsCookieBlurred] = useState(true)

  // Quick login state
  const [quickLoginData, setQuickLoginData] = useState<QuickLoginCode | null>(null)
  const [quickLoginStatus, setQuickLoginStatus] = useState('')
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null)
  const generateCodeRef = React.useRef<() => void>(() => { })
  const stopPollingRef = React.useRef<() => void>(() => { })
  const quickLoginGenerationInFlightRef = React.useRef(false)

  React.useEffect(() => {
    if (method !== 'quick') {
      stopPollingRef.current()
      return
    }

    if (!quickLoginData && !isLoading) {
      generateCodeRef.current()
    }
  }, [method, quickLoginData, isLoading])

  React.useEffect(() => {
    return () => stopPollingRef.current()
  }, [])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }

  const generateCode = async () => {
    if (quickLoginGenerationInFlightRef.current) {
      logQuickLogin('Onboarding', 'Skipped duplicate quick login generation request')
      return
    }

    quickLoginGenerationInFlightRef.current = true
    setIsLoading(true)
    stopPollingRef.current()
    logQuickLogin('Onboarding', 'Generating quick login code')
    try {
      const data = (await window.api.generateQuickLoginCode()) as QuickLoginCode
      logQuickLogin('Onboarding', 'Generated quick login code', {
        status: data.status,
        expirationTime: data.expirationTime,
        ...quickLoginAttemptDetails(data.code, data.privateKey)
      })
      setQuickLoginData(data)
      setQuickLoginStatus(data.status)
      startPolling(data.code, data.privateKey)
    } catch (err) {
      logQuickLoginError('Onboarding', 'Failed to generate quick login code', err)
      console.error('Failed to generate quick login code:', err)
      setError('Failed to generate login code')
    } finally {
      quickLoginGenerationInFlightRef.current = false
      setIsLoading(false)
    }
  }

  generateCodeRef.current = generateCode
  stopPollingRef.current = stopPolling

  const startPolling = (code: string, privateKey: string) => {
    stopPolling()
    logQuickLogin(
      'Onboarding',
      'Starting quick login polling',
      quickLoginAttemptDetails(code, privateKey)
    )

    const poll = async () => {
      try {
        const result = (await window.api.checkQuickLoginStatus(code, privateKey)) as QuickLoginStatus
        if (!pollingRef.current) return
        logQuickLogin('Onboarding', 'Polled quick login status', { status: result.status })
        setQuickLoginStatus(result.status)
        if (result.status === 'Validated') {
          logQuickLogin('Onboarding', 'Quick login validated, attempting completion')
          stopPolling()
          await handleQuickLoginComplete(code, privateKey)
          return
        } else if (result.status === 'Cancelled' || result.status === 'CodeInvalid') {
          logQuickLogin('Onboarding', 'Quick login requires regeneration', {
            status: result.status
          })
          stopPolling()
          setQuickLoginData(null)
          generateCodeRef.current()
          return
        }
        logQuickLogin('Onboarding', 'Scheduling next quick login status poll', {
          delayMs: 3000
        })
        pollingRef.current = setTimeout(poll, 3000)
      } catch (err) {
        logQuickLoginError(
          'Onboarding',
          'Quick login polling error',
          err,
          quickLoginAttemptDetails(code, privateKey)
        )
        console.error('Polling error:', err)
        if (pollingRef.current) {
          logQuickLogin('Onboarding', 'Retrying quick login status poll after error', {
            delayMs: 3000
          })
          pollingRef.current = setTimeout(poll, 3000)
        }
      }
    }
    logQuickLogin('Onboarding', 'Scheduling first quick login status poll', {
      delayMs: 3000
    })
    pollingRef.current = setTimeout(poll, 3000)
  }

  const handleQuickLoginComplete = async (code: string, privateKey: string) => {
    setIsLoading(true)
    setError(null)
    logQuickLogin(
      'Onboarding',
      'Completing quick login exchange',
      quickLoginAttemptDetails(code, privateKey)
    )
    try {
      const cookieValue = (await window.api.completeQuickLogin(code, privateKey)) as string
      logQuickLogin('Onboarding', 'Quick login exchange returned a cookie', {
        cookieLength: cookieValue.length
      })
      await addAccountFromCookie(cookieValue)
    } catch (err: any) {
      logQuickLoginError(
        'Onboarding',
        'Failed to complete quick login',
        err,
        quickLoginAttemptDetails(code, privateKey)
      )
      console.error('Failed to complete quick login:', err)
      setError(err?.message || 'Failed to complete login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cookie.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      await addAccountFromCookie(cookie)
    } catch {
      setError('Failed to add account. Please check the cookie.')
    } finally {
      setIsLoading(false)
    }
  }

  const addAccountFromCookie = async (cookieValue: string) => {
    const trimmed = cookieValue.trim()
    const expectedStart =
      '_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_'

    let actualCookieValue = trimmed
    const match = trimmed.match(/\.ROBLOSECURITY=([^;]+)/)
    if (match) actualCookieValue = match[1]

    logQuickLogin('Onboarding', 'Validating cookie returned from login flow', {
      cookieLength: trimmed.length,
      containedCookieHeader: Boolean(match)
    })

    if (!actualCookieValue.startsWith(expectedStart)) {
      throw new Error('Invalid cookie format')
    }

    const data = (await window.api.validateCookie(cookieValue)) as UserSummary
    const avatarUrl = (await window.api.getAvatarUrl(data.id.toString())) as string
    logQuickLogin('Onboarding', 'Validated cookie for Roblox account', {
      userId: data.id
    })

    // Get existing accounts to check for duplicates
    const existingAccounts = (await window.api.getAccounts()) as Account[]
    if (existingAccounts.some((acc: Account) => acc.id === data.id.toString())) {
      throw new Error('Account already added')
    }

    // Create the new account
    const newAccount: Account = {
      id: data.id.toString(),
      displayName: data.displayName,
      username: data.name,
      userId: data.id.toString(),
      cookie: actualCookieValue,
      status: AccountStatus.Offline,
      notes: 'Added during onboarding',
      avatarUrl: avatarUrl,
      lastActive: '',
      robuxBalance: 0,
      friendCount: 0,
      followerCount: 0,
      followingCount: 0
    }

    // Save all accounts including the new one
    const nextAccounts = [...existingAccounts, newAccount]
    await window.api.saveAccounts(nextAccounts)
    queryClient.setQueryData(queryKeys.accounts.list(), nextAccounts)

    if (existingAccounts.length === 0) {
      await window.api.setSettings({ primaryAccountId: newAccount.id })
      queryClient.setQueryData(
        queryKeys.settings.snapshot(),
        (current: Record<string, unknown> | undefined) => ({
          ...(current ?? {}),
          primaryAccountId: newAccount.id
        })
      )
      setSelectedIds(new Set([newAccount.id]))
      logQuickLogin('Onboarding', 'Set onboarding account as primary selection', {
        userId: data.id
      })
    }

    logQuickLogin('Onboarding', 'Saved account from quick login cookie', {
      userId: data.id
    })

    setSuccess(true)
    setTimeout(() => {
      onAccountAdded()
    }, 1500)
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Account Added!</h3>
        <p className="text-neutral-400 text-sm">Continuing to next step...</p>
      </motion.div>
    )
  }

  return (
    <div className={method === 'quick' ? 'space-y-6' : 'space-y-4'}>
      <Tabs
        tabs={[
          { id: 'quick', label: 'Code', icon: Smartphone },
          { id: 'cookie', label: 'Cookie', icon: Cookie }
        ]}
        activeTab={method}
        onTabChange={(tabId) => {
          setError(null)
          setMethod(tabId as 'quick' | 'cookie')
        }}
        layoutId="onboardingAddAccountTab"
        tabClassName="pressable"
        className="-mx-6 -mt-6"
      />

      <AnimatePresence mode="wait">
        {method === 'quick' && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-center"
          >
            <div className="flex justify-center">
              <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
                {isLoading && !quickLoginData ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                  </div>
                ) : quickLoginData ? (
                  <div className="w-48 h-48 flex flex-col items-center justify-center space-y-4">
                    <div className="text-4xl font-mono font-bold tracking-wider text-white bg-black/50 px-4 py-2 rounded-lg border border-neutral-700 whitespace-nowrap">
                      {quickLoginData.code.match(/.{1,3}/g)?.join(' ')}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Enter this code in your Roblox Quick Login settings
                    </p>
                  </div>
                ) : (
                  <div className="w-48 h-48 flex flex-col items-center justify-center text-neutral-500">
                    <p>Failed to generate code</p>
                    <button
                      onClick={generateCode}
                      className="pressable mt-2 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-white flex items-center gap-2"
                    >
                      <RefreshCw size={14} /> Retry
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-medium text-white">
                {quickLoginStatus === 'Validated'
                  ? 'Logging in...'
                  : quickLoginStatus === 'UserLinked'
                    ? 'Please confirm on your device...'
                    : 'Waiting for you...'}
              </h4>
              <p className="text-sm text-neutral-500">
                1. Open Roblox on your phone or computer
                <br />
                2. Go to Settings &gt; Quick Login
                <br />
                3. Enter the code displayed above
              </p>
            </div>
          </motion.div>
        )}

        {method === 'cookie' && (
          <motion.div
            key="cookie"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={handleCookieSubmit} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 items-start">
                <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-yellow-200/80 leading-relaxed">
                  Your security is important. Cookies are processed locally and encrypted.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="cookieInput" className="text-sm font-medium text-neutral-400">
                    .ROBLOSECURITY Cookie
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCookieBlurred((prev) => !prev)}
                    className="pressable text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {isCookieBlurred ? 'Show' : 'Hide'}
                  </button>
                </div>
                <textarea
                  id="cookieInput"
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  disabled={isLoading}
                  placeholder="_|WARNING:-DO-NOT-SHARE-THIS..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all min-h-[132px] resize-none font-mono disabled:opacity-50"
                  style={
                    isCookieBlurred
                      ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                      : undefined
                  }
                />
              </div>

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <button
                type="submit"
                disabled={!cookie.trim() || isLoading}
                className="pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Cookie size={18} />}
                <span>{isLoading ? 'Importing...' : 'Import Account'}</span>
              </button>
            </form>
          </motion.div>
        )}

      </AnimatePresence>

      <div className="pt-4 border-t border-neutral-800">
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default AddAccountStep

