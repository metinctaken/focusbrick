'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { motion, AnimatePresence } from 'framer-motion'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const auth = sessionStorage.getItem('authenticated')
    if (auth !== 'true') {
      router.push('/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase animate-pulse"
          style={{ fontFamily: 'var(--font-geist-sans)' }}>
          Yükleniyor
        </div>
      </div>
    )
  }

  const sidebarWidth = isCollapsed ? 80 : 260

  return (
    <div className="flex min-h-screen bg-black w-full overflow-x-hidden">
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggle={() => setIsCollapsed(!isCollapsed)} 
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300" 
           style={{ marginLeft: 0 }}>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 768px) {
            .responsive-main { margin-left: ${sidebarWidth}px !important; }
          }
        `}} />

        {/* Mobile top safe area header */}
        <header className="md:hidden flex items-center justify-center px-6 py-4 border-b border-white/[0.05] bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
          <span className="text-[10px] tracking-[0.5em] text-white/50 uppercase font-medium">Focus</span>
        </header>

        {/* padding bottom 24 (96px) to clear the bottom nav on mobile */}
        <main className="flex-1 p-4 pb-24 md:p-10 md:pb-10 w-full responsive-main transition-all duration-300 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
