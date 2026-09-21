'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import Toast, { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

interface ScheduleItem {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject: string
  description: string
  color: string
}

const DAYS       = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const DAYS_SHORT = ['Pzt',       'Sal',  'Çar',      'Per',      'Cum',  'Cmt',       'Paz']
const COLORS     = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316']

function todayDayIndex() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }

export default function SchedulePage() {
  const [items, setItems]         = useState<ScheduleItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const { toasts, toast, remove } = useToast()

  const [fDay,   setFDay]   = useState(0)
  const [fStart, setFStart] = useState('09:00')
  const [fEnd,   setFEnd]   = useState('10:30')
  const [fSubj,  setFSubj]  = useState('')
  const [fDesc,  setFDesc]  = useState('')
  const [fColor, setFColor] = useState(COLORS[0])

  const today = todayDayIndex()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await createClient()
        .from('schedule_items').select('*')
        .order('day_of_week').order('start_time')
      if (error) throw error
      setItems(data ?? [])
    } catch {
      toast('Veriler yüklenemedi', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!fSubj.trim()) { toast('Ders adı boş olamaz', 'error'); return }
    if (fStart >= fEnd) { toast('Bitiş saati başlangıçtan sonra olmalı', 'error'); return }
    setSaving(true)
    try {
      const { error } = await createClient().from('schedule_items').insert({
        day_of_week: fDay, start_time: fStart, end_time: fEnd,
        subject: fSubj.trim(), description: fDesc.trim(), color: fColor,
      })
      if (error) throw error
      await load()
      setShowModal(false)
      setFSubj(''); setFDesc('')
      toast(`"${fSubj.trim()}" eklendi`, 'success')
    } catch {
      toast('Kayıt başarısız — Supabase bağlantısını kontrol et', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string, name: string) {
    if (!confirm(`"${name}" silinsin mi?`)) return
    setDeleting(id)
    try {
      const { error } = await createClient().from('schedule_items').delete().eq('id', id)
      if (error) throw error
      await load()
      toast(`"${name}" silindi`, 'info')
    } catch {
      toast('Silme başarısız', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const byDay = Array.from({ length: 7 }, (_, i) => items.filter(x => x.day_of_week === i))

  return (
    <DashboardLayout>
      <Toast toasts={toasts} remove={remove} />
      <div style={{ fontFamily: 'var(--font-geist-sans)' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Haftalık Çizelge</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Ders Programı</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-[11px] tracking-[0.3em] uppercase text-white transition-all duration-200 hover:bg-white hover:text-black"
          >
            + Ders Ekle
          </button>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <p className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Yükleniyor</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {DAYS.map((_, i) => {
                const isToday  = i === today
                const dayItems = byDay[i]
                return (
                  <div key={i}
                    onClick={() => { setFDay(i); setShowModal(true) }}
                    className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-300 group
                      ${isToday ? 'bg-white/[0.03] border border-white/[0.15] shadow-2xl shadow-white/[0.02]' : 'bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.1]'}`}
                  >
                    {isToday && (
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    )}
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className={`text-[12px] font-bold tracking-widest uppercase
                          ${isToday ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'}`}>
                          {DAYS[i]}
                        </p>
                        {isToday && <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Bugün</p>}
                      </div>
                      <div className="h-6 w-6 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white/50 text-[14px]">+</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dayItems.length === 0 && (
                        <div className="h-[80px] flex items-center justify-center border border-dashed border-white/[0.05] rounded-xl">
                          <p className="text-[10px] text-zinc-700 tracking-widest uppercase">Boş</p>
                        </div>
                      )}
                      {dayItems.map((item, j) => (
                        <motion.div key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: j * 0.05 }}
                          className="group/item relative rounded-xl p-3 border border-white/[0.05] bg-zinc-950/50 backdrop-blur-md hover:border-white/20 transition-all"
                        >
                          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ backgroundColor: item.color }} />
                          <div className="pl-3">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-[12px] font-semibold text-white/90 leading-tight pr-4">{item.subject}</p>
                            </div>
                            <p className="text-[10px] text-zinc-500 tracking-widest font-mono mb-1.5">{item.start_time} - {item.end_time}</p>
                            {item.description && (
                              <p className="text-[10px] text-zinc-600 leading-snug">{item.description}</p>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); del(item.id, item.subject) }}
                            disabled={deleting === item.id}
                            className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/item:opacity-100 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-5 text-[10px] text-zinc-700 tracking-widest text-right uppercase">
              {items.length} ders
            </p>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !saving && setShowModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm mx-4 rounded-2xl border border-white/[0.1] bg-zinc-950 p-7"
              style={{ fontFamily: 'var(--font-geist-sans)' }}
            >
              <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase mb-6">Ders Ekle</p>
              <div className="space-y-4">
                <ModalField label="Gün">
                  <select value={String(fDay)} onChange={e => setFDay(Number(e.target.value))} className={SELECT_CLS}>
                    {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
                  </select>
                </ModalField>
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Başlangıç">
                    <input type="time" value={fStart} onChange={e => setFStart(e.target.value)} className={INPUT_CLS} />
                  </ModalField>
                  <ModalField label="Bitiş">
                    <input type="time" value={fEnd} onChange={e => setFEnd(e.target.value)} className={INPUT_CLS} />
                  </ModalField>
                </div>
                <ModalField label="Ders Adı">
                  <input value={fSubj} onChange={e => setFSubj(e.target.value)}
                    className={INPUT_CLS} placeholder="Matematik" autoFocus
                    onKeyDown={e => e.key === 'Enter' && save()} />
                </ModalField>
                <ModalField label="Not (opsiyonel)">
                  <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                    className={INPUT_CLS} placeholder="Konu, öğretmen..." />
                </ModalField>
                <ModalField label="Renk">
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setFColor(c)}
                        className={`h-6 w-6 rounded-full transition-all duration-150 ${fColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-950 scale-110' : 'opacity-70 hover:opacity-100'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </ModalField>
              </div>
              <div className="h-px bg-white/[0.06] my-6" />
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-[10px] tracking-[0.3em] uppercase text-zinc-600 hover:text-white transition-colors disabled:opacity-30">
                  İptal
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-1 rounded-xl border border-white/20 py-3 text-[10px] tracking-[0.3em] uppercase text-white hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="inline-block">◌</motion.span>
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

const INPUT_CLS  = 'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[12px] text-white placeholder-zinc-700 outline-none focus:border-white/20 transition-all'
const SELECT_CLS = 'w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-[12px] text-white outline-none focus:border-white/20 transition-all'

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">{label}</label>
      {children}
    </div>
  )
}
