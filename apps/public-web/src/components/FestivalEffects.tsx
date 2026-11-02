import { useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { useTheme } from '../lib/theme'

/** Lightweight decorative overlays. Disabled when effects are off, on /read routes, or reduced-motion. */
export default function FestivalEffects({ disable }: { disable?: boolean }) {
  const { active } = useTheme()
  const reduce = useReducedMotion()
  const effects = active?.effects
  const enabled = !!active?.effectsEnabled && !!effects && !disable && !reduce
  const qty = Math.min(36, Math.max(8, effects?.quantity ?? 24))

  const flakes = useMemo(() => {
    if (!enabled || !effects?.snowfall) return []
    return Array.from({ length: qty }, (_, i) => ({
      id: i,
      left: `${(i * 17) % 100}%`,
      delay: `${(i % 8) * 0.4}s`,
      duration: `${(effects.speed ? 10 / effects.speed : 8) + (i % 5)}s`,
      size: 2 + (i % 4),
      opacity: effects.opacity ?? 0.75,
    }))
  }, [enabled, effects?.snowfall, effects?.speed, effects?.opacity, qty])

  if (!enabled) return null

  return (
    <div
      className={`festival-layer${effects.intensity === 'medium' ? ' festival-medium' : ''}`}
      aria-hidden
    >
      {effects.snowfall && (
        <div className="festival-snow">
          {flakes.map((f) => (
            <span
              key={f.id}
              className="festival-flake"
              style={{
                left: f.left,
                width: f.size,
                height: f.size,
                animationDelay: f.delay,
                animationDuration: f.duration,
                opacity: f.opacity,
              }}
            />
          ))}
        </div>
      )}
      {effects.festiveLights && <div className="festival-lights" />}
      {effects.christmasTree && <div className="festival-tree" title="Festive decoration" />}
      {effects.snowman && <div className="festival-snowman" title="Festive decoration" />}
      {effects.diyaGlow && <div className="festival-diya" />}
      {effects.hearts && <div className="festival-hearts" />}
      {effects.colourBurst && <div className="festival-holi" />}
      {effects.fireworks && <div className="festival-spark" />}
      {effects.natureLeaves && <div className="festival-leaves" />}
      {effects.lanterns && <div className="festival-lanterns" />}
      {effects.fog && <div className="festival-fog" />}
      {effects.petals && <div className="festival-petals" />}
      {effects.confetti && <div className="festival-confetti" />}
      {effects.crescentGlow && <div className="festival-crescent" />}
      {effects.pumpkins && <div className="festival-pumpkin" />}
    </div>
  )
}
