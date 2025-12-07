import { useState } from 'react'
import { Account } from '@renderer/types'

interface UseTryOnResult {
  isTryingOn: boolean
  tryOnLoading: boolean
  tryOnImageUrl: string | null
  tryOnManifestUrl: string | null
  handleTryOn: () => Promise<void>
  handleRevertTryOn: () => void
}

export function useTryOn(currentAssetId: number | null, account: Account | null): UseTryOnResult {
  const [isTryingOn, setIsTryingOn] = useState(false)
  const [tryOnLoading, setTryOnLoading] = useState(false)
  const [tryOnImageUrl, setTryOnImageUrl] = useState<string | null>(null)
  const [tryOnManifestUrl, setTryOnManifestUrl] = useState<string | null>(null)

  const detectRenderType = (url: string, renderType?: '2d' | '3d') => {
    if (renderType === '3d') return '3d'
    const normalized = url.toLowerCase()
    if (
      normalized.endsWith('.json') ||
      normalized.includes('avatar-3d') ||
      normalized.includes('thumbnail-3d')
    ) {
      return '3d'
    }
    return '2d'
  }

  const handleTryOn = async () => {
    if (!account?.cookie || !currentAssetId || !account.userId) return

    const userId = parseInt(account.userId)
    if (isNaN(userId)) return

    setTryOnLoading(true)
    setTryOnImageUrl(null)
    setTryOnManifestUrl(null)
    try {
      // Use the render preview API to generate a preview without modifying the avatar
      const result = await (window as any).api.renderAvatarPreview(
        account.cookie,
        userId,
        currentAssetId
      )

      if (result.imageUrl) {
        const renderType = detectRenderType(result.imageUrl, result.renderType)
        if (renderType === '3d') {
          setTryOnManifestUrl(result.imageUrl)
          setTryOnImageUrl(null)
        } else {
          setTryOnImageUrl(result.imageUrl)
          setTryOnManifestUrl(null)
        }
        setIsTryingOn(true)
      }
    } catch (err) {
      console.error('Failed to generate try-on preview:', err)
    } finally {
      setTryOnLoading(false)
    }
  }

  const handleRevertTryOn = () => {
    // Simply clear the try-on state - no need to revert anything since we didn't modify the avatar
    setIsTryingOn(false)
    setTryOnImageUrl(null)
    setTryOnManifestUrl(null)
  }

  return {
    isTryingOn,
    tryOnLoading,
    tryOnImageUrl,
    tryOnManifestUrl,
    handleTryOn,
    handleRevertTryOn
  }
}
