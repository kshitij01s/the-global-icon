import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/** Register GSAP plugins once (safe to call repeatedly). */
export function ensureGsap(): typeof gsap {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return gsap
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scroll-reveal helper for editorial sections.
 * No-ops under reduced motion (elements stay in final readable state).
 */
export function revealOnScroll(
  targets: gsap.TweenTarget,
  vars: gsap.TweenVars = {},
): gsap.core.Tween | null {
  const g = ensureGsap()
  if (prefersReducedMotion()) {
    g.set(targets, { clearProps: 'all', opacity: 1, y: 0 })
    return null
  }
  return g.from(targets, {
    opacity: 0,
    y: 28,
    duration: 0.8,
    ease: 'power2.out',
    stagger: 0.08,
    scrollTrigger: {
      trigger: targets as gsap.DOMTarget,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
    ...vars,
  })
}

export function killScrollTriggers(): void {
  if (typeof window === 'undefined') return
  ensureGsap()
  ScrollTrigger.getAll().forEach((t) => t.kill())
}
