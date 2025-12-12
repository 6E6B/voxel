import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { loadAvatarObject, disposeAvatarObject } from '@renderer/components/Avatar/avatar3DUtils'

interface UseAvatarSceneOptions {
  mountRef: React.RefObject<HTMLDivElement | null>
  userId?: string
  cookie?: string
}

export const useAvatarScene = ({ mountRef, userId, cookie }: UseAvatarSceneOptions) => {
  // Return mountRef so parent can use it
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const currentAvatarRef = useRef<THREE.Object3D | null>(null)
  const requestRef = useRef<number>(0)
  const isRenderingRef = useRef<boolean>(false)
  const [isRendering, setIsRendering] = useState(false)
  const [renderText, setRenderText] = useState('')

  const log = (msg: string) => {
    setRenderText(msg)
  }

  const clearCurrentAvatar = useCallback(() => {
    if (!sceneRef.current) return

    if (currentAvatarRef.current) {
      sceneRef.current.remove(currentAvatarRef.current)
      disposeAvatarObject(currentAvatarRef.current)
      currentAvatarRef.current = null
    }

    for (let i = sceneRef.current.children.length - 1; i >= 0; i--) {
      const child = sceneRef.current.children[i]
      if (child.name === 'current_avatar') {
        sceneRef.current.remove(child)
        disposeAvatarObject(child)
      }
    }
  }, [])

  const renderAvatar = useCallback(
    async (userId: string) => {
      if (!sceneRef.current || !rendererRef.current || isRenderingRef.current) return
      if (!cookie) {
        log('Error: Cookie is required to load avatar')
        return
      }

      isRenderingRef.current = true
      setIsRendering(true)
      clearCurrentAvatar()

      try {
        log(`Fetching avatar for User ID: ${userId}...`)
        log('Loading avatar mesh...')
        const object = await loadAvatarObject({ userId, cookie, objectName: 'current_avatar' })

        sceneRef.current.add(object)
        currentAvatarRef.current = object

        if (cameraRef.current) {
          const box = new THREE.Box3().setFromObject(object)
          const size = new THREE.Vector3()
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = cameraRef.current.fov * (Math.PI / 180)
          const aspect = cameraRef.current.aspect
          const zoomFactor = aspect > 1 ? 1.2 : 1.8
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * zoomFactor
          cameraZ = Math.max(4, Math.min(cameraZ, 26))

          cameraRef.current.position.set(0, 0, cameraZ)
          cameraRef.current.updateProjectionMatrix()

          if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0)
            controlsRef.current.update()
          }
        }

        log('Complete')
      } catch (e: any) {
        log(`Error: ${e.message}`)
        console.error(e)
      } finally {
        isRenderingRef.current = false
        setIsRendering(false)
      }
    },
    [clearCurrentAvatar, cookie]
  )

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
      controlsRef.current.target.set(0, 0, 0)
    }
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 12)
    }
    if (currentAvatarRef.current) {
      currentAvatarRef.current.rotation.set(0, Math.PI, 0)
    }
  }, [])

  // Setup Three.js scene
  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 12)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.setClearColor(0x000000, 0)

    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.backgroundColor = 'transparent'

    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(0, 0, 0)

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 1.1)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5)
    keyLight.position.set(6, 16, 10)
    keyLight.castShadow = true
    keyLight.shadow.bias = -0.0001
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6)
    rimLight.position.set(-6, 4, -12)
    scene.add(rimLight)

    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer
    controlsRef.current = controls

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight

      if (width > 0 && height > 0) {
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        renderer.domElement.style.width = '100%'
        renderer.domElement.style.height = '100%'
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (mountRef.current) {
      resizeObserver.observe(mountRef.current)
    }

    window.addEventListener('resize', handleResize)
    setTimeout(handleResize, 0)

    const mountEl = mountRef.current

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(requestRef.current)
      renderer.dispose()
      if (mountEl && renderer.domElement) {
        mountEl.removeChild(renderer.domElement)
      }
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      currentAvatarRef.current = null
    }
  }, [mountRef])

  // Render avatar when userId or cookie changes
  useEffect(() => {
    if (userId && cookie) {
      renderAvatar(userId)
    }
  }, [userId, cookie, renderAvatar])

  return {
    mountRef,
    isRendering,
    renderText,
    renderAvatar,
    resetCamera
  }
}
