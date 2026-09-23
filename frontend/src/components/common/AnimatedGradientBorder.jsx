import React, { useState, useEffect, useRef } from 'react'
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from 'motion/react'

/**
 * AnimatedGradientBorder
 *
 * Hover-only interactive gradient border for FinTrack cards.
 *
 * Behavior:
 * - IDLE: Normal FinTrack card border. No rotating animation, zero CPU cycles.
 * - HOVER: Conic-gradient fades in, smoothly rotates around card border (1.8s linear),
 *   subtle glow spill appears.
 * - EXIT: Rotation stops immediately, gradient fades out smoothly (~200ms),
 *   card returns to normal appearance.
 * - ACCESSIBILITY: Honors prefers-reduced-motion by keeping border static.
 */
export default function AnimatedGradientBorder({
  children,
  className = '',
  duration = 1.8,
  enabled = true,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const turn = useMotionValue(0)
  const opacity = useMotionValue(0)
  const glowOpacity = useTransform(opacity, [0, 1], [0, 0.35])

  const rotationControlsRef = useRef(null)
  const fadeControlsRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    if (!isHovered) {
      // Mouse left: Stop rotation immediately
      if (rotationControlsRef.current) {
        rotationControlsRef.current.stop()
        rotationControlsRef.current = null
      }

      // Smooth fade-out of gradient and glow (approx. 200ms)
      fadeControlsRef.current = animate(opacity, 0, {
        duration: 0.2,
        ease: 'easeOut',
      })

      return () => {
        if (fadeControlsRef.current) fadeControlsRef.current.stop()
      }
    }

    // Mouse entered: Stop any active fade-out
    if (fadeControlsRef.current) {
      fadeControlsRef.current.stop()
    }

    // Smooth fade-in of gradient and glow (approx. 180ms)
    fadeControlsRef.current = animate(opacity, 1, {
      duration: 0.18,
      ease: 'easeIn',
    })

    // Check prefers-reduced-motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      turn.set(0)
      return () => {
        if (fadeControlsRef.current) fadeControlsRef.current.stop()
      }
    }

    // Start rotation from current turn position, looping smoothly while hovered
    const currentTurn = turn.get()
    rotationControlsRef.current = animate(turn, [currentTurn, currentTurn + 1], {
      duration,
      ease: 'linear',
      repeat: Infinity,
    })

    return () => {
      if (rotationControlsRef.current) {
        rotationControlsRef.current.stop()
        rotationControlsRef.current = null
      }
      if (fadeControlsRef.current) {
        fadeControlsRef.current.stop()
      }
    }
  }, [isHovered, duration, enabled, opacity, turn])

  const gradient = useMotionTemplate`
    conic-gradient(
      from ${turn}turn,
      transparent 0%,
      #f472b600 5%,
      #f472b6 10%,
      #c084fc 18%,
      #818cf8 26%,
      #38bdf8 34%,
      #2dd4bf 42%,
      #fbbf24 46%,
      #fbbf2400 52%,
      transparent 56%
    )
  `

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      className={`relative p-[1.5px] rounded-[inherit] transition-[box-shadow] duration-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Default Idle Card Border Background */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none transition-colors duration-150"
        style={{ backgroundColor: 'var(--border-color, #E5E7EB)' }}
      />

      {/* Animated Conic Gradient Border Layer (rotates and visible ONLY on hover) */}
      <motion.div
        style={{ backgroundImage: gradient, opacity }}
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
      />

      {/* Inner Masked Container preserving child layout and theme */}
      <div className="relative rounded-[inherit] overflow-hidden w-full h-full flex flex-col">
        {/* Child Content - elevated above glow so all buttons, inputs, links work */}
        <div className="relative z-10 w-full h-full flex flex-col flex-1">
          {children}
        </div>

        {/* Subtle Blurred Glow Spill Layer (visible ONLY on hover) */}
        <motion.div
          style={{ backgroundImage: gradient, opacity: glowOpacity }}
          className="
            ai-glow-spill-mask
            blur-xl
            pointer-events-none
            absolute
            inset-[-25%]
            z-0
            overflow-hidden
          "
        />
      </div>
    </div>
  )
}
