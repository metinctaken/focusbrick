'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'

// item_type encoding: 'sugar_success' | 'sugar_fail' | 'sugar_cheat' | 'nofap_success' | ...
// item_id: fixed null UUID (required by DB schema)
const NULL_UUID = '00000000-0000-0000-0000-000000000000'

interface ChallengeLog {
  id: string
  item_type: string   // e.g. 'sugar_success'
  item_id: string
  completed_date: string
  // helpers
  challenge: string   // 'sugar' | 'nofap'
  action: string      // 'success' | 'fail' | 'cheat'
}

function parseLogs(raw: { id: string; item_type: string; item_id: string; completed_date: string }[]): ChallengeLog[] {
  return raw
    .filter(r => r.item_type.startsWith('sugar_') || r.item_type.startsWith('nofap_'))
    .map(r => {
      const [challenge, action] = r.item_type.split('_')
      return { ...r, challenge, action }
    })
}

function getLocalToday() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  d.setMinutes(d.getMinutes() - offset)
  return d.toISOString().split('T')[0]
}

export default function ChallengesPage() {
  const [logs, setLogs] = useState<ChallengeLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await createClient()
      .from('completions')
      .select('*')
      .like('item_type', 'sugar_%')
      .order('completed_date', { ascending: true })
    const { data: data2 } = await createClient()
      .from('completions')
      .select('*')
      .like('item_type', 'nofap_%')
      .order('completed_date', { ascending: true })
    setLogs(parseLogs([...(data ?? []), ...(data2 ?? [])]))
    setLoading(false)
  }

  async function logAction(challenge: string, action: 'success' | 'fail' | 'cheat') {
    const today = getLocalToday()
    const supabase = createClient()
    const typeKey = `${challenge}_${action}`
    
    // Check if any log exists for this challenge today
    const existing = logs.find(c => c.challenge === challenge && c.completed_date === today)
    
    if (existing) {
      if (existing.action === action) return // no change
      // Optimistic update
      setLogs(prev => prev.map(c => c.id === existing.id ? { ...c, item_type: typeKey, action } : c))
      const { error } = await supabase.from('completions')
        .update({ item_type: typeKey })
        .eq('id', existing.id)
      if (error) {
        console.error('Update error:', error)
        alert('Hata: ' + error.message)
        load()
      }
    } else {
      // Optimistic insert
      const tempId = 'temp-' + Date.now()
      setLogs(prev => [...prev, { id: tempId, item_type: typeKey, item_id: NULL_UUID, completed_date: today, challenge, action }])
      const { error } = await supabase.from('completions').insert({
        item_type: typeKey,
        item_id: NULL_UUID,
        completed_date: today
      })
      if (error) {
        console.error('Insert error:', error)
        alert('Hata: ' + error.message)
        setLogs(prev => prev.filter(c => c.id !== tempId))
      }
    }
  }

  const today = getLocalToday()

  const CHALLENGES = [
    { id: 'sugar', title: 'Şeker Orucu', desc: 'İlave şeker ve tatlı tüketimi yok.', color: '#10b981', gradient: 'from-emerald-500/20 to-transparent' },
    { id: 'nofap', title: 'No Fap', desc: 'İrade ve disiplin kontrolü.', color: '#8b5cf6', gradient: 'from-violet-500/20 to-transparent' }
  ]

  return (
    <DashboardLayout>
      <div style={{ fontFamily: 'var(--font-geist-sans)' }} className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Disiplin</p>
          <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Meydan Okumalar</h1>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {CHALLENGES.map((challenge, i) => {
            const challengeLogs = logs.filter(c => c.challenge === challenge.id)
            const sorted = [...challengeLogs].sort((a, b) => b.completed_date.localeCompare(a.completed_date))

            // Streak calculation
            let streak = 0
            const cur = new Date(today)

            const todayRec = sorted.find(c => c.completed_date === today)
            if (todayRec && todayRec.action !== 'fail') {
              streak++
              cur.setDate(cur.getDate() - 1)
            } else if (todayRec && todayRec.action === 'fail') {
              // streak broken today — don't decrement further
            } else {
              cur.setDate(cur.getDate() - 1)
            }

            if (!todayRec || todayRec.action !== 'fail') {
              while (true) {
                const dateStr = cur.toISOString().split('T')[0]
                const rec = sorted.find(c => c.completed_date === dateStr)
                if (!rec || rec.action === 'fail') break
                streak++
                cur.setDate(cur.getDate() - 1)
              }
            }

            // Cheat day within last 7 days
            const checkDate = new Date(today)
            checkDate.setDate(checkDate.getDate() - 7)
            const sevenDaysAgo = checkDate.toISOString().split('T')[0]
            const hasCheat = sorted.some(c => c.action === 'cheat' && c.completed_date > sevenDaysAgo)

            const state = todayRec?.action as 'success' | 'fail' | 'cheat' | undefined

            return (
              <motion.div key={challenge.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl border border-white/[0.05] bg-gradient-to-b ${challenge.gradient} p-6 relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-20">
                  <div className="w-24 h-24 rounded-full blur-2xl" style={{ backgroundColor: challenge.color }} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-[20px] font-bold text-white mb-1">{challenge.title}</h2>
                      <p className="text-[11px] text-zinc-400">{challenge.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-1">Seri</p>
                      <p className="text-[32px] font-bold leading-none" style={{ color: challenge.color }}>{streak}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] tracking-widest text-zinc-500 uppercase">Bugün (Özet)</p>
                    
                    {state === 'fail' ? (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                        <p className="text-red-400 font-bold text-[14px]">Seri Bozuldu</p>
                        <p className="text-red-400/70 text-[10px] mt-1">Yarın yeni bir başlangıç yapabilirsin.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          disabled={state === 'success'}
                          onClick={() => logAction(challenge.id, 'success')}
                          className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2
                            ${state === 'success' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 opacity-50 cursor-not-allowed' 
                              : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-emerald-500/30 text-white'}`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          <span className="text-[11px] font-bold tracking-widest uppercase">Başarılı</span>
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Seriyi bozduğunu ve başa döneceğini onaylıyor musun?')) {
                              logAction(challenge.id, 'fail')
                            }
                          }}
                          className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all flex flex-col items-center justify-center gap-2 text-zinc-400"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          <span className="text-[11px] font-bold tracking-widest uppercase">Hata Yaptım</span>
                        </button>

                        <button
                          disabled={hasCheat && state !== 'cheat'}
                          onClick={() => {
                            if (hasCheat && state !== 'cheat') return
                            logAction(challenge.id, 'cheat')
                          }}
                          className={`col-span-2 p-3 rounded-xl border transition-all flex items-center justify-center gap-2
                            ${state === 'cheat'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 opacity-50'
                              : hasCheat
                                ? 'bg-white/[0.01] border-white/[0.02] text-zinc-600 cursor-not-allowed opacity-50'
                                : 'bg-white/[0.02] border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 text-zinc-400 hover:text-amber-400'}`}
                        >
                          <span className="text-[14px]">🍰</span>
                          <span className="text-[10px] font-bold tracking-widest uppercase">
                            {state === 'cheat' ? 'Haftalık Hile Kullanıldı' : hasCheat ? 'Haftalık Hile Hakkı Yok' : 'Cheat Day (Seri Bozulmaz)'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
