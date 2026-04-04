import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldAlert,
  Loader2,
  RefreshCw
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '@renderer/shared/ui/dialogs/Dialog'
import { Tabs } from '@renderer/shared/ui/navigation/Tabs'
import {
  logQuickLogin,
  logQuickLoginError,
  quickLoginAttemptDetails
} from '@renderer/features/auth/quickLoginLogging'
import type { QuickLoginCode, QuickLoginStatus } from '@shared/contracts/auth'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (cookie: string) => Promise<void> | void
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [method, setMethod] = useState<'cookie' | 'quick'>('quick')

  const [cookie, setCookie] = useState('')
  const [isCookieBlurred, setIsCookieBlurred] = useState(true)

  const [quickLoginData, setQuickLoginData] = useState<QuickLoginCode | null>(null)
  const [quickLoginStatus, setQuickLoginStatus] = useState<string>('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const generateCodeRef = useRef<() => void>(() => { })
  const stopPollingRef = useRef<() => void>(() => { })
  const quickLoginGenerationInFlightRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false)
      setMethod('quick')
      setIsCookieBlurred(true)
    } else {
      stopPollingRef.current()
      setQuickLoginData(null)
      setQuickLoginStatus('')
      setCookie('')
      setIsCookieBlurred(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    if (method !== 'quick') {
      stopPollingRef.current()
      return
    }

    if (!quickLoginData && !isLoading) {
      generateCodeRef.current()
    }
  }, [isOpen, method, quickLoginData, isLoading])

  useEffect(() => {
    return () => stopPollingRef.current()
  }, [])

  const generateCode = async () => {
    if (quickLoginGenerationInFlightRef.current) {
      logQuickLogin('AddAccountModal', 'Skipped duplicate quick login generation request')
      return
    }

    quickLoginGenerationInFlightRef.current = true
    setIsLoading(true)
    stopPollingRef.current()
    logQuickLogin('AddAccountModal', 'Generating quick login code')
    try {
      const data = (await window.api.generateQuickLoginCode()) as QuickLoginCode
      logQuickLogin('AddAccountModal', 'Generated quick login code', {
        status: data.status,
        expirationTime: data.expirationTime,
        ...quickLoginAttemptDetails(data.code, data.privateKey)
      })
      setQuickLoginData(data)
      setQuickLoginStatus(data.status)
      startPolling(data.code, data.privateKey)
    } catch (error) {
      logQuickLoginError('AddAccountModal', 'Failed to generate quick login code', error)
      console.error('Failed to generate quick login code:', error)
    } finally {
      quickLoginGenerationInFlightRef.current = false
      setIsLoading(false)
    }
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }

  generateCodeRef.current = generateCode
  stopPollingRef.current = stopPolling

  const startPolling = (code: string, privateKey: string) => {
    stopPolling()
    logQuickLogin(
      'AddAccountModal',
      'Starting quick login polling',
      quickLoginAttemptDetails(code, privateKey)
    )

    const poll = async () => {
      try {
        const result = (await window.api.checkQuickLoginStatus(
          code,
          privateKey
        )) as QuickLoginStatus

        if (!pollingRef.current) return

        logQuickLogin('AddAccountModal', 'Polled quick login status', { status: result.status })
        setQuickLoginStatus(result.status)

        if (result.status === 'Validated') {
          logQuickLogin('AddAccountModal', 'Quick login validated, attempting completion')
          stopPolling()
          await handleQuickLoginComplete(code, privateKey)
          return
        } else if (result.status === 'Cancelled') {
          logQuickLogin('AddAccountModal', 'Quick login cancelled by Roblox')
          stopPolling()
          setQuickLoginData(null)
          return
        } else if (result.status === 'CodeInvalid') {
          logQuickLogin('AddAccountModal', 'Quick login code invalid, regenerating')
          stopPolling()
          setQuickLoginData(null)
          generateCodeRef.current()
          return
        }

        logQuickLogin('AddAccountModal', 'Scheduling next quick login status poll', {
          delayMs: 3000
        })
        pollingRef.current = setTimeout(poll, 3000)
      } catch (error) {
        logQuickLoginError(
          'AddAccountModal',
          'Quick login polling error',
          error,
          quickLoginAttemptDetails(code, privateKey)
        )
        console.error('Polling error:', error)
        if (pollingRef.current) {
          logQuickLogin('AddAccountModal', 'Retrying quick login status poll after error', {
            delayMs: 3000
          })
          pollingRef.current = setTimeout(poll, 3000)
        }
      }
    }

    logQuickLogin('AddAccountModal', 'Scheduling first quick login status poll', {
      delayMs: 3000
    })
    pollingRef.current = setTimeout(poll, 3000)
  }

  const handleQuickLoginComplete = async (code: string, privateKey: string) => {
    setIsLoading(true)
    logQuickLogin(
      'AddAccountModal',
      'Completing quick login exchange',
      quickLoginAttemptDetails(code, privateKey)
    )
    try {
      const cookie = (await window.api.completeQuickLogin(code, privateKey)) as string
      logQuickLogin('AddAccountModal', 'Quick login exchange returned a cookie', {
        cookieLength: cookie.length
      })
      await onAdd(cookie)
      onClose()
    } catch (error: any) {
      logQuickLoginError(
        'AddAccountModal',
        'Failed to complete quick login',
        error,
        quickLoginAttemptDetails(code, privateKey)
      )
      console.error('Failed to complete quick login:', error)
      setQuickLoginStatus(error?.message || 'Failed to exchange token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCookieSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cookie.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onAdd(cookie)
      setCookie('')
      onClose() // Close on success
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogClose disabled={isLoading && method === 'cookie'} />
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'quick', label: 'Code' },
            { id: 'cookie', label: 'Cookie' }
          ]}
          activeTab={method}
          onTabChange={(tabId) => setMethod(tabId as 'cookie' | 'quick')}
          layoutId="addAccountTabIndicator"
          tabClassName="pressable"
        />

        <DialogBody className="p-0">
          {method === 'cookie' ? (
            <form onSubmit={handleCookieSubmit} className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg p-2.5">
                <ShieldAlert className="shrink-0 mt-0.5" size={14} />
                <span>Cookies are processed locally and encrypted.</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="cookieInput" className="text-xs font-medium text-[var(--color-text-muted)]">
                    .ROBLOSECURITY Cookie
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCookieBlurred((prev) => !prev)}
                    className="pressable text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
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
                  className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors min-h-[132px] resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    isCookieBlurred
                      ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                      : undefined
                  }
                  autoFocus
                />
              </div>

              <DialogFooter className="pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="pressable flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cookie.trim() || isLoading}
                  className="pressable flex-[2] flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>{isLoading ? 'Importing...' : 'Import'}</span>
                </button>
              </DialogFooter>
            </form>
          ) : (
            <div className="flex min-h-[390px] flex-col justify-between gap-5 text-center px-5 py-4">
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="bg-[var(--color-surface-muted)] p-4 rounded-2xl border border-[var(--color-border)]">
                    {isLoading && !quickLoginData ? (
                      <div className="w-48 h-48 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-text-muted)]" />
                      </div>
                    ) : quickLoginData ? (
                      <div className="w-48 h-48 flex flex-col items-center justify-center space-y-4">
                        <div className="text-4xl font-mono font-bold tracking-wider text-[var(--color-text-primary)] bg-[var(--color-surface-strong)] px-4 py-2 rounded-xl border border-[var(--color-border)] whitespace-nowrap">
                          {quickLoginData.code.match(/.{1,3}/g)?.join(' ')}
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Enter this code in your Roblox Quick Login settings
                        </p>
                      </div>
                    ) : (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                        <p>Failed to generate code</p>
                        <button
                          onClick={generateCode}
                          className="pressable mt-2 px-3 py-1 bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-strong)] rounded-lg text-sm text-[var(--color-text-primary)] flex items-center gap-2"
                        >
                          <RefreshCw size={14} /> Retry
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-medium text-[var(--color-text-primary)]">
                    {quickLoginStatus === 'Validated'
                      ? 'Logging in...'
                      : quickLoginStatus === 'UserLinked'
                        ? 'Please confirm on your device...'
                        : 'Waiting for you...'}
                  </h4>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    1. Open Roblox on your phone or computer
                    <br />
                    2. Go to Settings {'>'} Quick Login
                    <br />
                    3. Enter the code displayed above
                  </p>
                </div>
              </div>

              <DialogFooter>
                <button
                  type="button"
                  onClick={onClose}
                  className="pressable flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default AddAccountModal

