import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  RBXRenderer,
  FLAGS,
  API,
  Authentication,
  CFrame,
  Outfit,
  OutfitRenderer
} from 'roavatar-renderer'

interface RoAvatarViewerProps {
  userId?: string
  cookie?: string
  outfit?: Outfit | null
  currentAvatarType?: 'R6' | 'R15'
  cameraYawDeg?: number
  className?: string
  autoRotateSpeed?: number
  enableRotate?: boolean
  enableZoom?: boolean
  enablePan?: boolean
  resetSignal?: number
  refreshSignal?: number
  onLoadStart?: () => void
  onLoad?: () => void
  onError?: (error: string) => void
  renderPriority?: number
}

let rendererReady = false
let rendererSetupPromise: Promise<boolean> | null = null
let viewerRegistrationOrder = 0
let activeViewerId: string | null = null
let sharedOutfitRenderer: OutfitRenderer | null = null
let sharedLoadRequestId = 0
let rendererInstanceFilterInstalled = false
const baseHumanoidRootPartCFrames = new Map<string, CFrame>()

type ViewerRegistration = {
  id: string
  priority: number
  order: number
  activate: () => void
}

const viewerRegistrations = new Map<string, ViewerRegistration>()

function isDescendantOfOrEqual(instance: any, ancestor: any): boolean {
  let current = instance
  while (current) {
    if (current === ancestor) return true
    current = current.parent
  }
  return false
}

function installRendererInstanceFilter(): void {
  if (rendererInstanceFilterInstalled) return

  const mutableRenderer = RBXRenderer as typeof RBXRenderer & {
    addInstance: (instance: any, auth: any) => void
  }
  const originalAddInstance = mutableRenderer.addInstance.bind(RBXRenderer)

  mutableRenderer.addInstance = (instance: any, auth: any) => {
    const activeRig = sharedOutfitRenderer?.currentRig

    // Ignore late async addInstance calls from stale renderers. Without this,
    // an old preview can finish after a newer one and inject a blank/ghost rig
    // into the shared Three.js scene. We check that the instance is the active
    // rig or a descendant of it (traversing up the parent chain).
    if (!activeRig || !isDescendantOfOrEqual(instance, activeRig)) {
      return
    }

    originalAddInstance(instance, auth)
  }

  rendererInstanceFilterInstalled = true
}

function destroySharedOutfitRenderer(): void {
  const renderer = sharedOutfitRenderer
  if (!renderer) return

  baseHumanoidRootPartCFrames.clear()

  renderer.stopAnimating()

  if (renderer.currentRig) {
    renderer.currentRig.Destroy()
    renderer.currentRig = undefined
  }

  sharedOutfitRenderer = null
}

function activateHighestPriorityViewer(): void {
  let nextViewer: ViewerRegistration | null = null

  for (const viewer of viewerRegistrations.values()) {
    if (
      !nextViewer ||
      viewer.priority > nextViewer.priority ||
      (viewer.priority === nextViewer.priority && viewer.order > nextViewer.order)
    ) {
      nextViewer = viewer
    }
  }

  activeViewerId = nextViewer?.id ?? null
  if (!nextViewer) {
    destroySharedOutfitRenderer()
    return
  }

  nextViewer?.activate()
}

function installChromeShim(): void {
  if (typeof globalThis.chrome === 'undefined') {
    ; (globalThis as any).chrome = {
      runtime: {
        getManifest: () => ({ version: '1.0.0' }),
        getURL: (path: string) => path,
        sendMessage: () => Promise.resolve()
      },
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve()
        }
      }
    }
  }
}

async function ensureRendererSetup(): Promise<boolean> {
  if (rendererReady) return true
  if (rendererSetupPromise) return rendererSetupPromise

  rendererSetupPromise = (async () => {
    installChromeShim()
    installRendererInstanceFilter()

    FLAGS.ASSETS_PATH = `roavatar-assets://local/rbxasset/`
    FLAGS.USE_POST_PROCESSING = false
    FLAGS.ANIMATE_SKELETON = true
    FLAGS.UPDATE_SKELETON = true

    const success = await RBXRenderer.fullSetup(true, true)
    if (success) {
      RBXRenderer.setBackgroundTransparent(true)
      rendererReady = true
    }
    return success
  })()

  return rendererSetupPromise
}

export const RoAvatarViewer: React.FC<RoAvatarViewerProps> = ({
  userId,
  cookie,
  outfit,
  currentAvatarType,
  cameraYawDeg = 0,
  className = '',
  resetSignal = 0,
  refreshSignal = 0,
  onLoadStart,
  onLoad,
  onError,
  renderPriority = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cameraAdjustmentTimersRef = useRef<number[]>([])
  const mountedRef = useRef(true)
  const viewerIdRef = useRef(`roavatar-viewer-${Math.random().toString(36).slice(2)}`)
  const latestUserIdRef = useRef(userId)
  const latestOutfitRef = useRef<Outfit | null | undefined>(outfit)
  const latestOnLoadStartRef = useRef(onLoadStart)
  const latestOnLoadRef = useRef(onLoad)
  const latestOnErrorRef = useRef(onError)
  const [isSetup, setIsSetup] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [cookieReady, setCookieReady] = useState(false)

  useEffect(() => {
    latestUserIdRef.current = userId
    latestOutfitRef.current = outfit
    latestOnLoadStartRef.current = onLoadStart
    latestOnLoadRef.current = onLoad
    latestOnErrorRef.current = onError
  }, [onError, onLoad, onLoadStart, outfit, userId])

  useEffect(() => {
    if (!cookie) return

    setCookieReady(false)
    window.api.setSessionCookie(cookie).then(() => {
      setCookieReady(true)
    }).catch((err) => {
      console.error('[RoAvatarViewer] Failed to set session cookie:', err)
      setCookieReady(true)
    })
  }, [cookie])

  const applyCameraYaw = useCallback(() => {
    if (activeViewerId !== viewerIdRef.current) return

    const rig = sharedOutfitRenderer?.currentRig
    if (!rig) return

    const humanoidRootPart = rig.FindFirstChild('HumanoidRootPart')
    if (!humanoidRootPart || !humanoidRootPart.HasProperty('CFrame')) return

    const rootPartKey = humanoidRootPart.id
    const baseCFrame =
      baseHumanoidRootPartCFrames.get(rootPartKey) ??
      ((humanoidRootPart.Prop('CFrame') as CFrame).clone() as CFrame)

    if (!baseHumanoidRootPartCFrames.has(rootPartKey)) {
      baseHumanoidRootPartCFrames.set(rootPartKey, baseCFrame)
    }

    const rotatedCFrame = baseCFrame.clone()
    rotatedCFrame.Orientation = [
      baseCFrame.Orientation[0],
      baseCFrame.Orientation[1] + cameraYawDeg,
      baseCFrame.Orientation[2]
    ]

    humanoidRootPart.setProperty('CFrame', rotatedCFrame)
    sharedOutfitRenderer?.centerCamera()
  }, [cameraYawDeg])

  const clearCameraAdjustmentTimers = useCallback(() => {
    for (const timerId of cameraAdjustmentTimersRef.current) {
      window.clearTimeout(timerId)
    }
    cameraAdjustmentTimersRef.current = []
  }, [])

  const scheduleCameraAlignment = useCallback(() => {
    if (activeViewerId !== viewerIdRef.current) return

    clearCameraAdjustmentTimers()

    const alignCamera = () => {
      if (activeViewerId !== viewerIdRef.current) return
      applyCameraYaw()
    }

    alignCamera()
    cameraAdjustmentTimersRef.current.push(window.setTimeout(alignCamera, 50))
    cameraAdjustmentTimersRef.current.push(window.setTimeout(alignCamera, 150))
  }, [applyCameraYaw, clearCameraAdjustmentTimers])

  const attachRendererElement = useCallback(() => {
    if (!containerRef.current) return false

    const el = RBXRenderer.getRendererElement()
    if (!el) return false

    el.style.width = '100%'
    el.style.height = '100%'
    el.style.position = 'absolute'
    el.style.inset = '0'

    const canvas = el.querySelector('canvas')
    if (canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }

    if (el.parentElement !== containerRef.current) {
      containerRef.current.appendChild(el)
    }

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      RBXRenderer.setRendererSize(Math.floor(rect.width), Math.floor(rect.height))
    }

    return true
  }, [])

  const loadRequestedOutfit = useCallback(async () => {
    if (!mountedRef.current || !isSetup || !cookieReady) return
    if (activeViewerId !== viewerIdRef.current) return

    const requestId = ++sharedLoadRequestId

    const previewOutfit = latestOutfitRef.current
    const activeUserId = latestUserIdRef.current

    if (!previewOutfit && !activeUserId) return

    latestOnLoadStartRef.current?.()

    try {
      let nextOutfit: Outfit

      if (previewOutfit) {
        nextOutfit = previewOutfit.clone()
      } else {
        const userIdNum = parseInt(activeUserId!, 10)
        if (isNaN(userIdNum)) {
          throw new Error('Invalid userId')
        }

        const result = await API.Avatar.GetAvatarDetails(userIdNum)
        if (!(result instanceof Outfit)) {
          throw new Error('Failed to get avatar outfit details')
        }

        nextOutfit = result
      }

      if (
        !mountedRef.current ||
        activeViewerId !== viewerIdRef.current ||
        requestId !== sharedLoadRequestId
      ) {
        return
      }

      destroySharedOutfitRenderer()

      const auth = new Authentication()
      const rigPath = `rbxasset://../`
      const renderer = new OutfitRenderer(auth, nextOutfit, rigPath)
      sharedOutfitRenderer = renderer

      renderer.startAnimating()
      renderer.setMainAnimation('idle')

      scheduleCameraAlignment()
      latestOnLoadRef.current?.()
    } catch (err: any) {
      if (!mountedRef.current || activeViewerId !== viewerIdRef.current) return
      console.error('[RoAvatarViewer] Failed to load avatar:', err)
      latestOnErrorRef.current?.(err?.message || 'Failed to load avatar')
    }
  }, [cookieReady, isSetup, scheduleCameraAlignment])

  const activateViewer = useCallback(() => {
    if (!attachRendererElement()) return
    void loadRequestedOutfit()
  }, [attachRendererElement, loadRequestedOutfit])

  // Recover from unhandled "missing magic" rejections inside roavatar-renderer.
  // The library's internal promise chains lack .catch(), so when an asset returns
  // invalid data, OutfitRenderer gets permanently stuck with currentlyUpdating=true.
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message ?? String(e.reason ?? '')
      if (msg.includes('missing magic')) {
        e.preventDefault()
        if (sharedOutfitRenderer) {
          sharedOutfitRenderer.currentlyUpdating = false
          sharedOutfitRenderer.currentlyChangingRig = false
          sharedOutfitRenderer.hasNewUpdate = false
        }
      }
    }
    window.addEventListener('unhandledrejection', handleRejection)
    return () => window.removeEventListener('unhandledrejection', handleRejection)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const init = async () => {
      try {
        const success = await ensureRendererSetup()
        if (!mountedRef.current) return

        if (!success) {
          const msg = 'Failed to initialize RoAvatar renderer'
          setSetupError(msg)
          onError?.(msg)
          return
        }

        setIsSetup(true)
        activateHighestPriorityViewer()
      } catch (err: any) {
        if (!mountedRef.current) return
        const msg = err?.message || 'Failed to setup RoAvatar renderer'
        setSetupError(msg)
        onError?.(msg)
      }
    }

    init()

    return () => {
      mountedRef.current = false
      clearCameraAdjustmentTimers()
      const el = RBXRenderer.getRendererElement()
      if (el && containerRef.current?.contains(el)) {
        containerRef.current.removeChild(el)
      }
    }
  }, [clearCameraAdjustmentTimers, onError])

  useEffect(() => {
    const id = viewerIdRef.current
    viewerRegistrations.set(id, {
      id,
      priority: renderPriority,
      order: ++viewerRegistrationOrder,
      activate: activateViewer
    })

    activateHighestPriorityViewer()

    return () => {
      viewerRegistrations.delete(id)
      if (activeViewerId === id) {
        activeViewerId = null
      }
      activateHighestPriorityViewer()
    }
  }, [activateViewer, renderPriority])

  useEffect(() => {
    if (!isSetup || !containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      if (activeViewerId !== viewerIdRef.current) return

      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          RBXRenderer.setRendererSize(Math.floor(width), Math.floor(height))
        }
      }
    })

    observer.observe(containerRef.current)
    if (activeViewerId === viewerIdRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        RBXRenderer.setRendererSize(Math.floor(rect.width), Math.floor(rect.height))
      }
    }

    return () => observer.disconnect()
  }, [isSetup])

  useEffect(() => {
    if (!isSetup || !cookieReady || activeViewerId !== viewerIdRef.current) return
    activateViewer()
  }, [activateViewer, cookieReady, currentAvatarType, isSetup, outfit, refreshSignal, userId])

  useEffect(() => {
    if (!isSetup || !cookieReady || activeViewerId !== viewerIdRef.current) return
    scheduleCameraAlignment()
  }, [cookieReady, isSetup, scheduleCameraAlignment])

  useEffect(() => {
    if (!isSetup || resetSignal === 0 || activeViewerId !== viewerIdRef.current) return
    scheduleCameraAlignment()
  }, [resetSignal, isSetup, scheduleCameraAlignment])

  const combinedClassName = `relative w-full h-full ${className}`.trim()

  return (
    <div
      ref={containerRef}
      className={combinedClassName}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {setupError && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
          {setupError}
        </div>
      )}
    </div>
  )
}

export default RoAvatarViewer
