'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'

const NULL_UUID = '00000000-0000-0000-0000-000000000000'

interface ChallengeLog {
  id: string; item_type: string; item_id: string; completed_date: string
  challenge: string; action: string
}

function parseLogs(raw: any[]): ChallengeLog[] {
  return raw
    .filter(r => r.item_type.startsWith('sugar_') || r.item_type.startsWith('nofap_'))
    .map(r => { const [challenge, action] = r.item_type.split('_'); return { ...r, challenge, action } })
}

function getLocalToday() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}

const CHALLENGES = [
  { id: 'sugar', title: 'Şeker Orucu',  desc: 'İlave şeker ve tatlı tüketimi yok.',   color: '#10b981', dimColor: 'rgba(16,185,129,0.12)' },
  { id: 'nofap', title: 'No Fap',       desc: 'İrade ve disiplin kontrolü.',            color: '#8b5cf6', dimColor: 'rgba(139,92,246,0.12)' },
]

export default function ChallengesPage() {
  const [logs, setLogs]       = useState<ChallengeLog[]>([])
  const [loading, setLoading] = useState(true)
  const today = getLocalToday()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const sb = createClient()
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      sb.from('completions').select('*').like('item_type', 'sugar_%').order('completed_date', { ascending: true }),
      sb.from('completions').select('*').like('item_type', 'nofap_%').order('completed_date', { ascending: true }),
    ])
    setLogs(parseLogs([...(d1 ?? []), ...(d2 ?? [])]))
    setLoading(false)
  }

  async function logAction(challenge: string, action: 'success' | 'fail' | 'cheat') {
    const sb = createClient()
    const typeKey = `${challenge}_${action}`
    const existing = logs.find(c => c.challenge === challenge && c.completed_date === today)
    if (existing) {
      if (existing.action === action) return
      setLogs(prev => prev.map(c => c.id === existing.id ? { ...c, item_type: typeKey, action } : c))
      await sb.from('completions').update({ item_type: typeKey }).eq('id', existing.id)
    } else {
      const tempId = 'temp-' + Date.now()
      setLogs(prev => [...prev, { id: tempId, item_type: typeKey, item_id: NULL_UUID, completed_date: today, challenge, action }])
      const { error } = await sb.from('completions').insert({ item_type: typeKey, item_id: NULL_UUID, completed_date: today })
      if (error) { setLogs(prev => prev.filter(c => c.id !== tempId)); alert('Hata: ' + error.message) }
    }
  }

  // Build last 35 days calendar grid
  function buildCalendar(challengeId: string) {
    return Array.from({ length: 35 }).map((_, i) => {
      const date = addDays(today, i - 34)
      const rec  = logs.find(c => c.challenge === challengeId && c.completed_date === date)
      return { date, action: rec?.action ?? null, isFuture: date > today, isToday: date === today }
    })
  }

  function calcStreak(challengeId: string) {
    const sorted = logs.filter(c => c.challenge === challengeId).sort((a, b) => b.completed_date.localeCompare(a.completed_date))
    let streak = 0
    const cur  = new Date(today)
    const todayRec = sorted.find(c => c.completed_date === today)
    if (todayRec && todayRec.action !== 'fail') { streak++; cur.setDate(cur.getDate() - 1) }
    else if (todayRec?.action === 'fail') return 0
    else cur.setDate(cur.getDate() - 1)
    while (true) {
      const dateStr = cur.toISOString().split('T')[0]
      const rec = sorted.find(c => c.completed_date === dateStr)
      if (!rec || rec.action === 'fail') break
      streak++
      cur.setDate(cur.getDate() - 1)
    }
    return streak
  }

  function calcBest(challengeId: string) {
    const all = logs.filter(c => c.challenge === challengeId && c.action !== 'fail')
      .map(c => c.completed_date).sort()
    if (!all.length) return 0
    let best = 1, cur = 1
    for (let i = 1; i < all.length; i++) {
      const prev = new Date(all[i - 1]); prev.setDate(prev.getDate() + 1)
      if (prev.toISOString().split('T')[0] === all[i]) { cur++; best = Math.max(best, cur) }
      else cur = 1
    }
    return best
  }

  const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

  return (
    <DashboardLayout>
      <div style={{ fontFamily: 'var(--font-geist-sans)' }} className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Disiplin</p>
          <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Meydan Okumalar</h1>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Yükleniyor</motion.div>
          </div>
        ) : (
          <div className="space-y-6">
            {CHALLENGES.map((ch, ci) => {
              const streak   = calcStreak(ch.id)
              const best     = calcBest(ch.id)
              const total    = logs.filter(c => c.challenge === ch.id && c.action !== 'fail').length
              const todayRec = logs.find(c => c.challenge === ch.id && c.completed_date === today)
              const state    = todayRec?.action as 'success'|'fail'|'cheat'|undefined
              const hasCheat = logs.some(c => c.challenge === ch.id && c.action === 'cheat' && c.completed_date > addDays(today, -7) && c.completed_date < today)
              const calendar = buildCalendar(ch.id)

              return (
                <motion.div key={ch.id}
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: ci * 0.1 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden"
                >
                  {/* Top accent */}
                  <div className="h-[2px]" style={{ background: `linear-gradient(to right, ${ch.color}60, transparent)` }} />

                  <div className="p-6">
                    {/* ── Header row ── */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                          <h2 className="text-[18px] font-bold text-white">{ch.title}</h2>
                        </div>
                        <p className="text-[11px] text-zinc-600">{ch.desc}</p>
                      </div>
                      {/* Streak badge */}
                      <div className="text-right">
                        <p className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-1">Güncel Seri</p>
                        <p className="text-[40px] font-bold leading-none tabular-nums" style={{ color: streak > 0 ? ch.color : '#3f3f46' }}>{streak}</p>
                      </div>
                    </div>

                    {/* ── Stats row ── */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[
                        { label: 'En İyi Seri', value: best },
                        { label: 'Toplam Başarı', value: total },
                        { label: 'Bu Ay', value: logs.filter(c => c.challenge === ch.id && c.action !== 'fail' && c.completed_date >= today.slice(0, 7) + '-01').length },
                      ].map((s, i) => (
                        <div key={i} className="relative rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3 overflow-hidden">
                          <div className="absolute top-0 left-3 right-3 h-[1px] rounded-full" style={{ backgroundColor: ch.color + '30' }} />
                          <p className="text-[9px] tracking-[0.3em] text-zinc-600 uppercase mb-1.5">{s.label}</p>
                          <p className="text-[22px] font-bold tabular-nums leading-none text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── 35-day Calendar Grid ── */}
                    <div className="mb-6">
                      <p className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase mb-3">Son 35 Gün</p>
                      {/* Day labels */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {DAY_LABELS.map(d => (
                          <div key={d} className="text-center text-[8px] tracking-widest text-zinc-700 uppercase">{d}</div>
                        ))}
                      </div>
                      {/* Calendar cells — 5 rows × 7 cols */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendar.map((day, i) => {
                          const isToday = day.isToday
                          const bg = day.isFuture ? 'bg-white/[0.02]'
                            : day.action === 'success' ? ''
                            : day.action === 'cheat'   ? ''
                            : day.action === 'fail'    ? ''
                            : 'bg-white/[0.02]'
                          return (
                            <motion.div
                              key={day.date}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2, delay: i * 0.005 }}
                              title={`${day.date}${day.action ? ' — ' + (day.action === 'success' ? '✓' : day.action === 'fail' ? '✗' : '🍰') : ''}`}
                              className={`aspect-square rounded-[4px] border ${isToday ? 'ring-1' : ''} ${bg} relative overflow-hidden`}
                              style={{
                                backgroundColor: day.action === 'success' ? ch.color + '35'
                                  : day.action === 'cheat' ? 'rgba(245,158,11,0.2)'
                                  : day.action === 'fail'  ? 'rgba(239,68,68,0.2)'
                                  : undefined,
                                borderColor: isToday ? ch.color + '60'
                                  : day.action === 'success' ? ch.color + '50'
                                  : day.action === 'cheat' ? 'rgba(245,158,11,0.4)'
                                  : day.action === 'fail'  ? 'rgba(239,68,68,0.3)'
                                  : 'rgba(255,255,255,0.04)',
                                '--tw-ring-color': ch.color,
                              } as React.CSSProperties}
                            >
                              {day.action === 'success' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: ch.color }} />
                                </div>
                              )}
                              {day.action === 'fail' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-red-400" style={{ fontSize: 8 }}>✕</span>
                                </div>
                              )}
                              {day.action === 'cheat' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span style={{ fontSize: 7 }}>🍰</span>
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-3">
                        {[
                          { label: 'Başarı', color: ch.color + '35', border: ch.color + '50', dot: ch.color },
                          { label: 'Hata', color: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.3)', dot: '#ef4444' },
                          { label: 'Cheat', color: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.4)', dot: '#f59e0b' },
                        ].map(l => (
                          <div key={l.label} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-[3px] border" style={{ backgroundColor: l.color, borderColor: l.border }} />
                            <span className="text-[8px] tracking-widest text-zinc-600 uppercase">{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Today's action ── */}
                    <div>
                      <p className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase mb-3">Bugün</p>

                      <AnimatePresence mode="wait">
                        {state === 'fail' ? (
                          <motion.div key="fail" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 flex items-center justify-between">
                            <div>
                              <p className="text-red-400 font-bold text-[13px]">Seri Bozuldu</p>
                              <p className="text-red-400/50 text-[10px] mt-0.5">Yarın yeni bir başlangıç yapabilirsin.</p>
                            </div>
                            <button onClick={() => logAction(ch.id, 'success')}
                              className="text-[9px] tracking-widest uppercase text-zinc-600 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
                              Geri Al
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-2 gap-2">
                            {/* Success */}
                            <ActionBtn
                              active={state === 'success'}
                              disabled={state === 'success'}
                              onClick={() => logAction(ch.id, 'success')}
                              accentColor={ch.color}
                              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                              label="Başarılı"
                            />
                            {/* Fail */}
                            <ActionBtn
                              active={false}
                              disabled={false}
                              danger
                              onClick={() => { if (confirm('Seriyi bozduğunu onaylıyor musun?')) logAction(ch.id, 'fail') }}
                              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>}
                              label="Hata Yaptım"
                            />
                            {/* Cheat */}
                            <button
                              disabled={hasCheat && state !== 'cheat'}
                              onClick={() => { if (hasCheat && state !== 'cheat') return; logAction(ch.id, 'cheat') }}
                              className={`col-span-2 p-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase
                                ${state === 'cheat' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 opacity-60 cursor-default'
                                  : hasCheat ? 'border-white/[0.04] text-zinc-700 cursor-not-allowed opacity-40'
                                  : 'border-white/[0.06] bg-white/[0.015] hover:border-amber-500/30 hover:bg-amber-500/[0.05] text-zinc-500 hover:text-amber-400'}`}
                            >
                              <span>🍰</span>
                              {state === 'cheat' ? 'Haftalık Hile Kullanıldı' : hasCheat ? 'Haftalık Hile Hakkı Yok' : 'Cheat Day'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function ActionBtn({ active, disabled, danger, onClick, accentColor, icon, label }: {
  active: boolean; disabled: boolean; danger?: boolean; onClick: () => void
  accentColor?: string; icon: React.ReactNode; label: string
}) {
  return (
    <motion.button
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase
        ${active ? 'cursor-default opacity-60' : ''}
        ${danger
          ? 'border-white/[0.06] bg-white/[0.015] text-zinc-500 hover:bg-red-500/[0.08] hover:border-red-500/30 hover:text-red-400'
          : active
            ? 'border-white/10 bg-white/[0.04] text-zinc-400'
            : 'border-white/[0.06] bg-white/[0.015] text-zinc-500 hover:border-white/20 hover:bg-white/[0.04] hover:text-white'
        }`}
      style={active && accentColor ? { borderColor: accentColor + '40', color: accentColor, backgroundColor: accentColor + '10' } : {}}
    >
      {icon}
      {label}
    </motion.button>
  )
}
