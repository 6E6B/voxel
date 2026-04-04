import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type OnboardingStep =
  | 'welcome'
  | 'account'
  | 'pin'
  | 'installation'
  | 'notifications'
  | 'complete'

interface OnboardingState {
  hasCompletedOnboarding: boolean
  currentStep: OnboardingStep
  skippedSteps: OnboardingStep[]
}

interface OnboardingActions {
  setCurrentStep: (step: OnboardingStep) => void
  skipStep: (step: OnboardingStep) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

type OnboardingStore = OnboardingState & OnboardingActions

const initialState: OnboardingState = {
  hasCompletedOnboarding: false,
  currentStep: 'welcome',
  skippedSteps: []
}

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCurrentStep: (step) => set({ currentStep: step }, false, 'setCurrentStep'),

        skipStep: (step) =>
          set(
            (state) => ({
              skippedSteps: [...state.skippedSteps, step]
            }),
            false,
            'skipStep'
          ),

        completeOnboarding: () =>
          set(
            {
              hasCompletedOnboarding: true,
              currentStep: 'complete'
            },
            false,
            'completeOnboarding'
          ),

        resetOnboarding: () => set(initialState, false, 'resetOnboarding')
      }),
      {
        name: 'onboarding-storage',
        partialize: (state) => ({
          hasCompletedOnboarding: state.hasCompletedOnboarding
        })
      }
    ),
    { name: 'OnboardingStore' }
  )
)

// Selectors
export const useHasCompletedOnboarding = () =>
  useOnboardingStore((state) => state.hasCompletedOnboarding)
export const useCurrentOnboardingStep = () => useOnboardingStore((state) => state.currentStep)
export const useSkippedSteps = () => useOnboardingStore((state) => state.skippedSteps)
