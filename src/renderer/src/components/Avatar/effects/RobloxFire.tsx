import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js'

// Primary fire emitter textures
import fireMainDdsUrl from '@assets/textures/fire_main.dds?url'
import fireColorDdsUrl from '@assets/textures/fire_color.dds?url'
import fireAlphaDdsUrl from '@assets/textures/fire_alpha.dds?url'

// Secondary sparks emitter textures
import fireSparksMainDdsUrl from '@assets/textures/fire_sparks_main.dds?url'
import fireSparksColorDdsUrl from '@assets/textures/fire_sparks_color.dds?url'
import commonAlphaDdsUrl from '@assets/textures/common_alpha.dds?url'

/**
 * Roblox Fire properties interface
 * Based on Roblox's Fire.cpp implementation
 */
export interface RobloxFireProps {
  /** Whether the fire effect is active */
  enabled?: boolean
  /** Fire color (primary) - default is Roblox orange */
  color?: THREE.Color | string
  /** Secondary color for blend - default is Roblox dark red-brown */
  secondaryColor?: THREE.Color | string
  /** Fire size - default 5, range 2-30 (faithful to Roblox) */
  size?: number
  /** Heat affects upward velocity - default 9, range -25 to 25 */
  heat?: number
  /** Position offset from parent */
  position?: [number, number, number]
  /** Parent size for scaling the fire effect */
  parentSize?: [number, number, number]
}

// Roblox Fire constants from Fire.cpp
const MAX_HEAT = 25.0
const MAX_SIZE = 30.0
const MIN_SIZE = 2.0

// Primary emitter constants
const DAMPENING = 0.4
const SPREAD_ANGLE = 10 // degrees (10/57.3 rad)
const SPIN_SPEED = 100 / 57.3 // ~1.75 rad/s
const PARTICLE_LIFETIME_MIN = 1.0
const PARTICLE_LIFETIME_MAX = 2.0
const COLOR_MULTIPLIER = 4.0
const BLEND_RATIO = 0.4

// Default colors from Roblox's modern particle system (RenderNewParticles2Enable)
const DEFAULT_COLOR = new THREE.Color(236 / 255, 139 / 255, 70 / 255) // Orange: #EC8B46
const DEFAULT_SECONDARY_COLOR = new THREE.Color(139 / 255, 80 / 255, 55 / 255) // Dark: #8B5037

// Particle system configuration
const PARTICLE_COUNT = 200 // Enough for higher emission rate * 2sec lifetime
const BASE_EMISSION_RATE = 85 // Increased for denser flame (Roblox uses 65 but we need more for visual density)
const SPARKS_PARTICLE_COUNT = 150 // Secondary emitter for sparks

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  rotation: number
  spin: number
  colorBlend: number // 0 = primary color, 1 = secondary color
}

/**
 * Creates a fallback fire particle texture if DDS loading fails
 */
const createFallbackFireTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas')
  const size = 128
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, size, size)

  const centerX = size / 2
  const centerY = size * 0.6

  const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.5)
  outerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
  outerGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)')
  outerGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)')
  outerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = outerGradient
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(1, 1.5)
  ctx.translate(-centerX, -centerY)

  const innerGradient = ctx.createRadialGradient(
    centerX,
    centerY * 0.9,
    0,
    centerX,
    centerY * 0.9,
    size * 0.25
  )
  innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  innerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)')
  innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = innerGradient
  ctx.fillRect(0, 0, size, size)
  ctx.restore()

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
  gradient.addColorStop(0, '#FFFFCC') // Very bright yellow-white
  gradient.addColorStop(0.2, '#FFCC66') // Bright orange-yellow
  gradient.addColorStop(0.4, '#FF9933') // Orange
  gradient.addColorStop(0.6, '#FF6600') // Deep orange
  gradient.addColorStop(0.8, '#CC3300') // Red-orange
  gradient.addColorStop(1.0, '#661100') // Dark red-brown

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

  // Alpha fades from full to zero over lifetime
  const gradient = ctx.createLinearGradient(0, 0, 256, 0)
  gradient.addColorStop(0, '#FFFFFF') // Full alpha at start
  gradient.addColorStop(0.3, '#FFFFFF') // Hold
  gradient.addColorStop(0.7, '#888888') // Start fading
  gradient.addColorStop(1.0, '#000000') // Zero alpha at end

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
    console.log(`[RobloxFire] Loading ${name} from:`, url)

    loader.load(
      url,
      (texture) => {
        console.log(`[RobloxFire] Loaded ${name}`)
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        resolve(texture)
      },
      undefined,
      (error) => {
        console.warn(`[RobloxFire] Failed to load ${name}, using fallback:`, error)
        resolve(fallbackFn())
      }
    )
  })
}

/**
 * RobloxFire - A faithful recreation of Roblox's Fire particle effect
 * Based on the original Fire.cpp and Emitter.cpp implementation
 */
export const RobloxFire: React.FC<RobloxFireProps> = ({
  enabled = true,
  color = DEFAULT_COLOR,
  secondaryColor = DEFAULT_SECONDARY_COLOR,
  size = 5,
  heat = 9,
  position = [0, 0, 0],
  parentSize: _parentSize = [1, 1, 1]
}) => {
  const pointsRef = useRef<THREE.Points>(null)
  const particlesRef = useRef<Particle[]>([])
  const emissionAccumulator = useRef(0)

  const clampedSize = Math.max(MIN_SIZE, Math.min(size, MAX_SIZE))
  const clampedHeat = Math.max(-MAX_HEAT, Math.min(heat, MAX_HEAT))

  const primaryColor = useMemo(() => {
    return color instanceof THREE.Color ? color : new THREE.Color(color)
  }, [color])

  const secondColor = useMemo(() => {
    return secondaryColor instanceof THREE.Color ? secondaryColor : new THREE.Color(secondaryColor)
  }, [secondaryColor])

  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null)
  const [alphaTexture, setAlphaTexture] = useState<THREE.Texture | null>(null)
  const [sparksTexture, setSparksTexture] = useState<THREE.Texture | null>(null)
  const [sparksColorTexture, setSparksColorTexture] = useState<THREE.Texture | null>(null)
  const [sparksAlphaTexture, setSparksAlphaTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    loadDDSTexture(fireMainDdsUrl, 'fire_main.dds', createFallbackFireTexture).then(setTexture)
    loadDDSTexture(fireColorDdsUrl, 'fire_color.dds', createFallbackColorTexture).then(
      setColorTexture
    )
    loadDDSTexture(fireAlphaDdsUrl, 'fire_alpha.dds', createFallbackAlphaTexture).then(
      setAlphaTexture
    )
    loadDDSTexture(fireSparksMainDdsUrl, 'fire_sparks_main.dds', createFallbackFireTexture).then(
      setSparksTexture
    )
    loadDDSTexture(fireSparksColorDdsUrl, 'fire_sparks_color.dds', createFallbackColorTexture).then(
      setSparksColorTexture
    )
    loadDDSTexture(commonAlphaDdsUrl, 'common_alpha.dds', createFallbackAlphaTexture).then(
      setSparksAlphaTexture
    )
  }, [])

  const { geometry, sizeArray, lifetimeArray, rotationArray } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const lifetimes = new Float32Array(PARTICLE_COUNT)
    const rotations = new Float32Array(PARTICLE_COUNT)

    particlesRef.current = Array(PARTICLE_COUNT)
      .fill(null)
      .map(() => ({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        size: 0,
        rotation: 0,
        spin: 0,
        colorBlend: 0
      }))

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    geo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1))

    return {
      geometry: geo,
      sizeArray: sizes,
      lifetimeArray: lifetimes,
      rotationArray: rotations
    }
  }, [])

  const sparksPointsRef = useRef<THREE.Points>(null)
  const sparksParticlesRef = useRef<Particle[]>([])
  const sparksEmissionAccumulator = useRef(0)

  const { sparksGeometry, sparksSizeArray, sparksLifetimeArray, sparksRotationArray } =
    useMemo(() => {
      const positions = new Float32Array(SPARKS_PARTICLE_COUNT * 3)
      const sizes = new Float32Array(SPARKS_PARTICLE_COUNT)
      const lifetimes = new Float32Array(SPARKS_PARTICLE_COUNT)
      const rotations = new Float32Array(SPARKS_PARTICLE_COUNT)

      sparksParticlesRef.current = Array(SPARKS_PARTICLE_COUNT)
        .fill(null)
        .map(() => ({
          position: new THREE.Vector3(),
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 0,
          size: 0,
          rotation: 0,
          spin: 0,
          colorBlend: 0
        }))

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
      geo.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1))

      return {
        sparksGeometry: geo,
        sparksSizeArray: sizes,
        sparksLifetimeArray: lifetimes,
        sparksRotationArray: rotations
      }
    }, [])

  const material = useMemo(() => {
    if (!texture || !colorTexture || !alphaTexture) return null
    return new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: texture },
        cstrip: { value: colorTexture },
        astrip: { value: alphaTexture },
        modulateColor: {
          value: new THREE.Vector4(
            primaryColor.r * COLOR_MULTIPLIER,
            primaryColor.g * COLOR_MULTIPLIER,
            primaryColor.b * COLOR_MULTIPLIER,
            1.0
          )
        },
        secondaryModulateColor: {
          value: new THREE.Vector4(
            secondColor.r * COLOR_MULTIPLIER,
            secondColor.g * COLOR_MULTIPLIER,
            secondColor.b * COLOR_MULTIPLIER,
            1.0
          )
        }
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
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 256.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D tex;
        uniform sampler2D cstrip;
        uniform sampler2D astrip;
        uniform vec4 modulateColor;
        uniform vec4 secondaryModulateColor;
        
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
          
          float innerBlend = stripColor.r;
          vec4 blendedColor = mix(modulateColor, secondaryModulateColor, innerBlend);
          
          vec4 result;
          result.rgb = texcolor.rgb * blendedColor.rgb * stripAlpha * texcolor.a;
          result.a = ${BLEND_RATIO} * texcolor.a * stripAlpha;
          
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
  }, [texture, colorTexture, alphaTexture, primaryColor, secondColor])

  const sparksMaterial = useMemo(() => {
    if (!sparksTexture || !sparksColorTexture || !sparksAlphaTexture) return null
    return new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: sparksTexture },
        cstrip: { value: sparksColorTexture },
        astrip: { value: sparksAlphaTexture },
        modulateColor: {
          value: new THREE.Vector4(secondColor.r, secondColor.g, secondColor.b, 1.0)
        }
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
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D tex;
        uniform sampler2D cstrip;
        uniform sampler2D astrip;
        uniform vec4 modulateColor;
        
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
          vec4 vcolor = texture2D(cstrip, colorLookup);
          vcolor.a = texture2D(astrip, colorLookup).r;
          
          vec4 result;
          result.rgb = (texcolor.rgb + vcolor.rgb) * modulateColor.rgb;
          result.a = texcolor.a * vcolor.a;
          result.rgb *= result.a;
          
          gl_FragColor = result;
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    })
  }, [sparksTexture, sparksColorTexture, sparksAlphaTexture, secondColor])

  const spawnParticle = (particle: Particle) => {
    const robloxSize = clampedSize / 3.5
    const boxsize = robloxSize / 8

    const spawnX = (Math.random() - 0.5) * 2 * boxsize
    const spawnY = (Math.random() - 0.5) * 2 * boxsize
    const spawnZ = (Math.random() - 0.5) * 2 * boxsize

    particle.position.set(spawnX, spawnY, spawnZ)

    const spreadRad = (SPREAD_ANGLE * Math.PI) / 180
    const randomAngle = Math.random() * Math.PI * 2
    const coneSpread = Math.random() * spreadRad

    const dirX = Math.sin(coneSpread) * Math.cos(randomAngle)
    const dirY = Math.cos(coneSpread)
    const dirZ = Math.sin(coneSpread) * Math.sin(randomAngle)

    const speed = 0.4 * (0.2 * robloxSize * robloxSize + 0.2 * clampedHeat)

    particle.velocity.set(dirX * speed, dirY * speed, dirZ * speed)

    particle.maxLife =
      PARTICLE_LIFETIME_MIN + Math.random() * (PARTICLE_LIFETIME_MAX - PARTICLE_LIFETIME_MIN)
    particle.life = particle.maxLife

    particle.size = robloxSize * 2.6

    particle.rotation = Math.random() * Math.PI * 2
    particle.spin = SPIN_SPEED * (Math.random() > 0.5 ? 1 : -1)

    particle.colorBlend = Math.random() * 0.3
  }

  const spawnSparksParticle = (particle: Particle) => {
    const robloxSize = clampedSize / 3.5
    const boxsize = robloxSize / 8
    const boxsize2 = boxsize * 2
    const size2 = 0.2 * robloxSize

    const spawnX = (Math.random() - 0.5) * 2 * boxsize2
    const spawnY = (Math.random() - 0.5) * 2 * boxsize2
    const spawnZ = (Math.random() - 0.5) * 2 * boxsize2

    particle.position.set(spawnX, spawnY, spawnZ)

    const spreadRad = (SPREAD_ANGLE * Math.PI) / 180
    const randomAngle = Math.random() * Math.PI * 2
    const coneSpread = Math.random() * spreadRad

    const dirX = Math.sin(coneSpread) * Math.cos(randomAngle)
    const dirY = Math.cos(coneSpread)
    const dirZ = Math.sin(coneSpread) * Math.sin(randomAngle)

    const speed = 0.4 * (0.1 * robloxSize * robloxSize + 0.2 * clampedHeat)

    particle.velocity.set(dirX * speed, dirY * speed, dirZ * speed)

    const life2 = 2
    particle.maxLife = life2 / 2 + Math.random() * (life2 / 2)
    particle.life = particle.maxLife

    particle.size = size2

    particle.rotation = Math.random() * Math.PI * 2
    particle.spin = SPIN_SPEED * (Math.random() > 0.5 ? 1 : -1)

    particle.colorBlend = 0
  }

  useFrame((_, delta) => {
    if (!enabled) return

    const dt = Math.min(delta, 0.1)

    if (pointsRef.current) {
      const particles = particlesRef.current
      const positions = geometry.attributes.position.array as Float32Array

      emissionAccumulator.current += dt * BASE_EMISSION_RATE
      while (emissionAccumulator.current >= 1) {
        emissionAccumulator.current -= 1

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          if (particles[i].life <= 0) {
            spawnParticle(particles[i])
            break
          }
        }
      }

      const robloxSize = clampedSize / 3.5
      const localForceY = 0.5 * ((robloxSize * robloxSize) / 4 + 0.7 * clampedHeat)
      const dampeningFactor = Math.pow(1.0 - DAMPENING, dt)
      const growthPerSecond = -1.5 * robloxSize

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i]

        if (p.life > 0) {
          p.life -= dt
          const normalizedLife = 1 - p.life / p.maxLife
          const elapsedTime = normalizedLife * p.maxLife

          p.velocity.y += localForceY * dt
          p.velocity.multiplyScalar(dampeningFactor)
          p.velocity.x += (Math.random() - 0.5) * 0.2 * dt
          p.velocity.z += (Math.random() - 0.5) * 0.2 * dt
          p.position.addScaledVector(p.velocity, dt)
          p.rotation += p.spin * dt

          const currentSize = p.size + growthPerSecond * elapsedTime
          const finalSize = Math.max(0.05, currentSize)

          sizeArray[i] = finalSize * 4
          lifetimeArray[i] = normalizedLife
          rotationArray[i] = p.rotation
          positions[i * 3] = p.position.x
          positions[i * 3 + 1] = p.position.y
          positions[i * 3 + 2] = p.position.z
        } else {
          sizeArray[i] = 0
          lifetimeArray[i] = 1
          rotationArray[i] = 0
        }
      }

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.size.needsUpdate = true
      geometry.attributes.lifetime.needsUpdate = true
      geometry.attributes.rotation.needsUpdate = true
    }

    if (sparksPointsRef.current) {
      const sparksParticles = sparksParticlesRef.current
      const sparksPositions = sparksGeometry.attributes.position.array as Float32Array

      sparksEmissionAccumulator.current += dt * BASE_EMISSION_RATE
      while (sparksEmissionAccumulator.current >= 1) {
        sparksEmissionAccumulator.current -= 1

        for (let i = 0; i < SPARKS_PARTICLE_COUNT; i++) {
          if (sparksParticles[i].life <= 0) {
            spawnSparksParticle(sparksParticles[i])
            break
          }
        }
      }

      const robloxSize = clampedSize / 3.5
      const size2 = 0.2 * robloxSize
      const life2 = 2
      const growth2 = -size2 / life2
      const localForceY = 0.5 * ((robloxSize * robloxSize) / 4 + 0.7 * clampedHeat)
      const dampeningFactor = Math.pow(1.0 - DAMPENING, dt)

      for (let i = 0; i < SPARKS_PARTICLE_COUNT; i++) {
        const p = sparksParticles[i]

        if (p.life > 0) {
          p.life -= dt
          const normalizedLife = 1 - p.life / p.maxLife

          p.velocity.y += localForceY * dt
          p.velocity.multiplyScalar(dampeningFactor)
          p.velocity.x += (Math.random() - 0.5) * 0.3 * dt
          p.velocity.z += (Math.random() - 0.5) * 0.3 * dt
          p.position.addScaledVector(p.velocity, dt)
          p.rotation += p.spin * dt

          const currentSize = p.size + growth2 * normalizedLife * p.maxLife
          const finalSize = Math.max(0.02, currentSize)

          sparksSizeArray[i] = finalSize * 3
          sparksLifetimeArray[i] = normalizedLife
          sparksRotationArray[i] = p.rotation
          sparksPositions[i * 3] = p.position.x
          sparksPositions[i * 3 + 1] = p.position.y
          sparksPositions[i * 3 + 2] = p.position.z
        } else {
          sparksSizeArray[i] = 0
          sparksLifetimeArray[i] = 1
          sparksRotationArray[i] = 0
        }
      }

      sparksGeometry.attributes.position.needsUpdate = true
      sparksGeometry.attributes.size.needsUpdate = true
      sparksGeometry.attributes.lifetime.needsUpdate = true
      sparksGeometry.attributes.rotation.needsUpdate = true
    }
  })

  if (!enabled) return null

  return (
    <group position={position}>
      {material && (
        <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
      )}
      {sparksMaterial && (
        <points
          ref={sparksPointsRef}
          geometry={sparksGeometry}
          material={sparksMaterial}
          frustumCulled={false}
        />
      )}
    </group>
  )
}

export default RobloxFire
