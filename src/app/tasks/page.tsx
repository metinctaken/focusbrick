'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import Toast, { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

interface DailyHabit {
  id: string
  name: string
  description: string
  category: string
  is_active: boolean
  sort_order: number
}

interface Completion {
  id: string
  item_type: string
  item_id: string
  completed_date: string
}

const CATEGORIES = [
  { value: 'sport',   label: 'Spor',     color: '#f97316' }, // orange-500
  { value: 'health',  label: 'Sağlık',   color: '#22c55e' }, // green-500
  { value: 'study',   label: 'Çalışma',  color: '#3b82f6' }, // blue-500
  { value: 'general', label: 'Genel',    color: '#ffffff' }, // white
]

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

function calculateStreak(completions: Completion[]) {
  const habitComps = completions.filter(c => c.item_type === 'habit')
  const dates = [...new Set(habitComps.map(c => c.completed_date))].sort().reverse()
  if (!dates.length) return 0
  
  let streak = 0
  const today = todayISO()
  let current = new Date(today)
  
  if (dates[0] === today) {
    // starts today
  } else {
    current.setDate(current.getDate() - 1)
    if (dates[0] === current.toISOString().split('T')[0]) {
      // starts yesterday
    } else {
      return 0
    }
  }

  for (const date of dates) {
    const expected = current.toISOString().split('T')[0]
    if (date === expected) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export default function TasksPage() {
  const [habits, setHabits]           = useState<DailyHabit[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const { toasts, toast, remove }     = useToast()
  
  const [showBrickToast, setShowBrickToast] = useState(false)

  const [fName, setFName] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fCat,  setFCat]  = useState('general')

  const todayDate = todayISO()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const sb = createClient()
      const [{ data: h, error: he }, { data: c, error: ce }] = await Promise.all([
        sb.from('daily_habits').select('*').eq('is_active', true).order('sort_order'),
        sb.from('completions').select('*').in('item_type', ['habit', 'wall_complete']),
      ])
      if (he) throw he
      if (ce) throw ce
      setHabits(h ?? [])
      setCompletions(c ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(`Yükleme hatası: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const todayHabitCompletions = completions.filter(c => c.completed_date === todayDate && c.item_type === 'habit')
  const isDone = (id: string) => todayHabitCompletions.some(c => c.item_id === id)
  
  const doneCount = todayHabitCompletions.length
  const total     = habits.length
  const allDone = doneCount === total && total > 0

  async function toggleHabit(id: string, name: string) {
    if (togglingId) return
    setTogglingId(id)
    try {
      const sb = createClient()
      const currentlyDone = isDone(id)
      
      if (currentlyDone) {
        const { error } = await sb.from('completions').delete()
          .eq('item_type', 'habit').eq('item_id', id).eq('completed_date', todayDate)
        if (error) throw error
        toast(`"${name}" geri alındı`, 'info')
      } else {
        const { error } = await sb.from('completions')
          .insert({ item_type: 'habit', item_id: id, completed_date: todayDate })
        if (error) throw error
        toast(`"${name}" tamamlandı!`, 'success')
        
        // Check if this makes all habits done
        const newDoneCount = doneCount + 1
        if (newDoneCount === total && total > 0) {
          const hasBrick = completions.some(c => c.item_type === 'wall_complete' && c.item_id === 'daily' && c.completed_date === todayDate)
          if (!hasBrick) {
            await sb.from('completions').insert({ item_type: 'wall_complete', item_id: 'daily', completed_date: todayDate })
            setShowBrickToast(true)
            setTimeout(() => setShowBrickToast(false), 4000)
          }
        }
      }
      await loadAll()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(`Hata: ${msg}`, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function saveHabit() {
    if (!fName.trim()) { toast('Görev adı boş olamaz', 'error'); return }
    setSaving(true)
    try {
      const { error } = await createClient().from('daily_habits').insert({
        name: fName.trim(), description: fDesc.trim(),
        category: fCat, is_active: true, sort_order: habits.length,
      })
      if (error) throw error
      await loadAll()
      setShowModal(false)
      setFName(''); setFDesc(''); setFCat('general')
      toast(`"${fName.trim()}" eklendi`, 'success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(`Kayıt hatası: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteHabit(id: string, name: string) {
    if (!confirm(`"${name}" silinsin mi? Geçmiş kayıtları da silinir.`)) return
    setDeletingId(id)
    try {
      const sb = createClient()
      const [{ error: ce }, { error: he }] = await Promise.all([
        sb.from('completions').delete().eq('item_type', 'habit').eq('item_id', id),
        sb.from('daily_habits').delete().eq('id', id),
      ])
      if (ce) throw ce
      if (he) throw he
      await loadAll()
      toast(`"${name}" silindi`, 'info')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast(`Silme hatası: ${msg}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const streak = calculateStreak(completions)

  return (
    <DashboardLayout>
      <Toast toasts={toasts} remove={remove} />
      
      <AnimatePresence>
        {showBrickToast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-zinc-950 border border-white/20 rounded-xl px-5 py-3 shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-white">
              Tuğla Eklendi
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontFamily: 'var(--font-geist-sans)' }} className="max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Tekrarlayan</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Günlük Görevler</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-[11px] tracking-[0.3em] uppercase text-white transition-all duration-200 hover:bg-white hover:text-black"
          >
            + Görev Ekle
          </button>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"
        />

        {/* Progress & Streak */}
        {total > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
            <div className="flex justify-between items-end mb-3">
              <span className="text-[10px] tracking-widest text-zinc-500 uppercase">Bugün</span>
              <span className="text-[12px] font-medium text-white">{doneCount} <span className="text-zinc-500">/ {total}</span></span>
            </div>
            <div className="h-[3px] rounded-full bg-white/10 overflow-hidden mb-3">
              <motion.div
                className="h-full bg-white/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] tracking-widest text-zinc-500 uppercase">
                {streak > 0 ? `${streak} gün serisi` : 'Seri yok'}
              </span>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <p className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Yükleniyor</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-[4px]">
            {habits.length === 0 && (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] py-12 text-center">
                <p className="text-[11px] tracking-widest text-zinc-700 uppercase">Henüz görev yok</p>
                <p className="text-[10px] text-zinc-800 mt-2">Sağ üstten ekleyebilirsin</p>
              </div>
            )}
            {habits.map((habit, i) => {
              const done    = isDone(habit.id)
              const catInfo = CATEGORIES.find(c => c.value === habit.category) ?? CATEGORIES[3]
              const toggling = togglingId === habit.id
              
              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={`group flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300
                    ${done ? 'border-white/[0.05] bg-white/[0.01]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-opacity ${done ? 'opacity-40' : 'opacity-100'}`} style={{ backgroundColor: catInfo.color }} />

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !toggling && toggleHabit(habit.id, habit.name)}>
                    <p className={`text-[14px] font-medium transition-all duration-300 ${done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {habit.name}
                    </p>
                    {habit.description && (
                      <p className={`text-[11px] mt-0.5 transition-all duration-300 ${done ? 'text-zinc-700' : 'text-zinc-400'}`}>{habit.description}</p>
                    )}
                  </div>

                  <span className="text-[9px] tracking-widest text-zinc-600 uppercase flex-shrink-0 border border-white/5 rounded-full px-2 py-0.5 bg-white/[0.02]">
                    {catInfo.label}
                  </span>

                  <div className="flex items-center gap-3">
                    {/* Toggle checkbox */}
                    <button
                      onClick={() => !toggling && toggleHabit(habit.id, habit.name)}
                      disabled={!!togglingId}
                      className={`flex-shrink-0 h-[22px] w-[22px] rounded-md border transition-all duration-300 flex items-center justify-center
                        ${done ? 'border-white/30 bg-white/10' : 'border-white/20 hover:border-white/50 bg-white/5'}`}
                    >
                      <AnimatePresence>
                        {toggling && (
                          <motion.span key="spin"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                            className="text-[10px] text-zinc-400 inline-block"
                          >◌</motion.span>
                        )}
                        {!toggling && done && (
                          <motion.svg key="check"
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={3.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteHabit(habit.id, habit.name)}
                      disabled={deletingId === habit.id}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all duration-150 text-[18px] leading-none w-5 text-center flex items-center justify-center"
                    >
                      {deletingId === habit.id ? '·' : '×'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !saving && setShowModal(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm mx-4 rounded-3xl border border-white/[0.1] bg-zinc-950 p-7 shadow-2xl"
              style={{ fontFamily: 'var(--font-geist-sans)' }}
            >
              <p className="text-[10px] tracking-[0.4em] text-zinc-500 uppercase mb-6">Yeni Görev</p>
              <div className="space-y-5">
                <ModalField label="Görev Adı">
                  <input value={fName} onChange={e => setFName(e.target.value)}
                    className={INPUT_CLS} placeholder="Örn: 30 dk egzersiz" autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveHabit()} />
                </ModalField>
                <ModalField label="Açıklama (opsiyonel)">
                  <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                    className={INPUT_CLS} placeholder="Detay..." />
                </ModalField>
                <ModalField label="Kategori">
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.value} onClick={() => setFCat(c.value)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-[11px] transition-all duration-200
                          ${fCat === c.value ? 'bg-white/10 text-white' : 'border-white/[0.05] text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                        style={fCat === c.value ? { borderColor: c.color } : {}}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="tracking-wide font-medium">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </ModalField>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 py-3.5 text-[10px] tracking-[0.3em] uppercase text-zinc-500 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30">
                  İptal
                </button>
                <button onClick={saveHabit} disabled={saving}
                  className="flex-1 rounded-xl border border-white/20 py-3.5 text-[10px] tracking-[0.3em] uppercase text-black bg-white hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-bold">
                  {saving ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="inline-block text-black">◌</motion.span>
                      Kaydediliyor
                    </>
                  ) : 'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

const INPUT_CLS = 'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-zinc-600 outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all'

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-2 text-[10px] tracking-[0.3em] text-zinc-500 uppercase">{label}</label>
      {children}
    </div>
  )
}
