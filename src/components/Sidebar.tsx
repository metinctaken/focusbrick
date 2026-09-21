'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV = [
  { href: '/',         label: 'Ana Sayfa',       icon: HomeIcon },
  { href: '/schedule', label: 'Ders Programı',   icon: CalendarIcon },
  { href: '/tasks',    label: 'Günlük Görevler', icon: CheckIcon },
  { href: '/wall',     label: 'Duvar',           icon: BrickIcon },
  { href: '/wallet',   label: 'Kasa',            icon: WalletIcon },
  { href: '/analytics',label: 'Analiz',          icon: ActivityIcon },
  { href: '/challenges',label: 'Zorluklar',      icon: ShieldIcon },
]

export default function Sidebar({ 
  isCollapsed, toggle 
}: { 
  isCollapsed?: boolean, toggle?: () => void 
}) {
  const path = usePathname()
  const router = useRouter()

  const width = isCollapsed ? 80 : 260

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen bg-zinc-950 border-r border-white/[0.06] flex-col z-50 transition-all duration-300`}
        style={{ width }}
      >
        {/* Logo */}
        <div className="px-7 py-8 border-b border-white/[0.05] relative flex items-center h-[85px]">
          <div className={`flex items-center gap-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 invisible absolute' : 'opacity-100'}`}>
            <motion.div
              className="h-[8px] w-[8px] rounded-full bg-white/70"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[13px] tracking-[0.4em] text-white/40 uppercase font-medium"
              style={{ fontFamily: 'var(--font-geist-sans)' }}>
              Focus
            </span>
          </div>
          <button onClick={toggle} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all outline-none">
            {isCollapsed ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5m-16.5 6h16.5" /></svg>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-6 space-y-1 ${isCollapsed ? 'px-3' : 'px-4'} overflow-y-auto`}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href}>
                <div className={`relative flex items-center gap-4 py-3.5 rounded-xl transition-all duration-200 group cursor-pointer
                  ${isCollapsed ? 'px-0 justify-center' : 'px-4'}
                  ${active ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}
                  title={isCollapsed ? label : ''}
                >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.08]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative w-[18px] h-[18px] flex-shrink-0" />
                {!isCollapsed && (
                  <span className="relative text-[13px] tracking-wide font-medium"
                    style={{ fontFamily: 'var(--font-geist-sans)' }}>
                    {label}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`pb-6 border-t border-white/[0.05] pt-4 space-y-1 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        {!isCollapsed && (
          <div className="px-4 py-2 mb-2">
            <p className="text-[11px] tracking-[0.4em] text-zinc-700 uppercase"
              style={{ fontFamily: 'var(--font-geist-sans)' }}>
              Metinc
            </p>
          </div>
        )}
        <button
          title={isCollapsed ? 'Çıkış' : ''}
          onClick={() => { sessionStorage.removeItem('authenticated'); router.push('/login') }}
          className={`w-full flex items-center gap-4 py-3.5 rounded-xl text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.02] transition-all duration-200 group ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
        >
          <LogoutIcon className="w-[18px] h-[18px]" />
          {!isCollapsed && (
            <span className="text-[13px] tracking-wide"
              style={{ fontFamily: 'var(--font-geist-sans)' }}>
              Çıkış
            </span>
          )}
        </button>
      </div>
    </aside>
      
      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-zinc-950/95 backdrop-blur-md border-t border-white/[0.06] z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 transition-all ${active ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`}>
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-500'}`} />
              <span className={`text-[8px] font-bold tracking-widest uppercase ${active ? 'text-white' : 'text-zinc-500'}`}>
                {label.split(' ')[0]} {/* Shortened name */}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
function BrickIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  )
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
    </svg>
  )
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1 0-6h3.75m-15 0H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  )
}
