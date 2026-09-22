'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import Countdown from '@/components/Countdown'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleItem {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject: string
  description: string
  color: string
}

interface DailyHabit {
  id: string
  name: string
  description: string
  category: string
  is_active: boolean
}

interface Completion {
  id: string
  item_type: 'schedule' | 'habit'
  item_id: string
  completed_date: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split('T')[0] }
function todayDayIndex() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

const CATEGORY_LABELS: Record<string, string> = {
  sport: 'Spor', health: 'Sağlık', study: 'Çalışma', general: 'Genel'
}

function getGreeting(): { salutation: string; subtext: string } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)  return { salutation: 'Günaydın',       subtext: 'Harika bir gün seni bekliyor.' }
  if (h >= 12 && h < 17) return { salutation: 'İyi Öğleden Sonralar', subtext: 'Günün ortasındasın, devam et.' }
  if (h >= 17 && h < 21) return { salutation: 'İyi Akşamlar',    subtext: 'Günü iyi kapattın mı?' }
  return                          { salutation: 'İyi Geceler',    subtext: 'Dinlenme vakti yaklaşıyor.' }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [habits, setHabits]               = useState<DailyHabit[]>([])
  const [completions, setCompletions]     = useState<Completion[]>([])
  const [transactions, setTransactions]   = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [togglingId, setTogglingId]       = useState<string | null>(null)
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null)
  const [durationInput, setDurationInput] = useState('')

  const dayIndex = todayDayIndex()
  const todayDate = todayISO()
  const { salutation, subtext } = getGreeting()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const sb = createClient()
    
    // Get date 7 days ago
    const d7 = new Date()
    d7.setDate(d7.getDate() - 6)
    const sevenDaysAgo = d7.toISOString().split('T')[0]

    const [{ data: schData }, { data: habData }, { data: compData }, { data: txData }] = await Promise.all([
      sb.from('schedule_items').select('*').eq('day_of_week', dayIndex).order('start_time'),
      sb.from('daily_habits').select('*').eq('is_active', true).order('sort_order'),
      sb.from('completions').select('*').gte('completed_date', sevenDaysAgo),
      sb.from('wallet_transactions').select('*')
    ])
    setScheduleItems(schData ?? [])
    setHabits(habData ?? [])
    setCompletions(compData ?? [])
    setTransactions(txData ?? [])
    setLoading(false)
  }

  const todayCompletions = completions.filter(c => c.completed_date === todayDate)

  const isCompleted = (type: 'schedule' | 'habit', id: string) =>
    todayCompletions.some(c => c.item_type === type && c.item_id === id)

  async function toggle(type: 'schedule' | 'habit', id: string) {
    if (togglingId === id) return
    const done = isCompleted(type, id)
    
    if (type === 'schedule' && !done) {
      setPendingScheduleId(id)
      setDurationInput('')
      setShowDurationModal(true)
      return
    }

    setTogglingId(id)
    const sb = createClient()
    if (done) {
      await sb.from('completions').delete().eq('item_type', type).eq('item_id', id).eq('completed_date', todayDate)
    } else {
      await sb.from('completions').insert({ item_type: type, item_id: id, completed_date: todayDate, duration_hours: 0 })
    }
    await loadAll()
    setTogglingId(null)
  }

  async function saveDuration() {
    if (!pendingScheduleId) return
    const id = pendingScheduleId
    setShowDurationModal(false)
    setPendingScheduleId(null)
    setTogglingId(id)
    const sb = createClient()
    const hours = parseFloat(durationInput.replace(',', '.')) || 0
    await sb.from('completions').insert({ item_type: 'schedule', item_id: id, completed_date: todayDate, duration_hours: hours })
    await loadAll()
    setTogglingId(null)
  }

  const totalItems   = scheduleItems.length + habits.length
  const doneItems    = todayCompletions.filter(c => c.item_type === 'schedule' || c.item_type === 'habit').length
  const remaining    = Math.max(0, totalItems - doneItems)
  const pct          = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0
  const totalBalance = transactions.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)
  const todayIncome  = transactions.filter(t => t.type === 'income' && t.created_at?.startsWith(todayDate)).reduce((a, t) => a + t.amount, 0)
  const todayExpense = transactions.filter(t => t.type === 'expense' && t.created_at?.startsWith(todayDate)).reduce((a, t) => a + t.amount, 0)

  // 7-day activity graph data
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const tasksByDay = last7Days.map(date => ({
    date,
    count: completions.filter(c => c.completed_date === date && (c.item_type === 'schedule' || c.item_type === 'habit')).length
  }))
  const maxTasks = Math.max(...tasksByDay.map(t => t.count), 1)

  return (
    <DashboardLayout>
      <AnimatePresence>
        {showDurationModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={() => setShowDurationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-zinc-950 border border-white/[0.07] rounded-2xl p-6"
            >
              <p className="text-[10px] tracking-[0.4em] text-zinc-500 uppercase mb-6 text-center">Çalışma Süresi</p>
              <p className="text-white text-center mb-6 text-sm">Bu derse/konuya kaç saat ayırdın?</p>
              <input
                type="number"
                step="0.5"
                min="0"
                value={durationInput}
                onChange={e => setDurationInput(e.target.value)}
                placeholder="Örn: 2.5"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-center text-xl outline-none focus:border-white/20 mb-6"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveDuration()}
              />
              <button
                onClick={saveDuration}
                className="w-full bg-white text-black py-3 rounded-xl text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-zinc-200 transition-colors"
              >
                Kaydet
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[1400px] mx-auto" style={{ fontFamily: 'var(--font-geist-sans)' }}>

        {/* ── Greeting ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <p className="text-[10px] tracking-[0.4em] text-zinc-400 uppercase">
                  {DAY_NAMES[dayIndex]}, {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              <h1 className="text-[36px] md:text-[44px] font-bold text-white leading-none tracking-tight mb-2">
                {salutation},
              </h1>
              <h1 className="text-[36px] md:text-[44px] font-bold leading-none tracking-tight"
                style={{
                  background: 'linear-gradient(to bottom, #fff 0%, #52525b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                Metinc.
              </h1>
            </div>

            <div className="flex flex-col items-start md:items-end bg-black/40 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] tracking-[0.4em] text-zinc-500 uppercase mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                19 Haziran 2027 Hedefi
              </p>
              <Countdown />
            </div>
          </div>
        </motion.div>

        {/* ── Stats & Wallet Row ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 xl:grid-cols-7 gap-3 mb-6"
        >
          {/* Task Stats */}
          <div className="xl:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Toplam', value: totalItems },
              { label: 'Biten',  value: doneItems  },
              { label: 'Kalan',  value: remaining  },
              { label: 'Başarı', value: `%${pct}`  },
            ].map((s, i) => (
              <div key={i} className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 overflow-hidden">
                <div className="absolute top-0 left-4 right-4 h-[1px] bg-white/[0.08] rounded-full" />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={s.value}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-[28px] font-bold leading-none text-white mb-3 tabular-nums"
                  >
                    {s.value}
                  </motion.p>
                </AnimatePresence>
                <p className="text-[9px] tracking-[0.32em] text-zinc-600 uppercase">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Wallet Stats */}
          <div className="xl:col-span-3 grid grid-cols-3 gap-3">
            <div className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 overflow-hidden">
              <div className="absolute top-0 left-4 right-4 h-[1px] bg-emerald-500/30 rounded-full" />
              <p className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-3">Gelir</p>
              <p className="text-[20px] font-bold text-emerald-400 leading-none tabular-nums">₺{todayIncome.toFixed(0)}</p>
            </div>
            <div className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 overflow-hidden">
              <div className="absolute top-0 left-4 right-4 h-[1px] bg-red-500/30 rounded-full" />
              <p className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-3">Gider</p>
              <p className="text-[20px] font-bold text-red-400 leading-none tabular-nums">₺{todayExpense.toFixed(0)}</p>
            </div>
            <div className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] px-5 py-4 overflow-hidden">
              <div className={`absolute top-0 left-4 right-4 h-[1px] rounded-full ${totalBalance >= 0 ? 'bg-white/[0.08]' : 'bg-red-500/30'}`} />
              <p className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-3">Kasa</p>
              <p className={`text-[20px] font-bold leading-none tabular-nums ${totalBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                ₺{totalBalance.toFixed(0)}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {/* ── Progress ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] px-6 py-5 overflow-hidden"
          >
            <div className="absolute top-0 left-4 right-4 h-[1px] bg-white/[0.06] rounded-full" />
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase mb-2">Bugünkü İlerleme</p>
                <p className="text-[32px] font-bold text-white leading-none tabular-nums">%{pct}</p>
              </div>
              <span className="text-[10px] text-zinc-700 tracking-widest mt-1">{doneItems} / {totalItems}</span>
            </div>
            {/* Track */}
            <div className="h-[3px] w-full rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white/80"
                initial={{ width: 0 }}
                animate={{ width: totalItems > 0 ? `${pct}%` : '0%' }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                style={{ boxShadow: pct > 0 ? '0 0 8px rgba(255,255,255,0.3)' : 'none' }}
              />
            </div>
            {totalItems === 0 && (
              <p className="text-[10px] text-zinc-700 tracking-[0.3em] uppercase mt-2">Bugün görev yok</p>
            )}
          </motion.div>

          {/* ── 7-Day Activity Chart ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative rounded-2xl border border-white/[0.05] bg-white/[0.01] px-6 py-5 overflow-hidden"
          >
            <div className="absolute top-0 left-4 right-4 h-[1px] bg-white/[0.06] rounded-full" />
            <p className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase mb-5">7 Günlük Aktivite</p>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 56 }}>
              {tasksByDay.map((d, i) => {
                const isToday = i === 6
                const heightPct = maxTasks > 0 ? (d.count / maxTasks) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                    <div className="w-full flex items-end justify-center rounded-sm overflow-hidden" style={{ height: '100%', background: 'rgba(255,255,255,0.02)' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
                        className={`w-full rounded-sm ${isToday ? 'bg-white/90' : 'bg-white/25'}`}
                        style={isToday ? { boxShadow: '0 0 8px rgba(255,255,255,0.2)' } : {}}
                      />
                    </div>
                    <p className={`text-[8px] uppercase tracking-widest leading-none ${isToday ? 'text-white font-bold' : 'text-zinc-700'}`}>
                      {d.date.slice(-2)}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-3 py-12 justify-center">
            <motion.div
              className="h-1 w-1 rounded-full bg-zinc-600"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="h-1 w-1 rounded-full bg-zinc-600"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="h-1 w-1 rounded-full bg-zinc-600"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        )}

        {!loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-8"
          >
            {/* ── Today's Classes ───────────────────────────────────── */}
            <Section title="Bugünün Dersleri" count={scheduleItems.length}>
              {scheduleItems.length === 0 ? (
                <EmptyState text="Bugün ders yok" />
              ) : (
                scheduleItems.map((item, i) => (
                  <TaskRow
                    key={item.id}
                    index={i}
                    done={isCompleted('schedule', item.id)}
                    loading={togglingId === item.id}
                    onClick={() => toggle('schedule', item.id)}
                    accent={item.color}
                    label={item.subject}
                    meta={`${item.start_time} – ${item.end_time}`}
                    sub={item.description || undefined}
                  />
                ))
              )}
            </Section>

            {/* ── Daily Habits ──────────────────────────────────────── */}
            <Section title="Günlük Görevler" count={habits.length}>
              {habits.length === 0 ? (
                <EmptyState text="Henüz görev eklenmedi" />
              ) : (
                habits.map((habit, i) => (
                  <TaskRow
                    key={habit.id}
                    index={i}
                    done={isCompleted('habit', habit.id)}
                    loading={togglingId === habit.id}
                    onClick={() => toggle('habit', habit.id)}
                    label={habit.name}
                    meta={CATEGORY_LABELS[habit.category] ?? habit.category}
                    sub={habit.description || undefined}
                  />
                ))
              )}
            </Section>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-[9px] tracking-[0.4em] text-zinc-600 uppercase" style={{ fontFamily: 'var(--font-geist-sans)' }}>
          {title}
        </p>
        <div className="flex-1 h-[1px] bg-white/[0.04]" />
        <span className="text-[9px] text-zinc-700 tabular-nums">{count}</span>
      </div>
      <div className="space-y-[2px]">
        {children}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.06] px-5 py-5 text-center">
      <p className="text-[10px] tracking-[0.3em] text-zinc-700 uppercase" style={{ fontFamily: 'var(--font-geist-sans)' }}>
        {text}
      </p>
    </div>
  )
}

function TaskRow({
  index, done, loading, onClick, label, meta, sub, accent
}: {
  index: number
  done: boolean
  loading: boolean
  onClick: () => void
  label: string
  meta: string
  sub?: string
  accent?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`relative group flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 overflow-hidden
        ${done
          ? 'border-white/[0.04] bg-transparent'
          : 'border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] hover:bg-white/[0.03]'
        }`}
    >
      {/* Ripple effect overlay on tap */}
      <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-[0.02] transition-opacity duration-75" />

      {/* Accent dot */}
      {accent ? (
        <span
          className="w-[5px] h-[5px] rounded-full flex-shrink-0 transition-opacity duration-200 relative z-10"
          style={{ backgroundColor: accent, opacity: done ? 0.25 : 0.75 }}
        />
      ) : (
        <span className="w-[5px] h-[5px] rounded-full flex-shrink-0 bg-zinc-700 relative z-10" />
      )}

      {/* Checkbox */}
      <div className={`relative z-10 flex-shrink-0 h-[16px] w-[16px] rounded-[4px] border transition-all duration-200 flex items-center justify-center
        ${done ? 'border-white/25 bg-white/[0.08]' : 'border-white/[0.12] group-hover:border-white/25'}`}
      >
        <AnimatePresence>
          {done && (
            <motion.svg
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="w-2 h-2 text-white/50"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 relative z-10">
        <p className={`text-[13px] font-medium leading-none transition-all duration-200
          ${done ? 'text-zinc-600 line-through decoration-zinc-700' : 'text-zinc-200 group-hover:text-white'}`}
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          {label}
        </p>
        {sub && (
          <p className="text-[10px] text-zinc-700 mt-1.5 leading-none transition-colors group-hover:text-zinc-500" style={{ fontFamily: 'var(--font-geist-sans)' }}>
            {sub}
          </p>
        )}
      </div>

      {/* Meta */}
      <span className={`relative z-10 text-[9px] tracking-[0.25em] uppercase flex-shrink-0 transition-colors duration-200 ${done ? 'text-zinc-700' : 'text-zinc-500 group-hover:text-zinc-400'}`}
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        {loading ? (
          <span className="flex gap-0.5">
            <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }}>.</motion.span>
            <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}>.</motion.span>
            <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}>.</motion.span>
          </span>
        ) : meta}
      </span>
    </motion.div>
  )
}
