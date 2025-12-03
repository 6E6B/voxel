import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, X, Delete, AlertTriangle } from 'lucide-react'

interface PinLockScreenProps {
  onUnlock: () => void
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState(5)
  const [isCheckingLockout, setIsCheckingLockout] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const lastVerifiedPinRef = useRef<string>('') // Track last verified PIN to prevent duplicate calls
  useEffect(() => {
    const checkLockoutStatus = async () => {
      try {
        const status = await window.api.getPinLockoutStatus()
        if (status.locked && status.lockoutSeconds) {
          setIsLocked(true)
          setLockoutSeconds(status.lockoutSeconds)
          setRemainingAttempts(0)
          setError('Too many failed attempts. Please wait.')
        } else {
          setRemainingAttempts(status.remainingAttempts)
        }
      } catch (err) {
        console.error('Failed to check lockout status:', err)
      } finally {
        setIsCheckingLockout(false)
      }
    }
    checkLockoutStatus()
  }, [])

  // Focus first input on mount
  useEffect(() => {
    if (!isLocked && !isCheckingLockout) {
      inputRefs.current[0]?.focus()
    }
  }, [isLocked, isCheckingLockout])

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

  // Verify PIN when all digits are entered
  useEffect(() => {
    const enteredPin = pin.join('')
    // Only verify if:
    // 1. PIN is complete (6 digits)
    // 2. Not currently verifying
    // 3. Not locked out
    // 4. This PIN hasn't already been verified (prevents duplicate calls)
    if (
      enteredPin.length === 6 &&
      !isVerifying &&
      !isLocked &&
      enteredPin !== lastVerifiedPinRef.current
    ) {
      lastVerifiedPinRef.current = enteredPin // Mark this PIN as being verified
      verifyPin(enteredPin)
    }
  }, [pin, isVerifying, isLocked])

  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true)
    setError(null)

    try {
      const result = await window.api.verifyPin(enteredPin)

      if (result.success) {
        onUnlock()
      } else if (result.locked) {
        setIsLocked(true)
        setLockoutSeconds(result.lockoutSeconds || 300)
        setError(`Too many failed attempts. Please wait.`)
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setPin(Array(6).fill(''))
          lastVerifiedPinRef.current = '' // Reset so user can try again after lockout
        }, 500)
      } else {
        setRemainingAttempts(result.remainingAttempts)
        setError(
          result.remainingAttempts === 1
            ? 'Incorrect PIN. 1 attempt remaining!'
            : `Incorrect PIN. ${result.remainingAttempts} attempts remaining.`
        )
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setPin(Array(6).fill(''))
          lastVerifiedPinRef.current = '' // Reset so user can try again
          inputRefs.current[0]?.focus()
        }, 500)
      }
    } catch (err) {
      console.error('PIN verification error:', err)
      setError('An error occurred. Please try again.')
      setPin(Array(6).fill(''))
      lastVerifiedPinRef.current = '' // Reset so user can try again
    } finally {
      setIsVerifying(false)
    }
  }

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      if (isLocked || isVerifying) return

      // Only allow single digit
      const digit = value.slice(-1)
      if (!/^\d?$/.test(digit)) return

      setPin((prev) => {
        const newPin = [...prev]
        newPin[index] = digit
        return newPin
      })

      // Move to next input if digit entered
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    },
    [isLocked, isVerifying]
  )

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isLocked || isVerifying) return

      if (e.key === 'Backspace') {
        if (!pin[index] && index > 0) {
          // Move to previous input if current is empty
          inputRefs.current[index - 1]?.focus()
          setPin((prev) => {
            const newPin = [...prev]
            newPin[index - 1] = ''
            return newPin
          })
        } else {
          setPin((prev) => {
            const newPin = [...prev]
            newPin[index] = ''
            return newPin
          })
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === 'ArrowRight' && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
    },
    [pin, isLocked, isVerifying]
  )

  const handleNumpadClick = useCallback(
    (digit: string) => {
      if (isLocked || isVerifying) return

      const firstEmptyIndex = pin.findIndex((d) => d === '')
      if (firstEmptyIndex !== -1) {
        handleInputChange(firstEmptyIndex, digit)
        if (firstEmptyIndex < 5) {
          inputRefs.current[firstEmptyIndex + 1]?.focus()
        }
      }
    },
    [pin, handleInputChange, isLocked, isVerifying]
  )

  const handleBackspace = useCallback(() => {
    if (isLocked || isVerifying) return

    const lastFilledIndex = pin
      .map((d, i) => (d ? i : -1))
      .filter((i) => i !== -1)
      .pop()
    if (lastFilledIndex !== undefined) {
      setPin((prev) => {
        const newPin = [...prev]
        newPin[lastFilledIndex] = ''
        return newPin
      })
      inputRefs.current[lastFilledIndex]?.focus()
    }
  }, [pin, isLocked, isVerifying])

  const handleClear = useCallback(() => {
    if (isLocked || isVerifying) return

    setPin(Array(6).fill(''))
    lastVerifiedPinRef.current = '' // Reset so user can try again
    inputRefs.current[0]?.focus()
  }, [isLocked, isVerifying])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />

      {/* Loading state while checking lockout */}
      {isCheckingLockout ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="mb-4 p-4 rounded-full bg-neutral-900 border border-neutral-800">
            <Lock className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-500 text-sm">Checking security status...</p>
        </motion.div>
      ) : (
        /* Content */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center w-full max-w-md px-4"
        >
          {/* Lock Icon */}
          <motion.div
            className={`mb-6 p-4 rounded-full border ${
              isLocked ? 'bg-red-900/20 border-red-800' : 'bg-neutral-900 border-neutral-800'
            }`}
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isLocked ? (
              <AlertTriangle className="w-8 h-8 text-red-500" />
            ) : (
              <Lock className="w-8 h-8 text-neutral-400" />
            )}
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-2xl font-bold text-white mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isLocked ? 'Account Locked' : 'Enter PIN'}
          </motion.h1>
          <motion.p
            className="text-neutral-500 text-sm mb-8 text-center max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isLocked
              ? `Too many failed attempts. Try again in ${formatTime(lockoutSeconds)}`
              : 'Enter your 6-digit PIN to unlock'}
          </motion.p>

          {/* PIN Input */}
          <motion.div
            className="flex gap-2 sm:gap-3 mb-6 justify-center w-full"
            animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {pin.map((digit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLocked || isVerifying}
                  className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono rounded-lg border-2 bg-neutral-900 text-white focus:outline-none transition-all ${
                    isLocked
                      ? 'border-red-800 bg-red-900/10 cursor-not-allowed opacity-50'
                      : error
                        ? 'border-red-500 bg-red-500/10'
                        : digit
                          ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
                          : 'border-neutral-700 focus:border-neutral-500'
                  }`}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Error/Info Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm mb-4 px-4 py-2 rounded-lg ${
                  isLocked
                    ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                    : 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remaining Attempts Indicator */}
          {!isLocked && remainingAttempts < 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-1 mb-4"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < remainingAttempts ? 'bg-yellow-500' : 'bg-neutral-700'
                  }`}
                />
              ))}
            </motion.div>
          )}

          {/* Numpad */}
          <motion.div
            className="grid grid-cols-3 gap-3 sm:gap-4 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                onClick={() => handleNumpadClick(String(num))}
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                disabled={isLocked || isVerifying}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border text-lg sm:text-xl font-medium transition-colors ${
                  isLocked || isVerifying
                    ? 'bg-neutral-900/50 border-neutral-800/50 text-neutral-600 cursor-not-allowed'
                    : 'bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:border-neutral-700'
                }`}
              >
                {num}
              </motion.button>
            ))}
            <motion.button
              onClick={handleClear}
              whileHover={!isLocked ? { scale: 1.05 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              disabled={isLocked || isVerifying}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border transition-colors flex items-center justify-center ${
                isLocked || isVerifying
                  ? 'bg-neutral-900/50 border-neutral-800/50 text-neutral-600 cursor-not-allowed'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700'
              }`}
            >
              <X className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={() => handleNumpadClick('0')}
              whileHover={!isLocked ? { scale: 1.05 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              disabled={isLocked || isVerifying}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border text-lg sm:text-xl font-medium transition-colors ${
                isLocked || isVerifying
                  ? 'bg-neutral-900/50 border-neutral-800/50 text-neutral-600 cursor-not-allowed'
                  : 'bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:border-neutral-700'
              }`}
            >
              0
            </motion.button>
            <motion.button
              onClick={handleBackspace}
              whileHover={!isLocked ? { scale: 1.05 } : {}}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              disabled={isLocked || isVerifying}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border transition-colors flex items-center justify-center ${
                isLocked || isVerifying
                  ? 'bg-neutral-900/50 border-neutral-800/50 text-neutral-600 cursor-not-allowed'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700'
              }`}
            >
              <Delete className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Security note */}
          <motion.p
            className="text-neutral-600 text-xs mt-8 text-center max-w-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Your PIN is securely hashed and encrypted.
            {!isLocked && remainingAttempts === 5 && ' 5 attempts before lockout.'}
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default PinLockScreen
