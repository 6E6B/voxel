import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react'
import { Canvas, useThree, useFrame, invalidate } from '@react-three/fiber'
import { OrbitControls, BakeShadows, AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { load3DObjectFromUrl, dispose3DObject, ObjectType } from './avatar3DUtils'
import {
  useAvatar3DManifest,
  useAsset3DManifest
} from '@renderer/features/avatar/hooks/useAvatar3DManifest'

interface Model3DViewerProps {
  /** User ID for avatar loading */
  userId?: string
  /** Asset ID for asset loading */
  assetId?: number | null
  /** Direct manifest URL (bypasses userId/assetId lookup) */
  manifestUrl?: string
  /** Explicit object type */
  type?: ObjectType
  /** Auth cookie for API requests */
  cookie?: string
  /** Additional CSS classes */
  className?: string
  /** Auto-rotation speed (0 to disable) */
  autoRotateSpeed?: number
  /** Camera distance multiplier */
  cameraDistanceFactor?: number
  /** Enable manual rotation via drag */
  enableRotate?: boolean
  /** Enable manual zoom via scroll */
  enableZoom?: boolean
  /** Enable manual panning via drag */
  enablePan?: boolean
  /** Zoom distance limits */
  zoomLimits?: { min: number; max: number }
  /** Field of view */
  fov?: number
  /** Callbacks */
  onLoad?: () => void
  onError?: (error: string) => void
  onLoadStart?: () => void
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}

// Legacy props interface for backward compatibility
interface Avatar3DThumbnailProps {
  userId?: string
  assetId?: number | null
  manifestUrl?: string
  type?: ObjectType
  cookie?: string
  className?: string
  autoRotateSpeed?: number
  cameraDistanceFactor?: number
  manualRotationEnabled?: boolean
  manualRotationSensitivity?: number
  manualZoomEnabled?: boolean
  manualPanEnabled?: boolean
  manualZoomLimits?: { min: number; max: number }
  manualZoomSpeed?: number
  verticalOffset?: number
  onError?: (error: string) => void
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}

interface Object3DLoaderProps {
  manifestUrl: string
  objectName: string
  cameraDistanceFactor: number
  objectType: ObjectType
  onLoad: () => void
  onError: (error: string) => void
}

interface SceneControlsProps {
  autoRotate: boolean
  autoRotateSpeed: number
  enableRotate: boolean
  enableZoom: boolean
  enablePan: boolean
  minDistance: number
  maxDistance: number
}

// Animated rig that smoothly transitions the model into view
interface AnimatedRigProps {
  children: React.ReactNode
  isLoaded: boolean
  objectType: ObjectType
}

const AnimatedRig: React.FC<AnimatedRigProps> = ({ children, isLoaded, objectType }) => {
  const outerRef = useRef<THREE.Group>(null!)
  const innerRef = useRef<THREE.Group>(null!)
  const targetY = objectType === 'avatar' ? -1.2 : 0
  const startY = -8 // Start below the view
  const animationCompleteRef = useRef(false)

  // Reset animation state when isLoaded changes to false (new model loading)
  useEffect(() => {
    if (!isLoaded) {
      animationCompleteRef.current = false
    }
  }, [isLoaded])

  useFrame(() => {
    if (!outerRef.current || animationCompleteRef.current) return

    // Smoothly lerp the outer group's Y position to target when loaded
    const target = isLoaded ? targetY : startY
    const currentY = outerRef.current.position.y
    const targetScale = isLoaded ? 1 : 0.9
    const currentScale = outerRef.current.scale.x

    // Check if animation is essentially complete (within threshold)
    const yDiff = Math.abs(currentY - target)
    const scaleDiff = Math.abs(currentScale - targetScale)

    if (yDiff < 0.001 && scaleDiff < 0.001 && isLoaded) {
      // Snap to final values and stop animating
      outerRef.current.position.y = target
      outerRef.current.scale.setScalar(targetScale)
      animationCompleteRef.current = true
      // Final render with snapped values
      invalidate()
      return
    }

    outerRef.current.position.y = THREE.MathUtils.lerp(currentY, target, 0.08)
    outerRef.current.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, 0.08))

    // Request next frame for demand mode
    invalidate()
  })

  return (
    <group ref={outerRef} position={[0, startY, 0]} scale={0.9}>
      <group ref={innerRef}>{children}</group>
    </group>
  )
}

// Component that loads and displays the 3D object inside R3F Canvas
const Object3DLoader: React.FC<Object3DLoaderProps> = ({
  manifestUrl,
  objectName,
  cameraDistanceFactor,
  objectType,
  onLoad,
  onError
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const objectRef = useRef<THREE.Object3D | null>(null)
  const { camera } = useThree()

  // Use refs for callbacks to avoid re-running effect when callbacks change
  const onLoadRef = useRef(onLoad)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onLoadRef.current = onLoad
    onErrorRef.current = onError
  })

  // Load the 3D object
  useEffect(() => {
    let cancelled = false

    const loadObject = async () => {
      try {
        const object = await load3DObjectFromUrl(manifestUrl, objectName)

        if (cancelled) {
          dispose3DObject(object)
          return
        }

        // Clear existing object
        if (objectRef.current && groupRef.current) {
          groupRef.current.remove(objectRef.current)
          dispose3DObject(objectRef.current)
        }

        if (groupRef.current) {
          // Center the object at the origin
          const box = new THREE.Box3().setFromObject(object)
          const center = new THREE.Vector3()
          box.getCenter(center)
          object.position.sub(center)

          groupRef.current.add(object)
          objectRef.current = object

          // Fit camera to object (recalculate box after centering)
          const centeredBox = new THREE.Box3().setFromObject(object)
          const size = new THREE.Vector3()
          centeredBox.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * cameraDistanceFactor
          const minZ = objectType === 'asset' ? 1 : 5
          const maxZ = objectType === 'asset' ? 12 : 24
          cameraZ = Math.max(minZ, Math.min(cameraZ, maxZ))
          camera.position.set(0, 0, cameraZ)
          camera.lookAt(0, 0, 0)
        }

        onLoadRef.current()
      } catch (err: any) {
        if (!cancelled) {
          if (err?.message !== 'No imageUrl found in avatar thumbnail data.') {
            console.error(`Failed to load 3D thumbnail`, err)
          }
          onErrorRef.current(err?.message || 'Failed to load 3D object')
        }
      }
    }

    loadObject()

    return () => {
      cancelled = true
      if (objectRef.current && groupRef.current) {
        groupRef.current.remove(objectRef.current)
        dispose3DObject(objectRef.current)
        objectRef.current = null
      }
    }
  }, [manifestUrl, objectName, cameraDistanceFactor, objectType, camera])

  return <group ref={groupRef} />
}

// Scene controls using drei's OrbitControls with invalidate for on-demand rendering
const SceneControls: React.FC<SceneControlsProps> = ({
  autoRotate,
  autoRotateSpeed,
  enableRotate,
  enableZoom,
  enablePan,
  minDistance,
  maxDistance
}) => {
  return (
    <OrbitControls
      autoRotate={autoRotate}
      autoRotateSpeed={autoRotateSpeed}
      enableRotate={enableRotate}
      enableZoom={enableZoom}
      enablePan={enablePan}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
      dampingFactor={0.05}
      enableDamping
      // Trigger re-render on control changes for demand frameloop
      onChange={() => invalidate()}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: enablePan ? THREE.MOUSE.PAN : (undefined as unknown as THREE.MOUSE)
      }}
    />
  )
}

// Component to handle WebGL context cleanup on unmount
const ContextCleanup: React.FC = () => {
  const { gl, scene } = useThree()

  useEffect(() => {
    return () => {
      // Dispose all objects in the scene
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => {
              if (mat.map) mat.map.dispose()
              mat.dispose()
            })
          } else if (object.material) {
            if (object.material.map) object.material.map.dispose()
            object.material.dispose()
          }
        }
      })
      // Dispose the renderer
      gl.dispose()
    }
  }, [gl, scene])

  return null
}

// Scene lighting component
const SceneLighting: React.FC<{ objectType: ObjectType }> = ({ objectType }) => {
  return (
    <>
      <hemisphereLight args={[0xffffff, 0x080820, objectType === 'asset' ? 1.2 : 1.1]} />
      <directionalLight
        position={[6, 16, 10]}
        intensity={objectType === 'asset' ? 1.6 : 1.5}
        castShadow
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-6, 4, -12]} intensity={objectType === 'asset' ? 0.7 : 0.6} />
      {objectType === 'asset' && <directionalLight position={[-4, -2, 6]} intensity={0.4} />}
    </>
  )
}

/**
 * Universal 3D Model Viewer Component
 * Supports loading avatars and assets with smooth animations and orbit controls
 */
export const Model3DViewer: React.FC<Model3DViewerProps> = ({
  userId,
  assetId,
  manifestUrl,
  type: explicitType,
  cookie,
  className = '',
  autoRotateSpeed = 0.4,
  cameraDistanceFactor,
  enableRotate = true,
  enableZoom = true,
  enablePan = false,
  zoomLimits,
  fov: customFov,
  onLoad,
  onError,
  onLoadStart,
  onMouseEnter,
  onMouseLeave
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)

  // Determine the type and ID based on props
  const objectType: ObjectType = explicitType || (userId ? 'avatar' : 'asset')
  const objectId = userId || assetId

  // Use TanStack Query for manifest fetching
  const { data: avatarManifestUrl, error: avatarError } = useAvatar3DManifest(
    !manifestUrl && objectType === 'avatar' && userId ? userId : undefined,
    cookie
  )
  const { data: assetManifestUrl, error: assetError } = useAsset3DManifest(
    !manifestUrl && objectType === 'asset' && assetId ? assetId : undefined,
    cookie
  )

  // Determine the effective manifest URL from props or query
  const effectiveManifestUrl = manifestUrl || avatarManifestUrl || assetManifestUrl
  const manifestError = avatarError || assetError

  // Compute defaults based on type
  const effectiveZoomLimits =
    zoomLimits ?? (objectType === 'asset' ? { min: 1, max: 15 } : { min: 4, max: 26 })
  const effectiveCameraDistanceFactor = cameraDistanceFactor ?? (objectType === 'asset' ? 2.2 : 1.8)

  // Use refs for callbacks to prevent unnecessary re-renders
  const onLoadRef = useRef(onLoad)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onLoadRef.current = onLoad
    onErrorRef.current = onError
  })

  // Handle manifest errors
  useEffect(() => {
    if (manifestError) {
      const errorMessage = (manifestError as Error)?.message || 'Failed to load 3D manifest'
      setError(errorMessage)
      onErrorRef.current?.(errorMessage)
    }
  }, [manifestError])

  // Camera settings
  const fov = customFov ?? (objectType === 'asset' ? 40 : 45)
  const initialCameraZ = objectType === 'asset' ? 5 : 12

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setError(null)
    onLoadRef.current?.()
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
    onErrorRef.current?.(errorMessage)
  }, [])

  // Use ref for onLoadStart to avoid effect dependency issues
  const onLoadStartRef = useRef(onLoadStart)
  useEffect(() => {
    onLoadStartRef.current = onLoadStart
  })

  // Start loading when manifest URL is available
  useEffect(() => {
    if (effectiveManifestUrl) {
      setIsLoading(true)
      setError(null)
      onLoadStartRef.current?.()
    }
  }, [effectiveManifestUrl])

  const combinedClassName = `relative w-full h-full ${className}`.trim()

  // Use demand frameloop - drei's OrbitControls.onChange and AnimatedRig call invalidate() when needed
  // Auto-rotate needs continuous rendering
  const isAutoRotating = autoRotateSpeed > 0 && !enableRotate

  if (!effectiveManifestUrl) {
    return <div className={combinedClassName} />
  }

  return (
    <div
      className={combinedClassName}
      style={{
        cursor: enableRotate ? 'grab' : undefined
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={enablePan ? (e) => e.preventDefault() : undefined}
    >
      <Canvas
        key={effectiveManifestUrl}
        frameloop={isAutoRotating ? 'always' : 'demand'}
        camera={{
          fov,
          near: 0.1,
          far: 1000,
          position: [0, 0, initialCameraZ]
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        // Enable performance monitoring for AdaptiveDpr
        performance={{ min: 0.5 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.NoToneMapping
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      >
        <ContextCleanup />
        {/* Freeze shadow maps for performance - shadows are static anyway */}
        <BakeShadows />
        {/* Reduce pixel ratio during interaction for smoother performance */}
        <AdaptiveDpr pixelated />
        <SceneLighting objectType={objectType} />
        <SceneControls
          autoRotate={autoRotateSpeed > 0 && !enableRotate}
          autoRotateSpeed={autoRotateSpeed}
          enableRotate={enableRotate}
          enableZoom={enableZoom}
          enablePan={enablePan}
          minDistance={effectiveZoomLimits.min}
          maxDistance={effectiveZoomLimits.max}
        />
        <Suspense fallback={null}>
          <AnimatedRig isLoaded={!isLoading} objectType={objectType}>
            <Object3DLoader
              manifestUrl={effectiveManifestUrl}
              objectName={objectId ? `${objectType}_${objectId}` : 'render_preview'}
              cameraDistanceFactor={effectiveCameraDistanceFactor}
              objectType={objectType}
              onLoad={handleLoad}
              onError={handleError}
            />
          </AnimatedRig>
        </Suspense>
      </Canvas>
    </div>
  )
}

/**
 * @deprecated Use Model3DViewer instead
 * Legacy wrapper for backward compatibility
 */
const Avatar3DThumbnail: React.FC<Avatar3DThumbnailProps> = ({
  userId,
  assetId,
  manifestUrl,
  type,
  cookie,
  className,
  autoRotateSpeed = 0.004,
  manualRotationEnabled = false,
  manualZoomEnabled = false,
  manualPanEnabled = false,
  manualZoomLimits,
  cameraDistanceFactor,
  onError,
  onMouseEnter,
  onMouseLeave
}) => {
  return (
    <Model3DViewer
      userId={userId}
      assetId={assetId}
      manifestUrl={manifestUrl}
      type={type}
      cookie={cookie}
      className={className}
      autoRotateSpeed={manualRotationEnabled ? 0 : autoRotateSpeed * 100}
      enableRotate={manualRotationEnabled}
      enableZoom={manualZoomEnabled}
      enablePan={manualPanEnabled}
      zoomLimits={manualZoomLimits}
      cameraDistanceFactor={cameraDistanceFactor}
      onError={onError}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  )
}

export default Avatar3DThumbnail
