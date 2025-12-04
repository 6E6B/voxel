import React, { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { load3DObjectFromUrl, dispose3DObject, ObjectType } from './avatar3DUtils'
import {
  useAvatar3DManifest,
  useAsset3DManifest
} from '@renderer/features/avatar/hooks/useAvatar3DManifest'
import { LoadingSpinnerInline } from '../UI/feedback/LoadingSpinner'

interface Avatar3DCanvasProps {
  userId?: string
  assetId?: number | null
  assetTypeId?: number | null
  manifestUrl?: string
  type?: ObjectType
  cookie?: string
  className?: string
  autoRotateSpeed?: number
  cameraDistanceFactor?: number
  manualRotationEnabled?: boolean
  manualRotationSensitivity?: number
  manualZoomEnabled?: boolean
  manualZoomLimits?: { min: number; max: number }
  manualZoomSpeed?: number
  verticalOffset?: number
  onError?: (error: string) => void
}

interface Object3DLoaderProps {
  manifestUrl: string
  objectName: string
  verticalOffset: number
  autoRotateSpeed: number
  manualRotationEnabled: boolean
  manualRotationSensitivity: number
  manualZoomEnabled: boolean
  manualZoomLimits: { min: number; max: number }
  manualZoomSpeed: number
  cameraDistanceFactor: number
  objectType: ObjectType
  onLoad: () => void
  onError: (error: string) => void
}

// Component that loads and displays the 3D object
const Object3DLoader: React.FC<Object3DLoaderProps> = ({
  manifestUrl,
  objectName,
  verticalOffset,
  autoRotateSpeed,
  manualRotationEnabled,
  manualRotationSensitivity,
  manualZoomEnabled,
  manualZoomLimits,
  manualZoomSpeed,
  cameraDistanceFactor,
  objectType,
  onLoad,
  onError
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const objectRef = useRef<THREE.Object3D | null>(null)
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const baseCameraZRef = useRef(18)
  const zoomOffsetRef = useRef(0)
  const { camera, gl } = useThree()

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

        // Apply vertical offset
        if (verticalOffset !== 0) {
          object.position.y += verticalOffset
        }

        // Clear existing object
        if (objectRef.current && groupRef.current) {
          groupRef.current.remove(objectRef.current)
          dispose3DObject(objectRef.current)
        }

        if (groupRef.current) {
          groupRef.current.add(object)
          objectRef.current = object

          // Fit camera to object
          const box = new THREE.Box3().setFromObject(object)
          const size = new THREE.Vector3()
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * cameraDistanceFactor
          const minZ = objectType === 'asset' ? 1 : 5
          const maxZ = objectType === 'asset' ? 12 : 24
          cameraZ = Math.max(minZ, Math.min(cameraZ, maxZ))
          baseCameraZRef.current = cameraZ
          zoomOffsetRef.current = 0
          camera.position.set(0, 0, cameraZ)
          camera.lookAt(0, 0, 0)
        }

        onLoad()
      } catch (err: any) {
        if (!cancelled) {
          if (err?.message !== 'No imageUrl found in avatar thumbnail data.') {
            console.error(`Failed to load 3D thumbnail`, err)
          }
          onError(err?.message || 'Failed to load 3D object')
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
  }, [
    manifestUrl,
    objectName,
    verticalOffset,
    cameraDistanceFactor,
    objectType,
    camera,
    onLoad,
    onError
  ])

  // Auto-rotation animation
  useFrame(() => {
    if (objectRef.current && !isDraggingRef.current) {
      objectRef.current.rotation.y += autoRotateSpeed
    }
  })

  // Manual rotation and zoom handlers
  useEffect(() => {
    const canvas = gl.domElement

    const handlePointerDown = (event: PointerEvent) => {
      if (!manualRotationEnabled || !objectRef.current) return
      isDraggingRef.current = true
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current || !objectRef.current) return
      const deltaX = event.clientX - lastPointerRef.current.x
      const deltaY = event.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: event.clientX, y: event.clientY }

      objectRef.current.rotation.y += deltaX * manualRotationSensitivity
      const newRotationX = objectRef.current.rotation.x + deltaY * manualRotationSensitivity
      objectRef.current.rotation.x = THREE.MathUtils.clamp(newRotationX, -Math.PI / 2, Math.PI / 2)
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId)
        }
      }
    }

    const handleWheel = (event: WheelEvent) => {
      if (!manualRotationEnabled || !manualZoomEnabled) return
      event.preventDefault()
      zoomOffsetRef.current += event.deltaY * manualZoomSpeed
      const target = THREE.MathUtils.clamp(
        baseCameraZRef.current + zoomOffsetRef.current,
        manualZoomLimits.min,
        manualZoomLimits.max
      )
      camera.position.set(0, 0, target)
      camera.lookAt(0, 0, 0)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [
    gl,
    camera,
    manualRotationEnabled,
    manualRotationSensitivity,
    manualZoomEnabled,
    manualZoomLimits,
    manualZoomSpeed
  ])

  return <group ref={groupRef} />
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

const Avatar3DCanvas: React.FC<Avatar3DCanvasProps> = ({
  userId,
  assetId,
  assetTypeId,
  manifestUrl,
  type: explicitType,
  cookie,
  className = '',
  autoRotateSpeed = 0.004,
  cameraDistanceFactor = 1.8,
  manualRotationEnabled = false,
  manualRotationSensitivity = 0.008,
  manualZoomEnabled = false,
  manualZoomLimits = { min: 1, max: 26 },
  manualZoomSpeed = 0.02,
  verticalOffset,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine the type and ID based on props
  const objectType: ObjectType | null =
    explicitType || (manifestUrl ? 'avatar' : userId ? 'avatar' : assetId ? 'asset' : null)
  const objectId = userId || assetId

  // Use TanStack Query for manifest fetching
  const {
    data: avatarManifestUrl,
    error: avatarError,
    isLoading: avatarLoading
  } = useAvatar3DManifest(!manifestUrl && objectType === 'avatar' ? userId : undefined, cookie)
  const {
    data: assetManifestUrl,
    error: assetError,
    isLoading: assetLoading
  } = useAsset3DManifest(!manifestUrl && objectType === 'asset' ? assetId : undefined, cookie, {
    assetTypeId
  })

  // Determine the effective manifest URL from props or query
  const effectiveManifestUrl = manifestUrl || avatarManifestUrl || assetManifestUrl
  const manifestError = avatarError || assetError
  const manifestLoading = avatarLoading || assetLoading

  // Compute defaults based on type
  const effectiveVerticalOffset = verticalOffset ?? (objectType === 'avatar' ? -1.2 : 0)
  const effectiveZoomLimits =
    manualZoomLimits ?? (objectType === 'asset' ? { min: 1, max: 15 } : { min: 7, max: 26 })
  const effectiveCameraDistanceFactor = cameraDistanceFactor ?? (objectType === 'asset' ? 2.2 : 1.8)

  // Handle manifest errors
  useEffect(() => {
    if (manifestError) {
      const errorMessage = (manifestError as Error)?.message || 'Failed to load 3D manifest'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [manifestError, onError])

  // Camera settings
  const fov = objectType === 'asset' ? 40 : 32
  const initialCameraZ = objectType === 'asset' ? 5 : 18

  const handleLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
    onError?.(errorMessage)
  }

  // Start loading when manifest URL is available
  useEffect(() => {
    if (effectiveManifestUrl) {
      setIsLoading(true)
      setError(null)
    }
  }, [effectiveManifestUrl])

  const combinedClassName = `relative w-full h-full ${className}`.trim()
  const emptyMessage = objectType === 'asset' ? 'No Asset' : 'No Avatar'
  const showLoading = isLoading || manifestLoading
  const showError = error && !showLoading

  return (
    <div
      className={combinedClassName}
      style={{
        cursor: manualRotationEnabled ? 'grab' : undefined
      }}
    >
      {effectiveManifestUrl && objectType && (
        <Canvas
          key={effectiveManifestUrl}
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
          <SceneLighting objectType={objectType} />
          <Suspense fallback={null}>
            <Object3DLoader
              manifestUrl={effectiveManifestUrl}
              objectName={objectId ? `${objectType}_${objectId}` : 'render_preview'}
              verticalOffset={effectiveVerticalOffset}
              autoRotateSpeed={autoRotateSpeed}
              manualRotationEnabled={manualRotationEnabled}
              manualRotationSensitivity={manualRotationSensitivity}
              manualZoomEnabled={manualZoomEnabled}
              manualZoomLimits={effectiveZoomLimits}
              manualZoomSpeed={manualZoomSpeed}
              cameraDistanceFactor={effectiveCameraDistanceFactor}
              objectType={objectType}
              onLoad={handleLoad}
              onError={handleError}
            />
          </Suspense>
        </Canvas>
      )}
      {showLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <LoadingSpinnerInline size="md" variant="emerald" />
        </div>
      )}
      {showError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-4">
            <p className="text-neutral-500 text-xs">3D view unavailable</p>
          </div>
        </div>
      )}
      {!objectId && !manifestUrl && !showLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs tracking-wider uppercase text-neutral-600 pointer-events-none">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

export default Avatar3DCanvas
