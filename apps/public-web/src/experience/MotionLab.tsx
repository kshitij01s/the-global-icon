import { Canvas } from '@react-three/fiber'
import { Float, MeshDistortMaterial, OrbitControls } from '@react-three/drei'
import { useGSAP } from '@gsap/react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ensureGsap, prefersReducedMotion } from '../lib/motion'

/**
 * Isolated motion / 3D lab — does not replace the public homepage.
 * Use to verify GSAP + R3F without risking production editorial layout.
 */
export function MotionLab() {
  const chapterRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!chapterRef.current || prefersReducedMotion()) return
      const g = ensureGsap()
      g.from(chapterRef.current.querySelectorAll('[data-reveal]'), {
        opacity: 0,
        y: 40,
        stagger: 0.12,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: chapterRef.current,
          start: 'top 75%',
        },
      })
    },
    { scope: chapterRef },
  )

  return (
    <div className="min-h-screen bg-[var(--bg,#0b1020)] text-[var(--fg,#f4f1ea)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-amber-200/80">THE GLOBAL ICON · Lab</p>
          <h1 className="mt-2 font-serif text-3xl">Motion &amp; 3D Lab</h1>
        </div>
        <Link className="text-sm text-amber-200 underline-offset-4 hover:underline" to="/">
          ← Back to site
        </Link>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 pb-16 lg:grid-cols-2">
        <div ref={chapterRef} className="space-y-4">
          <p data-reveal className="text-sm leading-relaxed text-white/70">
            GSAP scroll reveals + React Three Fiber canvas. Respects{' '}
            <code className="text-amber-100">prefers-reduced-motion</code>. This route is for
            generative / interactive experiments — the main magazine experience stays editorial.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li data-reveal>· Framer Motion remains on primary pages</li>
            <li data-reveal>· GSAP for scroll storytelling chapters</li>
            <li data-reveal>· R3F for optional immersive moments</li>
          </ul>
        </div>

        <div className="h-72 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {prefersReducedMotion() ? (
            <div className="grid h-full place-items-center text-sm text-white/60">
              3D preview paused (reduced motion)
            </div>
          ) : (
            <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} dpr={[1, 1.75]}>
              <ambientLight intensity={0.55} />
              <directionalLight position={[4, 3, 2]} intensity={1.1} />
              <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
                <mesh>
                  <icosahedronGeometry args={[1, 1]} />
                  <MeshDistortMaterial color="#b8975a" distort={0.35} speed={2} roughness={0.25} />
                </mesh>
              </Float>
              <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
            </Canvas>
          )}
        </div>
      </section>
    </div>
  )
}
