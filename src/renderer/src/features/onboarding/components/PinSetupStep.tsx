import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Eye, EyeOff, Check, X, Delete } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'

interface PinSetupStepProps {
  onComplete: () => void
  onSkip: () => void
}

const PinSetupStep: React.FC<PinSetupStepProps> = ({ onComplete, onSkip }) => {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(6).fill(''))
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleInputChange = useCallback(
    (index: number, value: string, target: 'pin' | 'confirm' = 'pin') => {
      if (isSubmitting) return
      const digit = value.slice(-1)
      if (!/^\d?$/.test(digit)) return

      const setter = target === 'confirm' ? setConfirmPin : setPin
      const refs = target === 'confirm' ? confirmInputRefs : inputRefs

      setter((prev) => {
        const newPin = [...prev]
        newPin[index] = digit
        return newPin
      })

      if (digit && index < 5) {
        refs.current[index + 1]?.focus()
      }
    },
    [isSubmitting]
  )

  const handleKeyDown = useCallback(
    (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>,
      target: 'pin' | 'confirm' = 'pin'
    ) => {
      if (isSubmitting) return
      const currentPinArray = target === 'confirm' ? confirmPin : pin
      const setter = target === 'confirm' ? setConfirmPin : setPin
      const refs = target === 'confirm' ? confirmInputRefs : inputRefs

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
    [pin, confirmPin, isSubmitting]
  )

  const handleNumpadClick = (digit: string, target: 'pin' | 'confirm' = 'pin') => {
    const currentPinArray = target === 'confirm' ? confirmPin : pin
    const refs = target === 'confirm' ? confirmInputRefs : inputRefs
    const firstEmptyIndex = currentPinArray.findIndex((d) => d === '')
    if (firstEmptyIndex !== -1) {
      handleInputChange(firstEmptyIndex, digit, target)
      if (firstEmptyIndex < 5) {
        refs.current[firstEmptyIndex + 1]?.focus()
      }
    }
  }

  const handleBackspace = (target: 'pin' | 'confirm' = 'pin') => {
    const currentPinArray = target === 'confirm' ? confirmPin : pin
    const setter = target === 'confirm' ? setConfirmPin : setPin
    const refs = target === 'confirm' ? confirmInputRefs : inputRefs
    const lastFilledIndex = currentPinArray
      .map((d, i) => (d ? i : -1))
      .filter((i) => i !== -1)
      .pop()
    if (lastFilledIndex !== undefined) {
      setter((prev) => {
        const newPin = [...prev]
        newPin[lastFilledIndex] = ''
        return newPin
      })
      refs.current[lastFilledIndex]?.focus()
    }
  }

  const handleClear = (target: 'pin' | 'confirm' = 'pin') => {
    const setter = target === 'confirm' ? setConfirmPin : setPin
    const refs = target === 'confirm' ? confirmInputRefs : inputRefs
    setter(Array(6).fill(''))
    refs.current[0]?.focus()
  }

  const handleContinue = () => {
    if (pin.join('').length !== 6) {
      setError('Please enter all 6 digits')
      return
    }
    setError(null)
    setStep('confirm')
    setTimeout(() => confirmInputRefs.current[0]?.focus(), 100)
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
      const result = await window.api.setPin(enteredPin)
      if (result.success) {
        // Invalidate settings query to update UI (pinCode: 'SET')
        await queryClient.invalidateQueries({ queryKey: queryKeys.settings.snapshot() })
        setSuccess(true)
        setTimeout(() => onComplete(), 1500)
      } else {
        setError(result.error || 'Failed to set PIN')
      }
    } catch (_err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setStep('enter')
    setConfirmPin(Array(6).fill(''))
    setError(null)
  }

  const renderPinInputs = (
    values: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    target: 'pin' | 'confirm' = 'pin'
  ) => (
    <div className="flex gap-2 sm:gap-3 justify-center">
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
          disabled={isSubmitting}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono rounded-lg border-2 bg-neutral-900 text-white focus:outline-none transition-all ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            error
              ? 'border-red-500 bg-red-500/10'
              : digit
                ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5'
                : 'border-neutral-700 focus:border-neutral-500'
          }`}
        />
      ))}
    </div>
  )

  const renderNumpad = (target: 'pin' | 'confirm' = 'pin') => (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-[200px] mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <motion.button
          key={num}
          type="button"
          onClick={() => handleNumpadClick(String(num), target)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isSubmitting}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:border-neutral-700 text-lg font-medium transition-colors disabled:opacity-50"
        >
          {num}
        </motion.button>
      ))}
      <motion.button
        type="button"
        onClick={() => handleClear(target)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isSubmitting}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-center disabled:opacity-50"
      >
        <X className="w-5 h-5" />
      </motion.button>
      <motion.button
        type="button"
        onClick={() => handleNumpadClick('0', target)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isSubmitting}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:border-neutral-700 text-lg font-medium transition-colors disabled:opacity-50"
      >
        0
      </motion.button>
      <motion.button
        type="button"
        onClick={() => handleBackspace(target)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isSubmitting}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-center disabled:opacity-50"
      >
        <Delete className="w-5 h-5" />
      </motion.button>
    </div>
  )

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">PIN Set!</h3>
        <p className="text-neutral-400 text-sm">Your app is now protected</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">
          {step === 'enter' ? 'Create a PIN' : 'Confirm your PIN'}
        </h3>
        <p className="text-sm text-neutral-500">
          {step === 'enter'
            ? 'Set a 6-digit PIN to protect your app'
            : 'Re-enter your PIN to confirm'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'enter' && (
          <motion.div
            key="enter"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {renderPinInputs(pin, inputRefs, 'pin')}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </button>
            </div>

            {renderNumpad('pin')}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={handleContinue}
              disabled={pin.join('').length !== 6}
              className="pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {renderPinInputs(confirmPin, confirmInputRefs, 'confirm')}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </button>
            </div>

            {renderNumpad('confirm')}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 text-sm font-medium text-neutral-400 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={confirmPin.join('').length !== 6 || isSubmitting}
                className="pressable flex-1 flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Set PIN'}
              </button>
            </div>
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

export default PinSetupStep
