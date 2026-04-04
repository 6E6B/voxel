import { useEffect, useState } from 'react'

interface UseTryOnResult {
  isTryingOn: boolean
  handleTryOn: () => Promise<void>
  handleRevertTryOn: () => void
}

export function useTryOn(currentAssetId: number | null): UseTryOnResult {
  const [isTryingOn, setIsTryingOn] = useState(false)

  useEffect(() => {
    setIsTryingOn(false)
  }, [currentAssetId])

  const handleTryOn = async () => {
    if (!currentAssetId) return
    setIsTryingOn(true)
  }

  const handleRevertTryOn = () => {
    setIsTryingOn(false)
  }

  return {
    isTryingOn,
    handleTryOn,
    handleRevertTryOn
  }
}
