'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import { motion, AnimatePresence } from 'framer-motion'

const PAGE_NAMES: Record<string, string> = {
  '/':           'Ana Sayfa',
  '/timer':      'Sayaç',
  '/schedule':   'Ders Programı',
  '/tasks':      'Günlük Görevler',
  '/wall':       'Duvar',
  '/wallet':     'Kasa',
  '/analytics':  'Analiz',
  '/challenges': 'Zorluklar',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCollapsed, setIsCollapsed]         = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const auth = sessionStorage.getItem('authenticated')
    if (auth !== 'true') router.push('/login')
    else setIsAuthenticated(true)
  }, [router])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          Yükleniyor
        </motion.div>
      </div>
    )
  }

  const sidebarWidth  = isCollapsed ? 80 : 260
  const activePageName = PAGE_NAMES[pathname] ?? ''

  return (
    <div className="flex min-h-screen bg-black w-full overflow-x-hidden">
      <Sidebar
        isCollapsed={isCollapsed}
        toggle={() => setIsCollapsed(!isCollapsed)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <CommandPalette />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 responsive-main">
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 768px) {
            .responsive-main { margin-left: ${sidebarWidth}px !important; }
          }
        `}} />

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-black/90 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-white/30"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] tracking-[0.4em] text-white/50 uppercase font-medium"
                style={{ fontFamily: 'var(--font-geist-sans)' }}
              >
                {activePageName || 'Focus'}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="text-white/50 hover:text-white transition-colors p-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></svg>
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-white/50 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h16.5" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page content with route-change animation */}
        <main className="flex-1 p-4 md:p-8 lg:p-12 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
