import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type FavoriteParticlesProps = {
  active?: boolean
  color?: [number, number, number]
  animate?: boolean
}

/**
 * Renders the particle burst animation that plays when a favorite button toggles on.
 * The parent element should be relatively positioned so the absolute particles can align correctly.
 */
const FavoriteParticles = ({
  active = false,
  color = [251, 191, 36],
  animate = true
}: FavoriteParticlesProps) => {
  const [r, g, b] = color

  return (
    <AnimatePresence>
      {animate && active && (
        <>
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.4) 0%, rgba(${r}, ${g}, ${b}, 0) 70%)`
            }}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: [1.2, 1.8, 1.2], opacity: [0, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 rounded-full"
            style={{
              boxShadow: `0 0 10px 2px rgba(${r}, ${g}, ${b}, 0.6)`
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute w-1 h-1 rounded-full bg-[var(--favorite-icon-color,theme(colors.yellow.400))]"
              style={
                {
                  '--favorite-icon-color': `rgba(${r}, ${g}, ${b}, 1)`
                } as React.CSSProperties
              }
              initial={{ x: '50%', y: '50%', scale: 0, opacity: 0 }}
              animate={{
                x: `calc(50% + ${Math.cos((i * Math.PI) / 3) * 30}px)`,
                y: `calc(50% + ${Math.sin((i * Math.PI) / 3) * 30}px)`,
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  )
}

export default FavoriteParticles
