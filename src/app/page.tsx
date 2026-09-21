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

      <div className="max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-geist-sans)' }}>

        {/* ── Greeting ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-3">
              {DAY_NAMES[dayIndex]}, {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-[38px] font-bold text-white leading-none tracking-tight mb-1">
              Merhaba,
            </h1>
            <h1 className="text-[38px] font-bold leading-none tracking-tight"
              style={{
                background: 'linear-gradient(to bottom, #fff 0%, #71717a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              Metinc.
            </h1>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <p className="text-[9px] tracking-[0.4em] text-zinc-600 uppercase mb-3">19 Haziran 2027 Hedefi</p>
            <Countdown />
          </div>
        </motion.div>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent mb-8"
        />

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"
        >
          {[
            { label: 'Toplam Görev', value: totalItems },
            { label: 'Tamamlandı', value: doneItems  },
            { label: 'Kalan',      value: remaining  },
            { label: 'Başarı Oranı', value: `%${pct}` },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={s.value}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[28px] font-bold leading-none mb-1 text-white"
                >
                  {s.value}
                </motion.div>
              </AnimatePresence>
              <p className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Mini Wallet Analytics ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] tracking-[0.35em] text-emerald-500/70 uppercase mb-1">Bugünkü Gelir</p>
              <p className="text-[24px] font-bold text-emerald-400 leading-none">₺{todayIncome.toFixed(2)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] tracking-[0.35em] text-red-500/70 uppercase mb-1">Bugünkü Gider</p>
              <p className="text-[24px] font-bold text-red-400 leading-none">₺{todayExpense.toFixed(2)}</p>
            </div>
          </div>
          <div className={`rounded-xl border px-5 py-4 flex items-center justify-between ${totalBalance >= 0 ? 'border-white/[0.07] bg-white/[0.02]' : 'border-red-500/20 bg-red-500/[0.02]'}`}>
            <div>
              <p className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase mb-1">Toplam Kasa</p>
              <p className={`text-[24px] font-bold leading-none ${totalBalance >= 0 ? 'text-white' : 'text-red-400'}`}>₺{totalBalance.toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* ── Progress bar ────────────────────────────────────────────── */}
          {totalItems > 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-6 flex flex-col justify-center"
            >
              <div className="flex justify-between mb-3">
                <span className="text-[10px] text-white tracking-widest uppercase font-bold">Bugünkü İlerleme</span>
                <span className="text-[11px] font-bold text-white/80">%{pct}</span>
              </div>
              <div className="h-[4px] w-full rounded-full bg-white/[0.06] overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full bg-white/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                />
              </div>
              <p className="text-[9px] text-zinc-500 text-right">{doneItems} / {totalItems} görev</p>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-6 flex flex-col justify-center items-center text-center">
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">Bugün için görev yok</p>
            </div>
          )}

          {/* ── 7-Day Activity Chart ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-5"
          >
            <p className="text-[9px] tracking-[0.35em] text-zinc-500 uppercase mb-4">Aktivite Grafiği</p>
            <div className="flex items-end justify-between h-[60px] gap-2">
              {tasksByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="w-full bg-white/[0.03] rounded-t-sm flex items-end justify-center relative overflow-hidden" style={{ height: '100%' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.count / maxTasks) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                      className={`w-full ${i === 6 ? 'bg-white/90' : 'bg-white/40'}`}
                    />
                  </div>
                  <p className={`text-[8px] uppercase tracking-widest ${i === 6 ? 'text-white' : 'text-zinc-600'}`}>{d.date.slice(-2)}</p>
                </div>
              ))}
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase"
          style={{ fontFamily: 'var(--font-geist-sans)' }}>
          {title}
        </p>
        <span className="text-[10px] text-zinc-700">{count}</span>
      </div>
      <div className="space-y-[3px]">
        {children}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-6 text-center">
      <p className="text-[11px] tracking-widest text-zinc-700 uppercase"
        style={{ fontFamily: 'var(--font-geist-sans)' }}>
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
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-200
        ${done
          ? 'border-white/[0.05] bg-white/[0.02]'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
        }`}
    >
      {/* Accent bar */}
      {accent && (
        <div className="w-[3px] h-8 rounded-full flex-shrink-0 opacity-70"
          style={{ backgroundColor: accent }} />
      )}

      {/* Checkbox */}
      <div className={`flex-shrink-0 h-[18px] w-[18px] rounded-md border transition-all duration-200 flex items-center justify-center
        ${done
          ? 'border-white/40 bg-white/10'
          : 'border-white/20'
        }`}>
        <AnimatePresence>
          {done && (
            <motion.svg
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-2.5 h-2.5 text-white/70"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium leading-none transition-all duration-200
          ${done ? 'text-zinc-600 line-through' : 'text-white'}`}
          style={{ fontFamily: 'var(--font-geist-sans)' }}>
          {label}
        </p>
        {sub && (
          <p className="text-[11px] text-zinc-700 mt-1 leading-none"
            style={{ fontFamily: 'var(--font-geist-sans)' }}>
            {sub}
          </p>
        )}
      </div>

      {/* Meta */}
      <span className="text-[10px] tracking-widest text-zinc-700 uppercase flex-shrink-0"
        style={{ fontFamily: 'var(--font-geist-sans)' }}>
        {loading ? '...' : meta}
      </span>
    </motion.div>
  )
}
