import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js'

// Sparkles textures
import sparklesMainDdsUrl from '@assets/textures/sparkles_main.dds?url'
import sparklesColorDdsUrl from '@assets/textures/sparkles_color.dds?url'
import commonAlphaDdsUrl from '@assets/textures/common_alpha.dds?url'

/**
 * Roblox Sparkles properties interface
 * Based on Roblox's Sparkles.cpp implementation
 */
export interface RobloxSparklesProps {
  /** Whether the sparkles effect is active */
  enabled?: boolean
  /** Sparkle color - default is Roblox purple (144, 25, 255)/255 */
  sparkleColor?: THREE.Color | string | number
  /** Time scale for animation speed - default 1, 0 = frozen */
  timeScale?: number
  /** Position offset from parent */
  position?: [number, number, number]
  /** Parent size for scaling the sparkles effect */
  parentSize?: [number, number, number]
}

// Default color from Sparkles.cpp: Color3(144, 25, 255)/255.0f (purple)
const DEFAULT_SPARKLE_COLOR = new THREE.Color(144 / 255, 25 / 255, 255 / 255)

// Primary emitter constants from Roblox implementation
const PRIMARY_EMISSION_RATE = 30
const PRIMARY_PARTICLE_LIFETIME = 1.3
const PRIMARY_SIZE = 45
const PRIMARY_SPEED = 5
const PRIMARY_DAMPENING = 0.2
const PRIMARY_SPIN_MIN = 40 / 57.3 // ~0.7 rad/s
const PRIMARY_SPIN_MAX = 100 / 57.3 // ~1.75 rad/s
const PRIMARY_ROTATION_RANGE = 90 / 57.3 // ~1.57 rad
const PRIMARY_GROWTH = 0.5
const PRIMARY_BLEND_RATIO = 0.6

// Secondary emitter constants
const SECONDARY_EMISSION_RATE = 5
const SECONDARY_PARTICLE_LIFETIME = 1.7
const SECONDARY_SIZE = 0.1
const SECONDARY_SPEED = 8
const SECONDARY_DAMPENING = 2
const SECONDARY_SPIN_MIN = -500 / 57.3 // ~-8.73 rad/s
const SECONDARY_SPIN_MAX = 500 / 57.3 // ~8.73 rad/s
const SECONDARY_GROWTH = 0.2

// Particle system configuration
const PRIMARY_PARTICLE_COUNT = 80 // 30 emission * 1.3 lifetime * 2 buffer
const SECONDARY_PARTICLE_COUNT = 30 // 5 emission * 1.7 lifetime * 3 buffer

// Emitter box size from Roblox
const EMITTER_BOX_SIZE = 0.2

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  rotation: number
  spin: number
  growth: number
}

/**
 * Creates a fallback sparkle particle texture if DDS loading fails
 */
const createFallbackSparkleTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas')
  const size = 64
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, size, size)

  const centerX = size / 2
  const centerY = size / 2

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.4)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  ctx.globalCompositeOperation = 'lighter'
  const crossGradient = ctx.createLinearGradient(0, centerY, size, centerY)
  crossGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  crossGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)')
  crossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)')
  crossGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)')
  crossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = crossGradient
  ctx.fillRect(0, centerY - 2, size, 4)

  const vertGradient = ctx.createLinearGradient(centerX, 0, centerX, size)
  vertGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  vertGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)')
  vertGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)')
  vertGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)')
  vertGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = vertGradient
  ctx.fillRect(centerX - 2, 0, 4, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Creates a fallback color gradient texture
 */
const createFallbackColorTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, 256, 0)
  gradient.addColorStop(0, '#FFFFFF')
  gradient.addColorStop(0.3, '#FFFFFF')
  gradient.addColorStop(0.6, '#AAAAAA')
  gradient.addColorStop(1.0, '#444444')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

/**
 * Creates a fallback alpha gradient texture
 */
const createFallbackAlphaTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 1
  const ctx = canvas.getContext('2d')!

  // Alpha fades from full to zero over lifetime (ColourFader alpha -1)
  const gradient = ctx.createLinearGradient(0, 0, 256, 0)
  gradient.addColorStop(0, '#FFFFFF')
  gradient.addColorStop(0.5, '#888888')
  gradient.addColorStop(1.0, '#000000')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

/**
 * Loads a DDS texture with fallback
 */
const loadDDSTexture = (
  url: string,
  name: string,
  fallbackFn: () => THREE.Texture
): Promise<THREE.Texture> => {
  return new Promise((resolve) => {
    const loader = new DDSLoader()
    console.log(`[RobloxSparkles] Loading ${name} from:`, url)

    loader.load(
      url,
      (texture) => {
        console.log(`[RobloxSparkles] Loaded ${name}`)
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        resolve(texture)
      },
      undefined,
      (error) => {
        console.warn(`[RobloxSparkles] Failed to load ${name}, using fallback:`, error)
        resolve(fallbackFn())
      }
    )
  })
}

/**
 * Parse color from various formats (THREE.Color, string, or packed integer)
 */
const parseSparkleColor = (color: THREE.Color | string | number): THREE.Color => {
  if (color instanceof THREE.Color) {
    return color
  }

  if (typeof color === 'number') {
    // Packed integer format (0xAARRGGBB or 0xRRGGBB)
    const r = ((color >> 16) & 0xff) / 255
    const g = ((color >> 8) & 0xff) / 255
    const b = (color & 0xff) / 255
    return new THREE.Color(r, g, b)
  }

  if (typeof color === 'string') {
    if (/^\d+$/.test(color)) {
      const intValue = parseInt(color, 10)
      const r = ((intValue >> 16) & 0xff) / 255
      const g = ((intValue >> 8) & 0xff) / 255
      const b = (intValue & 0xff) / 255
      return new THREE.Color(r, g, b)
    }
    // Otherwise treat as hex/named color
    return new THREE.Color(color)
  }

  return DEFAULT_SPARKLE_COLOR.clone()
}

/**
 * RobloxSparkles - A faithful recreation of Roblox's Sparkles particle effect
 * Based on the original Sparkles.cpp implementation
 */
export const RobloxSparkles: React.FC<RobloxSparklesProps> = ({
  enabled = true,
  sparkleColor = DEFAULT_SPARKLE_COLOR,
  timeScale = 1,
  position = [0, 0, 0],
  parentSize: _parentSize = [1, 1, 1]
}) => {
  const effectiveTimeScale = Math.abs(timeScale) < 0.0001 ? 0 : timeScale
  const primaryPointsRef = useRef<THREE.Points>(null)
  const primaryParticlesRef = useRef<Particle[]>([])
  const primaryEmissionAccumulator = useRef(0)

  const secondaryPointsRef = useRef<THREE.Points>(null)
  const secondaryParticlesRef = useRef<Particle[]>([])
  const secondaryEmissionAccumulator = useRef(0)

  const parsedColor = useMemo(() => {
    return parseSparkleColor(sparkleColor)
  }, [sparkleColor])

  const [mainTexture, setMainTexture] = useState<THREE.Texture | null>(null)
  const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null)
  const [alphaTexture, setAlphaTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    loadDDSTexture(sparklesMainDdsUrl, 'sparkles_main.dds', createFallbackSparkleTexture).then(
      setMainTexture
    )
    loadDDSTexture(sparklesColorDdsUrl, 'sparkles_color.dds', createFallbackColorTexture).then(
      setColorTexture
    )
    loadDDSTexture(commonAlphaDdsUrl, 'common_alpha.dds', createFallbackAlphaTexture).then(
      setAlphaTexture
    )
  }, [])

  const { primaryGeometry, primarySizeArray, primaryLifetimeArray, primaryRotationArray } =
    useMemo(() => {
      const positions = new Float32Array(PRIMARY_PARTICLE_COUNT * 3)
      const sizes = new Float32Array(PRIMARY_PARTICLE_COUNT)
      const lifetimes = new Float32Array(PRIMARY_PARTICLE_COUNT)
      const rotations = new Float32Array(PRIMARY_PARTICLE_COUNT)

      primaryParticlesRef.current = Array(PRIMARY_PARTICLE_COUNT)
        .fill(null)
        .map(() => ({
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 0,
          size: 0,
          rotation: 0,
          spin: 0,
          growth: 0
        }))

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
      geo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1))

      return {
        primaryGeometry: geo,
        primarySizeArray: sizes,
        primaryLifetimeArray: lifetimes,
        primaryRotationArray: rotations
      }
    }, [])

  const { secondaryGeometry, secondarySizeArray, secondaryLifetimeArray, secondaryRotationArray } =
    useMemo(() => {
      const positions = new Float32Array(SECONDARY_PARTICLE_COUNT * 3)
      const sizes = new Float32Array(SECONDARY_PARTICLE_COUNT)
      const lifetimes = new Float32Array(SECONDARY_PARTICLE_COUNT)
      const rotations = new Float32Array(SECONDARY_PARTICLE_COUNT)

      secondaryParticlesRef.current = Array(SECONDARY_PARTICLE_COUNT)
        .fill(null)
        .map(() => ({
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 0,
          size: 0,
          rotation: 0,
          spin: 0,
          growth: 0
        }))

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
      geo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1))

      return {
        secondaryGeometry: geo,
        secondarySizeArray: sizes,
        secondaryLifetimeArray: lifetimes,
        secondaryRotationArray: rotations
      }
    }, [])

  const primaryMaterial = useMemo(() => {
    if (!mainTexture || !colorTexture || !alphaTexture) return null

    return new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: mainTexture },
        cstrip: { value: colorTexture },
        astrip: { value: alphaTexture },
        modulateColor: {
          value: new THREE.Vector4(parsedColor.r, parsedColor.g, parsedColor.b, 0.9)
        },
        blendRatio: { value: PRIMARY_BLEND_RATIO }
      },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        attribute float rotation;
        varying float vLifetime;
        varying float vRotation;
        
        void main() {
          vLifetime = lifetime;
          vRotation = rotation;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Use fixed screen-space size (not perspective-based)
          gl_PointSize = size;
          gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        // Roblox Shader_CrazySparkles from particle.hlsl
        uniform sampler2D tex;
        uniform sampler2D cstrip;
        uniform sampler2D astrip;
        uniform vec4 modulateColor;
        uniform float blendRatio;
        
        varying float vLifetime;
        varying float vRotation;
        
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float c = cos(vRotation);
          float s = sin(vRotation);
          uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
          uv.y = 1.0 - uv.y;
          
          vec2 colorLookup = vec2(1.0 - vLifetime, 0.5);
          
          vec4 texcolor = texture2D(tex, uv);
          float stripAlpha = texture2D(astrip, colorLookup).r;
          vec4 stripColor = texture2D(cstrip, colorLookup);
          
          vec4 result;
          result.rgb = texcolor.rgb * modulateColor.rgb * stripAlpha * texcolor.a;
          result.a = blendRatio * texcolor.a * stripAlpha * modulateColor.a;
          
          gl_FragColor = result;
        }
      `,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthWrite: false,
      depthTest: true
    })
  }, [mainTexture, colorTexture, alphaTexture, parsedColor])

  const secondaryMaterial = useMemo(() => {
    if (!mainTexture || !colorTexture || !alphaTexture) return null

    return new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: mainTexture },
        cstrip: { value: colorTexture },
        astrip: { value: alphaTexture },
        modulateColor: {
          value: new THREE.Vector4(parsedColor.r, parsedColor.g, parsedColor.b, 0.9)
        },
        blendRatio: { value: PRIMARY_BLEND_RATIO }
      },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        attribute float rotation;
        varying float vLifetime;
        varying float vRotation;
        
        void main() {
          vLifetime = lifetime;
          vRotation = rotation;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Use fixed screen-space size (not perspective-based)
          gl_PointSize = size;
          gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        // Roblox Shader_CrazySparkles from particle.hlsl
        uniform sampler2D tex;
        uniform sampler2D cstrip;
        uniform sampler2D astrip;
        uniform vec4 modulateColor;
        uniform float blendRatio;
        
        varying float vLifetime;
        varying float vRotation;
        
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float c = cos(vRotation);
          float s = sin(vRotation);
          uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
          uv.y = 1.0 - uv.y;
          
          vec2 colorLookup = vec2(1.0 - vLifetime, 0.5);
          
          vec4 texcolor = texture2D(tex, uv);
          float stripAlpha = texture2D(astrip, colorLookup).r;
          vec4 stripColor = texture2D(cstrip, colorLookup);
          
          vec4 result;
          result.rgb = texcolor.rgb * modulateColor.rgb * stripAlpha * texcolor.a;
          result.a = blendRatio * texcolor.a * stripAlpha * modulateColor.a;
          
          gl_FragColor = result;
        }
      `,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthWrite: false,
      depthTest: true
    })
  }, [mainTexture, colorTexture, alphaTexture, parsedColor])

  /**
   * Spawn a primary sparkle particle
   * Uses spherical spread (pi radians full sphere)
   */
  const spawnPrimaryParticle = (particle: Particle) => {
    particle.position.set(
      (Math.random() - 0.5) * 2 * EMITTER_BOX_SIZE,
      (Math.random() - 0.5) * 2 * EMITTER_BOX_SIZE,
      (Math.random() - 0.5) * 2 * EMITTER_BOX_SIZE
    )

    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const dirX = Math.sin(phi) * Math.cos(theta)
    const dirY = Math.sin(phi) * Math.sin(theta)
    const dirZ = Math.cos(phi)

    particle.velocity.set(dirX * PRIMARY_SPEED, dirY * PRIMARY_SPEED + 1, dirZ * PRIMARY_SPEED)

    particle.maxLife = PRIMARY_PARTICLE_LIFETIME
    particle.life = particle.maxLife

    particle.size = PRIMARY_SIZE

    particle.rotation = (Math.random() - 0.5) * 2 * PRIMARY_ROTATION_RANGE
    particle.spin = PRIMARY_SPIN_MIN + Math.random() * (PRIMARY_SPIN_MAX - PRIMARY_SPIN_MIN)

    particle.growth = PRIMARY_GROWTH
  }

  /**
   * Spawn a secondary sparkle particle
   */
  const spawnSecondaryParticle = (particle: Particle) => {
    particle.position.set(
      (Math.random() - 0.5) * 2 * EMITTER_BOX_SIZE,
      (Math.random() - 0.5) * 2 * EMITTER_BOX_SIZE,
      (Math.random() - 0.5) * 2 * EMITTER_BOX_SIZE
    )

    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const dirX = Math.sin(phi) * Math.cos(theta)
    const dirY = Math.sin(phi) * Math.sin(theta)
    const dirZ = Math.cos(phi)

    particle.velocity.set(dirX * SECONDARY_SPEED, dirY * SECONDARY_SPEED, dirZ * SECONDARY_SPEED)

    particle.maxLife = SECONDARY_PARTICLE_LIFETIME
    particle.life = particle.maxLife

    particle.size = SECONDARY_SIZE

    particle.rotation = (Math.random() - 0.5) * 2 * PRIMARY_ROTATION_RANGE
    particle.spin = SECONDARY_SPIN_MIN + Math.random() * (SECONDARY_SPIN_MAX - SECONDARY_SPIN_MIN)

    particle.growth = SECONDARY_GROWTH
  }

  useFrame((_, delta) => {
    if (!enabled) return
    if (effectiveTimeScale === 0) return

    const dt = Math.min(delta, 0.1) * effectiveTimeScale

    if (primaryPointsRef.current) {
      const particles = primaryParticlesRef.current
      const positions = primaryGeometry.attributes.position.array as Float32Array

      primaryEmissionAccumulator.current += dt * PRIMARY_EMISSION_RATE
      while (primaryEmissionAccumulator.current >= 1) {
        primaryEmissionAccumulator.current -= 1

        for (let i = 0; i < PRIMARY_PARTICLE_COUNT; i++) {
          if (particles[i].life <= 0) {
            spawnPrimaryParticle(particles[i])
            break
          }
        }
      }

      const dampeningFactor = Math.pow(1.0 - PRIMARY_DAMPENING, dt)

      for (let i = 0; i < PRIMARY_PARTICLE_COUNT; i++) {
        const p = particles[i]

        if (p.life > 0) {
          p.life -= dt
          const normalizedLife = 1 - p.life / p.maxLife
          const elapsedTime = normalizedLife * p.maxLife

          p.velocity.y += 1.0 * dt
          p.velocity.multiplyScalar(dampeningFactor)
          p.position.addScaledVector(p.velocity, dt)
          p.rotation += p.spin * dt

          const currentSize = p.size + p.growth * elapsedTime
          const finalSize = Math.max(0.05, currentSize)

          primarySizeArray[i] = finalSize * 3
          primaryLifetimeArray[i] = normalizedLife
          primaryRotationArray[i] = p.rotation
          positions[i * 3] = p.position.x
          positions[i * 3 + 1] = p.position.y
          positions[i * 3 + 2] = p.position.z
        } else {
          primarySizeArray[i] = 0
          primaryLifetimeArray[i] = 1
          primaryRotationArray[i] = 0
        }
      }

      primaryGeometry.attributes.position.needsUpdate = true
      primaryGeometry.attributes.size.needsUpdate = true
      primaryGeometry.attributes.lifetime.needsUpdate = true
      primaryGeometry.attributes.rotation.needsUpdate = true
    }

    if (secondaryPointsRef.current) {
      const particles = secondaryParticlesRef.current
      const positions = secondaryGeometry.attributes.position.array as Float32Array

      secondaryEmissionAccumulator.current += dt * SECONDARY_EMISSION_RATE
      while (secondaryEmissionAccumulator.current >= 1) {
        secondaryEmissionAccumulator.current -= 1

        for (let i = 0; i < SECONDARY_PARTICLE_COUNT; i++) {
          if (particles[i].life <= 0) {
            spawnSecondaryParticle(particles[i])
            break
          }
        }
      }

      const dampeningFactor = Math.pow(1.0 - Math.min(0.9, SECONDARY_DAMPENING * dt), 1)

      for (let i = 0; i < SECONDARY_PARTICLE_COUNT; i++) {
        const p = particles[i]

        if (p.life > 0) {
          p.life -= dt
          const normalizedLife = 1 - p.life / p.maxLife
          const elapsedTime = normalizedLife * p.maxLife

          p.velocity.multiplyScalar(dampeningFactor)
          p.position.addScaledVector(p.velocity, dt)
          p.rotation += p.spin * dt

          const currentSize = p.size + p.growth * elapsedTime
          const finalSize = Math.max(0.02, currentSize)

          secondarySizeArray[i] = finalSize * 2
          secondaryLifetimeArray[i] = normalizedLife
          secondaryRotationArray[i] = p.rotation
          positions[i * 3] = p.position.x
          positions[i * 3 + 1] = p.position.y
          positions[i * 3 + 2] = p.position.z
        } else {
          secondarySizeArray[i] = 0
          secondaryLifetimeArray[i] = 1
          secondaryRotationArray[i] = 0
        }
      }

      secondaryGeometry.attributes.position.needsUpdate = true
      secondaryGeometry.attributes.size.needsUpdate = true
      secondaryGeometry.attributes.lifetime.needsUpdate = true
      secondaryGeometry.attributes.rotation.needsUpdate = true
    }
  })

  if (!enabled) return null

  return (
    <group position={position}>
      {primaryMaterial && (
        <points
          ref={primaryPointsRef}
          geometry={primaryGeometry}
          material={primaryMaterial}
          frustumCulled={false}
        />
      )}
      {secondaryMaterial && (
        <points
          ref={secondaryPointsRef}
          geometry={secondaryGeometry}
          material={secondaryMaterial}
          frustumCulled={false}
        />
      )}
    </group>
  )
}

export default RobloxSparkles
