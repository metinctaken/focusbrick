'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import Toast, { useToast } from '@/components/Toast'

interface ScheduleItem { id: string; subject: string; color: string }

function todayISO() { return new Date().toISOString().split('T')[0] }
function todayDayIndex() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

function formatTimeStr(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function TimerPage() {
  const [items, setItems]           = useState<ScheduleItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading]       = useState(true)
  const { toasts, toast, remove }   = useToast()

  const [time, setTime]                   = useState(0)
  const [isActive, setIsActive]           = useState(false)
  const [isPaused, setIsPaused]           = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isFullscreen, setIsFullscreen]   = useState(false)
  const [showHints, setShowHints]         = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { loadItems() }, [])

  // Timer tick
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => setTime(prev => prev + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isActive, isPaused])

  // document.title update
  useEffect(() => {
    const item = items.find(i => i.id === selectedId)
    if (isActive && !isPaused && item) {
      document.title = `${formatTimeStr(time)} — ${item.subject}`
    } else {
      document.title = 'Sayaç — FocusBrick'
    }
    return () => { document.title = 'FocusBrick' }
  }, [time, isActive, isPaused, selectedId, items])

  // Show hints when fullscreen activates
  useEffect(() => {
    if (isFullscreen) {
      setShowHints(true)
      const t = setTimeout(() => setShowHints(false), 3000)
      return () => clearTimeout(t)
    }
  }, [isFullscreen])

  // Keyboard shortcuts
  const handleStart  = useCallback(() => { if (!selectedId) { toast('Lütfen önce bir ders seçin', 'error'); return }; setIsActive(true); setIsPaused(false) }, [selectedId, toast])
  const handlePause  = useCallback(() => setIsPaused(true), [])
  const handleResume = useCallback(() => setIsPaused(false), [])
  const handleStop   = useCallback(() => { setIsPaused(true); setShowSaveModal(true) }, [])
  const handleReset  = useCallback(() => { setIsActive(false); setIsPaused(false); setTime(0); setShowSaveModal(false) }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'f' || e.key === 'F') setIsFullscreen(v => !v)
      if (e.key === ' ') {
        e.preventDefault()
        if (!isActive) handleStart()
        else if (isPaused) handleResume()
        else handlePause()
      }
      if ((e.key === 'r' || e.key === 'R') && isActive) handleReset()
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isActive, isPaused, isFullscreen, handleStart, handlePause, handleResume, handleReset])

  async function loadItems() {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('schedule_items')
      .select('id, subject, color')
      .eq('day_of_week', todayDayIndex())
      .order('start_time')
    if (data) { setItems(data); if (data.length > 0) setSelectedId(data[0].id) }
    setLoading(false)
  }

  async function handleSave() {
    if (!selectedId) return
    const hours = Number((time / 3600).toFixed(2))
    try {
      const sb = createClient()
      await sb.from('completions').delete()
        .eq('item_type', 'schedule').eq('item_id', selectedId).eq('completed_date', todayISO())
      const { error } = await sb.from('completions').insert({
        item_type: 'schedule', item_id: selectedId, completed_date: todayISO(), duration_hours: hours
      })
      if (error) throw error
      toast(`Başarıyla kaydedildi (${hours} saat)`, 'success')
      handleReset()
    } catch {
      toast('Kaydedilirken hata oluştu', 'error')
    }
  }

  const selectedItem = items.find(i => i.id === selectedId)
  const isRunning    = isActive && !isPaused
  const accentColor  = selectedItem?.color ?? '#ffffff'

  const h   = String(Math.floor(time / 3600)).padStart(2, '0')
  const m   = String(Math.floor((time % 3600) / 60)).padStart(2, '0')
  const s   = String(time % 60).padStart(2, '0')

  // ── Timer inner content (shared between normal and fullscreen)
  const timerDisplay = (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Subject pills — hide in fullscreen when running */}
      <AnimatePresence>
        {(!isFullscreen || !isRunning) && !loading && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex gap-2 flex-wrap justify-center mb-10"
          >
            {items.map(item => {
              const active = selectedId === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => !isActive && setSelectedId(item.id)}
                  disabled={isActive}
                  whileHover={{ scale: isActive ? 1 : 1.04 }}
                  whileTap={{ scale: isActive ? 1 : 0.96 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium tracking-wider uppercase transition-all border disabled:cursor-not-allowed
                    ${active ? 'text-white bg-white/[0.06]' : 'text-zinc-500 bg-white/[0.015] border-white/[0.06] hover:text-zinc-300'}`}
                  style={active ? { borderColor: `${item.color}50`, boxShadow: `0 0 18px ${item.color}18` } : {}}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color, opacity: active ? 1 : 0.5 }} />
                  {item.subject}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time display */}
      <div className="flex items-baseline gap-0 select-none mb-4" style={{ fontFamily: 'var(--font-orbitron)' }}>
        <motion.span
          animate={{ color: isRunning ? '#ffffff' : '#27272a' }}
          transition={{ duration: 0.7 }}
          className="font-bold tabular-nums leading-none"
          style={{ fontSize: isFullscreen ? 'clamp(100px, 18vw, 200px)' : 'clamp(72px, 14vw, 140px)', letterSpacing: '-0.03em' }}
        >
          {h}:{m}
        </motion.span>
        <motion.span
          animate={{ color: isRunning ? 'rgba(255,255,255,0.4)' : '#18181b' }}
          transition={{ duration: 0.7 }}
          className="font-bold tabular-nums leading-none self-end pb-1 md:pb-2"
          style={{ fontSize: isFullscreen ? 'clamp(48px, 8vw, 88px)' : 'clamp(36px, 6vw, 64px)', letterSpacing: '-0.03em' }}
        >
          :{s}
        </motion.span>
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2 mb-12">
        <motion.span
          className="h-[6px] w-[6px] rounded-full"
          animate={isRunning
            ? { backgroundColor: accentColor, scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }
            : isPaused
              ? { backgroundColor: '#f59e0b', scale: 1, opacity: 1 }
              : { backgroundColor: '#27272a', scale: 1, opacity: 1 }
          }
          transition={isRunning ? { duration: 1.4, repeat: Infinity } : { duration: 0.3 }}
        />
        <motion.p
          animate={{ color: isRunning ? 'rgba(255,255,255,0.3)' : isPaused ? 'rgba(245,158,11,0.7)' : '#3f3f46' }}
          className="text-[10px] tracking-[0.4em] uppercase font-medium"
        >
          {!isActive ? 'Hazır' : isPaused ? 'Duraklatıldı' : (selectedItem?.subject ?? 'Çalışıyor')}
        </motion.p>
      </div>

      {/* Controls */}
      <AnimatePresence mode="wait">
        {!isActive ? (
          <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <motion.button
              onClick={handleStart}
              disabled={!selectedId || items.length === 0}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-12 py-4 rounded-2xl bg-white text-black font-bold text-[11px] uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(255,255,255,0.08)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-20 disabled:shadow-none disabled:cursor-not-allowed transition-shadow"
            >
              <PlayIcon /> Çalışmaya Başla
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="controls" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-4">
            {isPaused
              ? <IconBtn onClick={handleResume} variant="primary" label="Devam Et"><PlayIcon /></IconBtn>
              : <IconBtn onClick={handlePause} variant="outline" label="Duraklat"><PauseIcon /></IconBtn>
            }
            <IconBtn onClick={handleStop} variant="danger" label="Bitir"><StopIcon /></IconBtn>
            <IconBtn onClick={handleReset} variant="ghost" label="Sıfırla"><ResetIcon /></IconBtn>
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[9px] tracking-[0.35em] text-zinc-700 uppercase mt-6">
          {Math.floor(time / 60)} dakika
        </motion.p>
      )}
    </div>
  )

  return (
    <DashboardLayout>
      <Toast toasts={toasts} remove={remove} />

      {/* ── Fullscreen Overlay ──────────────────────────────── */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            key="fullscreen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
          >
            {/* Ambient glow */}
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.07 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 40%, ${accentColor} 0%, transparent 60%)` }}
              />
            )}

            {/* Top accent line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[1px]"
              animate={{ opacity: isRunning ? 1 : 0 }}
              style={{ background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)` }}
            />

            {/* Exit button */}
            <motion.button
              onClick={() => setIsFullscreen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute top-6 right-6 w-10 h-10 rounded-xl border border-white/[0.08] flex items-center justify-center text-zinc-600 hover:text-white hover:border-white/20 transition-colors"
              title="Çıkış (ESC)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Keyboard hint overlay — appears briefly */}
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute bottom-8 flex items-center gap-6"
                >
                  {[['Space', 'Duraklat'], ['R', 'Sıfırla'], ['ESC', 'Çıkış']].map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[9px] tracking-widest text-zinc-500 font-mono">{key}</kbd>
                      <span className="text-[9px] tracking-widest text-zinc-700 uppercase">{label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 w-full flex flex-col items-center px-6">
              {timerDisplay}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Normal Mode ─────────────────────────────────────── */}
      <div className="w-full max-w-[860px] mx-auto" style={{ fontFamily: 'var(--font-geist-sans)' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Odaklanma</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Sayaç</h1>
          </div>
          {/* Fullscreen button */}
          <div className="flex items-center gap-3">
            {/* Keyboard hint */}
            <span className="hidden md:flex items-center gap-1.5 text-zinc-700">
              <kbd className="px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-[8px] tracking-widest font-mono">F</kbd>
              <span className="text-[9px] tracking-widest uppercase">Tam Ekran</span>
            </span>
            <motion.button
              onClick={() => setIsFullscreen(true)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-white hover:border-white/15 transition-colors text-[10px] tracking-widest uppercase"
            >
              <FullscreenIcon />
              <span className="hidden sm:inline">Tam Ekran</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}
          className="relative rounded-[2rem] border border-white/[0.05] bg-white/[0.01] overflow-hidden"
        >
          {/* Running glow */}
          <AnimatePresence>
            {isRunning && (
              <motion.div key="glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 50% 40%, ${accentColor}10 0%, transparent 65%)` }}
              />
            )}
          </AnimatePresence>
          <motion.div className="absolute top-0 left-0 right-0 h-[1px]"
            animate={{ opacity: isRunning ? 1 : 0 }} transition={{ duration: 0.8 }}
            style={{ background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)` }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 md:py-20">
            {loading ? (
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
                className="text-[10px] tracking-widest text-zinc-700 uppercase">Yükleniyor</motion.div>
            ) : items.length === 0 ? (
              <p className="text-[11px] tracking-widest text-zinc-700 uppercase mb-8">Bugün için programda ders bulunmuyor</p>
            ) : timerDisplay}
          </div>
        </motion.div>
      </div>

      {/* ── Save Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="bg-zinc-950 border border-white/[0.08] p-8 md:p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight">Çalışma Tamamlandı</h3>
              <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600 mb-3">Toplam Süre</p>
              <p className="text-[44px] font-bold text-emerald-400 leading-none mb-8" style={{ fontFamily: 'var(--font-orbitron)' }}>
                {formatTimeStr(time)}
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={handleSave}
                  className="w-full py-4 rounded-xl bg-white text-black text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-zinc-100 transition">
                  Süreyi Kaydet
                </button>
                <button onClick={handleReset}
                  className="w-full py-4 rounded-xl border border-white/[0.08] text-zinc-500 text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-white/[0.04] hover:text-zinc-300 transition">
                  Sil ve Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

// ── Icon Button ───────────────────────────────────────────────────────────────
function IconBtn({ onClick, variant, label, children }: { onClick: () => void; variant: 'primary'|'outline'|'danger'|'ghost'; label: string; children: React.ReactNode }) {
  const s = { primary:'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]', outline:'border border-white/20 text-white hover:bg-white/[0.06]', danger:'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20', ghost:'border border-white/[0.06] text-zinc-600 hover:text-zinc-300 hover:border-white/10' }
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button onClick={onClick} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${s[variant]}`}>
        {children}
      </motion.button>
      <span className="text-[8px] tracking-[0.25em] uppercase text-zinc-700">{label}</span>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function PlayIcon()       { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> }
function PauseIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> }
function StopIcon()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> }
function ResetIcon()      { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> }
function FullscreenIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> }
