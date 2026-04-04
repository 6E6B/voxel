import { useCallback } from 'react'
import { TabId } from '@renderer/shared/types'
import { useActiveTab, useSetActiveTab } from '../stores/useUIStore'

export const useTabTransition = () => {
  const activeTab = useActiveTab()
  const setActiveTab = useSetActiveTab()

  return useCallback(
    (nextTab: TabId) => {
      if (nextTab === activeTab) return
      setActiveTab(nextTab)
    },
    [activeTab, setActiveTab]
  )
}
