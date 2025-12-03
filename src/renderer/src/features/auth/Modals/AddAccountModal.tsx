import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Cookie,
  ShieldAlert,
  Loader2,
  Smartphone,
  RefreshCw,
  LogIn,
  Info
} from 'lucide-react'
import { Dialog, DialogContent, DialogClose } from '@renderer/components/UI/dialogs/Dialog'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (cookie: string) => Promise<void> | void
}

const requestRobloxLoginCookie = async (): Promise<string> => {
  if (typeof window.api.openRobloxLoginWindow === 'function') {
    return window.api.openRobloxLoginWindow()
  }

  const ipc = (window.electron as any)?.ipcRenderer
  if (ipc?.invoke) {
    return ipc.invoke('open-roblox-login-window')
  }

  throw new Error('ROBLOX_LOGIN_UNAVAILABLE')
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [method, setMethod] = useState<'cookie' | 'quick' | 'browser'>('quick')

  // Cookie Method State
  const [cookie, setCookie] = useState('')
  const [isCookieBlurred, setIsCookieBlurred] = useState(true)

  // Quick Login State
  const [quickLoginData, setQuickLoginData] = useState<{
    code: string
    privateKey: string
    expirationTime: string
  } | null>(null)
  const [quickLoginStatus, setQuickLoginStatus] = useState<string>('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [browserLoginStatus, setBrowserLoginStatus] = useState<'idle' | 'waiting' | 'error'>('idle')
  const [browserLoginError, setBrowserLoginError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false)
      setMethod('quick')
      setBrowserLoginStatus('idle')
      setBrowserLoginError('')
      setIsCookieBlurred(true)
    } else {
      stopPolling()
      setQuickLoginData(null)
      setQuickLoginStatus('')
      setCookie('')
      setIsCookieBlurred(true)
      setBrowserLoginStatus('idle')
      setBrowserLoginError('')
    }
  }, [isOpen])

  // Generate code when switching to quick login
  useEffect(() => {
    if (isOpen && method === 'quick' && !quickLoginData && !isLoading) {
      generateCode()
    }
    return () => stopPolling()
  }, [isOpen, method])

  useEffect(() => {
    if (method !== 'browser') {
      setBrowserLoginStatus('idle')
      setBrowserLoginError('')
    }
  }, [method])

  const generateCode = async () => {
    setIsLoading(true)
    stopPolling()
    try {
      const data = await window.api.generateQuickLoginCode()
      setQuickLoginData(data)
      setQuickLoginStatus(data.status)
      startPolling(data.code, data.privateKey)
    } catch (error) {
      console.error('Failed to generate quick login code:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPolling = (code: string, privateKey: string) => {
    stopPolling()

    const poll = async () => {
      try {
        const result = await window.api.checkQuickLoginStatus(code, privateKey)

        if (!pollingRef.current) return

        setQuickLoginStatus(result.status)

        if (result.status === 'Validated') {
          stopPolling()
          await handleQuickLoginComplete(code, privateKey)
          return
        } else if (result.status === 'Cancelled') {
          stopPolling()
          setQuickLoginData(null)
          return
        } else if (result.status === 'CodeInvalid') {
          // Code expired or invalid, regenerate a new one
          stopPolling()
          setQuickLoginData(null)
          generateCode()
          return
        }

        pollingRef.current = setTimeout(poll, 3000)
      } catch (error) {
        console.error('Polling error:', error)
        if (pollingRef.current) {
          pollingRef.current = setTimeout(poll, 3000)
        }
      }
    }

    pollingRef.current = setTimeout(poll, 3000)
  }

  const handleQuickLoginComplete = async (code: string, privateKey: string) => {
    setIsLoading(true)
    try {
      const cookie = await window.api.completeQuickLogin(code, privateKey)
      await onAdd(cookie)
      onClose()
    } catch (error) {
      console.error('Failed to complete quick login:', error)
      setQuickLoginStatus('Failed to exchange token')
      setIsLoading(false)
    }
  }

  const handleBrowserLogin = async () => {
    if (isLoading) return
    setBrowserLoginError('')
    setBrowserLoginStatus('waiting')
    setIsLoading(true)
    try {
      const cookieValue = await requestRobloxLoginCookie()
      await onAdd(cookieValue)
      onClose()
    } catch (error) {
      console.error('Failed to capture Roblox login:', error)
      setBrowserLoginStatus('error')
      if (error instanceof Error) {
        if (error.message === 'LOGIN_WINDOW_CLOSED') {
          setBrowserLoginError('Login window closed before completing sign-in.')
        } else if (error.message === 'ROBLOX_LOGIN_UNAVAILABLE') {
          setBrowserLoginError(
            'This build needs to be restarted to enable Roblox login. Please fully reload the app.'
          )
        } else {
          setBrowserLoginError('Failed to capture the Roblox session. Please try again.')
        }
      } else {
        setBrowserLoginError('Failed to capture the Roblox session. Please try again.')
      }
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
      <DialogContent className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-[var(--accent-color-ring)]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              {method === 'cookie' ? (
                <Cookie size={20} className="text-neutral-300" />
              ) : method === 'quick' ? (
                <Smartphone size={20} className="text-neutral-300" />
              ) : (
                <LogIn size={20} className="text-neutral-300" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Add Account</h3>
              <p className="text-sm text-neutral-500">
                {method === 'cookie'
                  ? 'Import via Cookie'
                  : method === 'quick'
                    ? 'Quick Login via Roblox App'
                    : 'Official Roblox Login'}
              </p>
            </div>
          </div>
          <DialogClose disabled={isLoading && method === 'cookie'} />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'quick', label: 'Code', icon: Smartphone },
            { id: 'cookie', label: 'Cookie', icon: Cookie },
            { id: 'browser', label: 'Login', icon: LogIn }
          ]}
          activeTab={method}
          onTabChange={(tabId) => setMethod(tabId as 'cookie' | 'quick' | 'browser')}
          layoutId="addAccountTabIndicator"
          tabClassName="pressable"
        />

        <div className="p-6">
          {method === 'cookie' ? (
            <form onSubmit={handleCookieSubmit} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 items-start">
                <ShieldAlert className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                <p className="text-s text-yellow-200/80 leading-relaxed">
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
                  placeholder="_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-to-your-account-and-steal-your-ROBUX-and-items.|_..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all min-h-[120px] resize-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    isCookieBlurred
                      ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
                      : undefined
                  }
                  autoFocus
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cookie.trim() || isLoading}
                  className="pressable flex-[2] flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span>{isLoading ? 'Importing...' : 'Import Account'}</span>
                </button>
              </div>
            </form>
          ) : method === 'quick' ? (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
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
                    2. Go to Settings {'>'} Quick Login
                    <br />
                    3. Enter the code displayed above
                  </p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-left">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-100/90 flex items-start gap-3">
                <Info size={18} className="text-blue-300 shrink-0 mt-0.5" />
                <p>
                  We'll open the official Roblox login page inside a sandboxed window. The
                  .ROBLOSECURITY cookie will be captured directly from Roblox.
                </p>
              </div>
              <div className="space-y-2 text-sm text-neutral-400">
                <p className="text-neutral-300 font-medium">How it works</p>
                <ul className="list-decimal list-inside space-y-1">
                  <li>Click &ldquo;Open Roblox Login&rdquo; to launch the official page.</li>
                  <li>Sign in inside the new window.</li>
                  <li>Once Roblox finishes, we import the account automatically.</li>
                </ul>
              </div>
              {browserLoginError && (
                <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {browserLoginError}
                </div>
              )}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBrowserLogin}
                  disabled={isLoading}
                  className="pressable flex-[2] flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  <span>{isLoading ? 'Waiting on Roblox...' : 'Open Roblox Login'}</span>
                </button>
              </div>
              {browserLoginStatus === 'waiting' && (
                <p className="text-sm text-neutral-400 text-center">
                  Login window is open. Complete the Roblox sign-in to continue.
                </p>
              )}
              <p className="text-xs text-neutral-500 text-center">
                The login session stays on your device and is cleared after the cookie is captured.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddAccountModal
