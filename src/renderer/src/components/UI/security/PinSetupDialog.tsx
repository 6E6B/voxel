import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '../dialogs/Dialog'

interface PinSetupDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (
    newPin: string | null,
    currentPin?: string
  ) => Promise<{
    success: boolean
    error?: string
    locked?: boolean
    lockoutSeconds?: number
    remainingAttempts?: number
  }>
  currentPin: string | null
}

type SetupStep = 'verify' | 'enter' | 'confirm' | 'remove'

const PinSetupDialog: React.FC<PinSetupDialogProps> = ({ isOpen, onClose, onSave, currentPin }) => {
  const [step, setStep] = useState<SetupStep>('enter')
  const [verifyPin, setVerifyPin] = useState<string[]>(Array(6).fill(''))
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(6).fill(''))
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(5)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const verifyInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // If PIN is set, start with verify step; otherwise go directly to enter
      setStep(currentPin ? 'verify' : 'enter')
      setVerifyPin(Array(6).fill(''))
      setPin(Array(6).fill(''))
      setConfirmPin(Array(6).fill(''))
      setShowPin(false)
      setError(null)
      setRemoveConfirm(false)
      setIsSubmitting(false)
      setRemainingAttempts(5)
      setIsLocked(false)
      setLockoutSeconds(0)
    }
  }, [isOpen, currentPin])

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsLocked(false)
            setError(null)
            setRemainingAttempts(5)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
    return undefined
  }, [lockoutSeconds])

  // Focus first input when step changes
  useEffect(() => {
    if (isOpen && !isLocked) {
      setTimeout(() => {
        if (step === 'verify') {
          verifyInputRefs.current[0]?.focus()
        } else if (step === 'enter') {
          inputRefs.current[0]?.focus()
        } else if (step === 'confirm') {
          confirmInputRefs.current[0]?.focus()
        }
      }, 100)
    }
  }, [isOpen, step, isLocked])

  const handleInputChange = useCallback(
    (index: number, value: string, target: 'verify' | 'pin' | 'confirm' = 'pin') => {
      if (isLocked || isSubmitting) return
      const digit = value.slice(-1)
      if (!/^\d?$/.test(digit)) return

      const setter =
        target === 'verify' ? setVerifyPin : target === 'confirm' ? setConfirmPin : setPin
      const refs =
        target === 'verify' ? verifyInputRefs : target === 'confirm' ? confirmInputRefs : inputRefs

      setter((prev) => {
        const newPin = [...prev]
        newPin[index] = digit
        return newPin
      })

      if (digit && index < 5) {
        refs.current[index + 1]?.focus()
      }
    },
    [isLocked, isSubmitting]
  )

  const handleKeyDown = useCallback(
    (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>,
      target: 'verify' | 'pin' | 'confirm' = 'pin'
    ) => {
      if (isLocked || isSubmitting) return
      const currentPinArray =
        target === 'verify' ? verifyPin : target === 'confirm' ? confirmPin : pin
      const setter =
        target === 'verify' ? setVerifyPin : target === 'confirm' ? setConfirmPin : setPin
      const refs =
        target === 'verify' ? verifyInputRefs : target === 'confirm' ? confirmInputRefs : inputRefs

      if (e.key === 'Backspace') {
        if (!currentPinArray[index] && index > 0) {
          refs.current[index - 1]?.focus()
          setter((prev) => {
            const newPin = [...prev]
            newPin[index - 1] = ''
            return newPin
          })
        } else {
          setter((prev) => {
            const newPin = [...prev]
            newPin[index] = ''
            return newPin
          })
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        refs.current[index - 1]?.focus()
      } else if (e.key === 'ArrowRight' && index < 5) {
        refs.current[index + 1]?.focus()
      }
    },
    [pin, confirmPin, verifyPin, isLocked, isSubmitting]
  )

  // Handle verify current PIN before allowing changes
  const handleVerifyCurrentPin = async () => {
    const enteredPin = verifyPin.join('')
    if (enteredPin.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Use the onSave with null newPin and currentPin to just verify
      const result = await onSave(null, enteredPin)

      if (result.success) {
        // Verification successful, go to manage step
        setStep('remove')
        setVerifyPin(Array(6).fill(''))
      } else {
        if (result.locked) {
          setIsLocked(true)
          setLockoutSeconds(result.lockoutSeconds || 300)
          setError('Too many failed attempts. Please wait.')
        } else {
          setRemainingAttempts(result.remainingAttempts || 5)
          setError(result.error || 'Incorrect PIN')
          setVerifyPin(Array(6).fill(''))
          verifyInputRefs.current[0]?.focus()
        }
      }
    } catch (_err) {
      setError('An error occurred. Please try again.')
      setVerifyPin(Array(6).fill(''))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinue = () => {
    const enteredPin = pin.join('')
    if (enteredPin.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }
    setError(null)
    setStep('confirm')
  }

  const handleSave = async () => {
    const enteredPin = pin.join('')
    const confirmedPin = confirmPin.join('')

    if (confirmedPin.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    if (enteredPin !== confirmedPin) {
      setError('PINs do not match. Please try again.')
      setConfirmPin(Array(6).fill(''))
      confirmInputRefs.current[0]?.focus()
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Pass the verified current PIN if we had to verify first
      const currentPinForChange = currentPin ? verifyPin.join('') : undefined
      const result = await onSave(enteredPin, currentPinForChange)

      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Failed to set PIN')
      }
    } catch (_err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemovePin = async () => {
    if (!removeConfirm) {
      setRemoveConfirm(true)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Pass the verified current PIN for removal
      const currentPinForRemoval = verifyPin.join('')
      const result = await onSave(null, currentPinForRemoval)

      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Failed to remove PIN')
      }
    } catch (_err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('enter')
      setConfirmPin(Array(6).fill(''))
    } else if (step === 'enter' && currentPin) {
      setStep('verify')
      setPin(Array(6).fill(''))
    }
    setError(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderPinInputs = (
    values: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    target: 'verify' | 'pin' | 'confirm' = 'pin',
    hasError: boolean = false
  ) => (
    <div className="flex gap-2 justify-center">
      {values.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInputChange(index, e.target.value, target)}
          onKeyDown={(e) => handleKeyDown(index, e, target)}
          disabled={isLocked || isSubmitting}
          className={`w-10 h-12 text-center text-xl font-mono rounded-lg border-2 bg-neutral-900 text-white focus:outline-none transition-all ${
            isLocked || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            hasError
              ? 'border-red-500 bg-red-500/10'
              : digit
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
                : 'border-neutral-700 focus:border-neutral-500'
          }`}
        />
      ))}
    </div>
  )

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--accent-color)]" />
            <DialogTitle>{currentPin ? 'PIN Lock Settings' : 'Set Up PIN Lock'}</DialogTitle>
          </div>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          <AnimatePresence mode="wait">
            {/* Verify current PIN step (required before changing/removing) */}
            {step === 'verify' && currentPin && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {isLocked ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-red-400">Account locked</span>
                    </div>
                    <p className="text-sm text-neutral-400 text-center">
                      Too many failed attempts. Try again in {formatTime(lockoutSeconds)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-neutral-400 text-center">
                      Enter your current PIN to continue
                    </p>

                    {renderPinInputs(verifyPin, verifyInputRefs, 'verify', !!error)}

                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showPin ? 'Hide PIN' : 'Show PIN'}
                      </button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                      >
                        <p className="text-red-500 text-xs">{error}</p>
                        {remainingAttempts < 5 && (
                          <p className="text-yellow-500 text-xs mt-1">
                            {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''}{' '}
                            remaining
                          </p>
                        )}
                      </motion.div>
                    )}

                    <DialogFooter>
                      <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleVerifyCurrentPin}
                        disabled={verifyPin.join('').length !== 6 || isSubmitting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-[var(--accent-color-foreground)] bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        {isSubmitting ? 'Verifying...' : 'Continue'}
                      </button>
                    </DialogFooter>
                  </>
                )}
              </motion.div>
            )}

            {step === 'remove' && currentPin && (
              <motion.div
                key="remove"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-400">PIN lock is currently enabled</span>
                </div>

                <p className="text-sm text-neutral-400">
                  Your app is protected with a 6-digit PIN. Would you like to remove it?
                </p>

                {removeConfirm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                  >
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-yellow-400">Click again to confirm removal</span>
                  </motion.div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-xs text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <DialogFooter>
                  <button
                    onClick={() => {
                      setStep('enter')
                      setRemoveConfirm(false)
                      setError(null)
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Change PIN
                  </button>
                  <button
                    onClick={handleRemovePin}
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      removeConfirm
                        ? 'text-white bg-red-600 hover:bg-red-500'
                        : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    } disabled:opacity-50`}
                  >
                    {isSubmitting ? 'Removing...' : 'Remove PIN'}
                  </button>
                </DialogFooter>
              </motion.div>
            )}

            {step === 'enter' && (
              <motion.div
                key="enter"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <p className="text-sm text-neutral-400 text-center">
                  {currentPin
                    ? 'Enter your new 6-digit PIN'
                    : 'Enter a 6-digit PIN to protect your app'}
                </p>

                {renderPinInputs(pin, inputRefs, 'pin')}

                <div className="flex justify-center">
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPin ? 'Hide PIN' : 'Show PIN'}
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-xs text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <DialogFooter>
                  <button
                    onClick={currentPin ? handleBack : onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    {currentPin ? 'Back' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={pin.join('').length !== 6}
                    className="flex-1 px-4 py-2 text-sm font-medium text-[var(--accent-color-foreground)] bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </DialogFooter>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-neutral-400 text-center">Confirm your PIN</p>

                {renderPinInputs(confirmPin, confirmInputRefs, 'confirm', !!error)}

                <div className="flex justify-center">
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPin ? 'Hide PIN' : 'Show PIN'}
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-xs text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <DialogFooter>
                  <button
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={confirmPin.join('').length !== 6 || isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-[var(--accent-color-foreground)] bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : 'Save PIN'}
                  </button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default PinSetupDialog
