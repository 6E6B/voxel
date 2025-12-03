import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, User, Lock, Download, Bell, Sparkles, LucideIcon } from 'lucide-react'
import { useOnboardingStore, OnboardingStep } from '../stores/useOnboardingStore'
import appIcon from '../../../../../../resources/build/icons/512x512.png'
import AddAccountStep from './AddAccountStep'
import PinSetupStep from './PinSetupStep'
import InstallationStep from './InstallationStep'
import NotificationsStep from './NotificationsStep'

const STEPS: { id: OnboardingStep; label: string; icon: LucideIcon }[] = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'account', label: 'Account', icon: User },
  { id: 'pin', label: 'Security', icon: Lock },
  { id: 'installation', label: 'Install', icon: Download },
  { id: 'notifications', label: 'Notifications', icon: Bell }
]

const OnboardingScreen: React.FC = () => {
  const { currentStep, setCurrentStep, skipStep, completeOnboarding } = useOnboardingStore()
  const [showWelcomeContent, setShowWelcomeContent] = useState(false)

  // Focus window on first launch
  useEffect(() => {
    window.api.focusWindow()
  }, [])

  useEffect(() => {
    if (currentStep === 'welcome') {
      const timer = setTimeout(() => setShowWelcomeContent(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [currentStep])

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = (step: OnboardingStep) => {
    skipStep(step)
    goToNextStep()
  }

  const handleComplete = () => {
    goToNextStep()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-[var(--accent-color)]/5 blur-3xl"
          initial={{ x: '-50%', y: '-50%', top: '50%', left: '50%' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Progress indicator - only show after welcome */}
      <AnimatePresence>
        {currentStep !== 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 left-0 right-0 flex justify-center z-10"
          >
            <div className="flex items-center gap-2">
              {STEPS.slice(1).map((step, index) => {
                const stepIndex = index + 1 // Offset by 1 since we skip welcome
                const isActive = STEPS.findIndex((s) => s.id === currentStep) === stepIndex
                const isCompleted = currentStepIndex > stepIndex

                return (
                  <React.Fragment key={step.id}>
                    <motion.div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                        isActive
                          ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/20 text-[var(--accent-color)]'
                          : isCompleted
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-500'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <step.icon size={14} />
                    </motion.div>
                    {index < STEPS.length - 2 && (
                      <div
                        className={`w-8 h-0.5 transition-colors ${
                          isCompleted ? 'bg-emerald-500' : 'bg-neutral-800'
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -30 }}
              className="flex flex-col items-center"
            >
              {/* Logo animation */}
              <motion.div
                className="mb-8"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: 0.2
                }}
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl shadow-[var(--accent-color)]/30">
                  <motion.img
                    src={appIcon}
                    alt="Voxel"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {/* App name */}
              <motion.h1
                className="text-4xl font-black text-white mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Voxel
              </motion.h1>

              <motion.p
                className="text-neutral-500 text-lg mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                The open-source Roblox launcher
              </motion.p>

              {/* Welcome content */}
              <AnimatePresence>
                {showWelcomeContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-6"
                  >
                    <div className="space-y-3">
                      {[
                        { icon: User, text: 'Manage multiple Roblox accounts' },
                        { icon: Download, text: 'Control your Roblox versions' },
                        { icon: Lock, text: 'Keep your accounts secure' }
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center gap-3 text-neutral-400"
                        >
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                            <item.icon size={16} className="text-[var(--accent-color)]" />
                          </div>
                          <span className="text-sm">{item.text}</span>
                        </motion.div>
                      ))}
                    </div>

                    <motion.button
                      onClick={goToNextStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-4 rounded-xl transition-colors border border-[var(--accent-color-border)] shadow-[0_10px_40px_var(--accent-color-shadow)]"
                    >
                      <div className="flex items-center justify-center gap-2 pl-5">
                        <span>Get Started</span>
                        <ChevronRight size={20} />
                      </div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Account Step */}
          {currentStep === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl"
            >
              <AddAccountStep
                onAccountAdded={handleComplete}
                onSkip={() => handleSkip('account')}
              />
            </motion.div>
          )}

          {/* PIN Step */}
          {currentStep === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl max-w-lg mx-auto"
            >
              <PinSetupStep onComplete={handleComplete} onSkip={() => handleSkip('pin')} />
            </motion.div>
          )}

          {/* Installation Step */}
          {currentStep === 'installation' && (
            <motion.div
              key="installation"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl"
            >
              <InstallationStep
                onComplete={handleComplete}
                onSkip={() => handleSkip('installation')}
              />
            </motion.div>
          )}

          {/* Notifications Step */}
          {currentStep === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl"
            >
              <NotificationsStep onComplete={completeOnboarding} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Titlebar drag region */}
      <div
        className="absolute top-0 left-0 right-0 h-[45px]"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
    </motion.div>
  )
}

export default OnboardingScreen
