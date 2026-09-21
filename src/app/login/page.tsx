'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'

const matrixChars = '▓▒░█▄▀■□01アイウエオカキクケコサシスセソ'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [doorOpened, setDoorOpened] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isMatrixFinished, setIsMatrixFinished] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [hideForm, setHideForm] = useState(false)
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const welcomeRef = useRef<HTMLDivElement>(null)
  const sequenceStarted = useRef(false)

  // Already logged in → go home immediately
  useEffect(() => {
    if (sessionStorage.getItem('authenticated') === 'true') {
      router.replace('/')
    }
  }, [router])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = []

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100
    }

    let isMatrixFinishedLocal = false

    const draw = () => {
      if (isMatrixFinishedLocal) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#fff'
      ctx.font = `${fontSize}px monospace`

      let allDropsFinished = true

      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        if (y <= canvas.height || drops[i] < 0) {
          ctx.fillText(text, x, y)
          allDropsFinished = false
        }

        if (y > canvas.height && Math.random() > 0.975) {
          if (!isAuthenticating) {
            drops[i] = 0
          }
        }

        if (isAuthenticating) {
          drops[i] += 1.5
        } else {
          drops[i]++
        }
      }

      if (isAuthenticating && allDropsFinished && !isMatrixFinishedLocal) {
        isMatrixFinishedLocal = true
        setIsMatrixFinished(true)
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [isAuthenticating])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDoorOpened(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (showWelcome && welcomeRef.current) {
      const letters1 = welcomeRef.current.querySelectorAll('.letter-m')
      const letters2 = welcomeRef.current.querySelectorAll('.letter-n')
      const glow = welcomeRef.current.querySelector('.glow-box')
      const glow2 = welcomeRef.current.querySelector('.glow-box-2')
      
      gsap.fromTo([glow, glow2], 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 0.4, duration: 4, ease: 'power1.out', stagger: 0.5 }
      )

      gsap.fromTo(letters1,
        { y: 20, opacity: 0, filter: 'blur(8px)' },
        { 
          y: 0, 
          opacity: 1, 
          filter: 'blur(0px)',
          duration: 1.8,
          stagger: 0.1,
          ease: 'power3.out'
        }
      )

      gsap.fromTo(letters2,
        { y: 20, opacity: 0, filter: 'blur(8px)' },
        { 
          y: 0, 
          opacity: 1, 
          filter: 'blur(0px)',
          duration: 1.8,
          delay: 0.5,
          stagger: 0.1,
          ease: 'power3.out'
        }
      )
    }
  }, [showWelcome])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password === 'fidelio') {
      setIsAuthenticating(true)
    } else {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      setPassword('')
    }
  }

  useEffect(() => {
    if (isMatrixFinished && !sequenceStarted.current) {
      sequenceStarted.current = true
      setHideForm(true)
      
      setTimeout(() => {
        setShowWelcome(true)
      }, 1000)

      setTimeout(() => {
        setShowWelcome(false)
      }, 5500)

      setTimeout(() => {
        sessionStorage.setItem('authenticated', 'true')
        router.push('/')
      }, 6500)
    }
  }, [isMatrixFinished, router])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-20" />

      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/60 pointer-events-none" />

      <AnimatePresence>
        {!doorOpened && (
          <>
            <motion.div
              initial={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
              className="fixed left-0 top-0 h-screen w-1/2 bg-zinc-950 z-50 border-r border-white/5"
            >
              <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-r from-transparent to-black/80 pointer-events-none" />
            </motion.div>
            
            <motion.div
              initial={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
              className="fixed right-0 top-0 h-screen w-1/2 bg-zinc-950 z-50 border-l border-white/5"
            >
              <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-l from-transparent to-black/80 pointer-events-none" />
            </motion.div>
            
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ opacity: 0, scaleX: 10, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="fixed left-1/2 top-[15%] bottom-[15%] w-[2px] bg-white z-[60] -translate-x-1/2 shadow-[0_0_20px_4px_rgba(255,255,255,0.8)] rounded-full"
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
            transition={{ duration: 0.5 }}
            ref={welcomeRef}
            className="absolute inset-0 flex items-center justify-center z-50 overflow-hidden"
          >
            {/* AMBIENT WAVY LINES BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <style>{`
                @keyframes waveForward {
                  from { transform: translateX(0); }
                  to   { transform: translateX(-50%); }
                }
                @keyframes waveBack {
                  from { transform: translateX(-50%); }
                  to   { transform: translateX(0); }
                }
                .wl { position: absolute; left: 0; width: 200%; }
                .wl-fwd { animation: waveForward linear infinite; }
                .wl-bck { animation: waveBack  linear infinite; }
              `}</style>
              {[
                { top: '8%',  dur: 55, dir: 'fwd', op: 0.18 },
                { top: '22%', dur: 40, dir: 'bck', op: 0.28 },
                { top: '38%', dur: 48, dir: 'fwd', op: 0.22 },
                { top: '55%', dur: 35, dir: 'bck', op: 0.30 },
                { top: '70%', dur: 52, dir: 'fwd', op: 0.20 },
                { top: '85%', dur: 42, dir: 'bck', op: 0.24 },
              ].map((w, i) => (
                <svg
                  key={i}
                  className={`wl wl-${w.dir === 'fwd' ? 'fwd' : 'bck'}`}
                  style={{ top: w.top, animationDuration: `${w.dur}s`, opacity: w.op, height: '60px' }}
                  viewBox="0 0 2400 60"
                  preserveAspectRatio="none"
                >
                  {/* Seamless sine-wave: period=600, 4 full waves = 2400, shift by 1200 (50%) */}
                  <path
                    d="M0 30 C150 0,450 0,600 30 C750 60,1050 60,1200 30 C1350 0,1650 0,1800 30 C1950 60,2250 60,2400 30"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              ))}
            </div>

            <div className="relative">
              {/* Professional Subtle Ambient Glow */}
              <div className="glow-box absolute -inset-40 bg-white/5 blur-[120px] rounded-full" />
              <div className="glow-box-2 absolute -inset-20 bg-zinc-400/5 blur-[80px] rounded-full" />

              <div className="relative text-center flex flex-col items-center">
                {/* MERHABA */}
                <div className="mb-6 flex justify-center gap-1 overflow-hidden">
                  {'MERHABA'.split('').map((letter, i) => (
                    <span
                      key={`m-${i}`}
                      className="letter-m inline-block text-[14px] md:text-[20px] font-medium tracking-[0.5em] text-zinc-400 opacity-0 transform-gpu"
                      style={{
                        fontFamily: 'var(--font-geist-sans), sans-serif',
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                </div>

                {/* METİNC */}
                <div className="flex justify-center gap-1 md:gap-2">
                  {'METİNC'.split('').map((letter, i) => (
                    <span
                      key={`n-${i}`}
                      className="letter-n inline-block text-[70px] md:text-[120px] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 opacity-0 transform-gpu leading-none"
                      style={{
                        fontFamily: 'var(--font-geist-sans), sans-serif',
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isAuthenticating && doorOpened && (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.85,
              y: -20,
              filter: 'blur(24px)',
              transition: { duration: 0.7, ease: [0.32, 0, 0.67, 0] }
            }}
            transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-xs px-0"
          >
            {/* Top label */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.2em' }}
              animate={{ opacity: 1, letterSpacing: '0.5em' }}
              transition={{ delay: 1, duration: 1 }}
              className="mb-8 text-center text-[10px] font-medium uppercase text-zinc-500 tracking-[0.5em]"
            >
              GİRİŞ
            </motion.p>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />

            {/* Input field */}
            <form onSubmit={handleSubmit}>
              <motion.div
                className={`relative ${isShaking ? 'animate-shake' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.6 }}
              >
                {/* Glow ring on focus */}
                <AnimatePresence>
                  {inputFocused && (
                    <motion.div
                      key="focus-ring"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      className="absolute -inset-[3px] rounded-xl border border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.12)] pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Wrong password flash */}
                <AnimatePresence>
                  {isShaking && (
                    <motion.div
                      key="error-flash"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.2, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 rounded-xl bg-red-500/20 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5 text-center text-base font-mono tracking-[0.4em] text-white placeholder-zinc-700 outline-none transition-all duration-300 focus:border-white/20 focus:bg-white/[0.05] backdrop-blur-md"
                  placeholder="· · · · · · · ·"
                  autoFocus
                />

                {/* Typing indicator */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-[3px] items-center"
                  >
                    {Array.from({ length: Math.min(password.length, 6) }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-1 w-1 rounded-full bg-white/50"
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>

              <button type="submit" className="hidden" />
            </form>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.0, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />

            {/* Bottom hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 1 }}
              className="mt-6 text-center text-[10px] text-zinc-700 tracking-widest uppercase"
            >
              Enter ile giriş
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAuthenticating && [
        { top: 8, left: 8, borderL: true, borderT: true },
        { top: 8, right: 8, borderR: true, borderT: true },
        { bottom: 8, left: 8, borderL: true, borderB: true },
        { bottom: 8, right: 8, borderR: true, borderB: true }
      ].map((pos, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 1.3 + (i * 0.1), duration: 0.4 }}
          className="fixed h-16 w-16"
          style={{
            top: pos.top,
            left: pos.left,
            right: pos.right,
            bottom: pos.bottom,
            borderLeft: pos.borderL ? '2px solid white' : 'none',
            borderRight: pos.borderR ? '2px solid white' : 'none',
            borderTop: pos.borderT ? '2px solid white' : 'none',
            borderBottom: pos.borderB ? '2px solid white' : 'none',
          }}
        />
      ))}
    </div>
  )
}
