'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'tasks' | 'wallet' | 'study'>('tasks')
  const [loading, setLoading] = useState(true)

  // Data
  const [completions, setCompletions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [scheduleItems, setScheduleItems] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const sb = createClient()
    const [{ data: c }, { data: t }, { data: a }, { data: h }, { data: s }] = await Promise.all([
      sb.from('completions').select('*'),
      sb.from('wallet_transactions').select('*'),
      sb.from('wallet_accounts').select('*'),
      sb.from('daily_habits').select('*'),
      sb.from('schedule_items').select('*')
    ])
    setCompletions(c ?? [])
    setTransactions(t ?? [])
    setAccounts(a ?? [])
    setHabits(h ?? [])
    setScheduleItems(s ?? [])
    setLoading(false)
  }

  // Tasks Analysis
  const totalTasks = completions.length
  const uniqueDays = new Set(completions.map(c => c.completed_date)).size
  
  // Last 7 days map for tasks
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  
  const tasksByDay = last7Days.map(date => ({
    date,
    count: completions.filter(c => c.completed_date === date).length
  }))
  const maxTasks = Math.max(...tasksByDay.map(t => t.count), 1)

  // Study Analysis
  const studyCompletions = completions.filter(c => c.item_type === 'schedule')
  const totalStudyHours = studyCompletions.reduce((a, c) => a + (Number(c.duration_hours) || 0), 0)
  
  const studyHoursByDay = last7Days.map(date => {
    const dayComps = studyCompletions.filter(c => c.completed_date === date)
    const hours = dayComps.reduce((a, c) => a + (Number(c.duration_hours) || 0), 0)
    return { date, hours }
  })
  const maxStudyHours = Math.max(...studyHoursByDay.map(d => d.hours), 1)

  // Subject Breakdown
  const subjectHours: Record<string, number> = {}
  studyCompletions.forEach(c => {
    const item = scheduleItems.find(s => s.id === c.item_id)
    if (item) {
      subjectHours[item.subject] = (subjectHours[item.subject] || 0) + (Number(c.duration_hours) || 0)
    }
  })
  const sortedSubjects = Object.entries(subjectHours).sort((a, b) => b[1] - a[1])

  // Wallet Analysis
  const incomes = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)
  
  return (
    <DashboardLayout>
      <div style={{ fontFamily: 'var(--font-geist-sans)' }} className="max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Genel Bakış</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Analiz</h1>
          </div>
          <div className="flex bg-white/[0.03] p-1 rounded-xl">
            <button onClick={() => setTab('tasks')}
              className={`px-4 sm:px-6 py-2 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all
                ${tab === 'tasks' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>Görevler</button>
            <button onClick={() => setTab('study')}
              className={`px-4 sm:px-6 py-2 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all
                ${tab === 'study' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>Çalışma</button>
            <button onClick={() => setTab('wallet')}
              className={`px-4 sm:px-6 py-2 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all
                ${tab === 'wallet' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>Bakiye</button>
          </div>
        </motion.div>

        <motion.div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {loading ? (
          <div className="text-center py-20 text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Hesaplanıyor</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {tab === 'tasks' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                      <p className="text-[9px] tracking-[0.35em] text-zinc-500 uppercase mb-2">Toplam Tamamlama</p>
                      <p className="text-[32px] font-bold text-white">{totalTasks}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                      <p className="text-[9px] tracking-[0.35em] text-zinc-500 uppercase mb-2">Aktif Gün</p>
                      <p className="text-[32px] font-bold text-white">{uniqueDays}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                    <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-8">Son 7 Günlük Aktivite Grafiği</p>
                    <div className="flex items-end justify-between h-[150px] gap-2">
                      {tasksByDay.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3">
                          <div className="w-full bg-white/[0.03] rounded-t-sm flex items-end justify-center relative overflow-hidden" style={{ height: '100%' }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(d.count / maxTasks) * 100}%` }}
                              transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                              className="w-full bg-white/80"
                            />
                          </div>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{d.date.slice(-2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kategori Dağılımı */}
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                    <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-6">Kategori Dağılımı (Görevler)</p>
                    <div className="space-y-3">
                      {Object.entries(
                        completions.filter(c => c.item_type === 'habit').reduce((acc, c) => {
                          const hab = habits.find(h => h.id === c.item_id)
                          if (hab) {
                            acc[hab.category] = (acc[hab.category] || 0) + 1
                          }
                          return acc
                        }, {} as Record<string, number>)
                      ).map(([cat, count]) => (
                        <div key={cat} className="flex justify-between items-center p-3 border border-white/[0.04] bg-white/[0.01] rounded-lg">
                          <span className="text-[12px] text-white uppercase tracking-widest">{cat === 'health' ? 'Sağlık' : cat === 'career' ? 'Kariyer' : cat === 'mind' ? 'Zihin' : cat === 'finance' ? 'Finans' : cat === 'personal' ? 'Kişisel' : cat}</span>
                          <span className="text-[14px] font-bold text-white/70">{(count as number)} Tamamlama</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'study' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-6">
                      <p className="text-[9px] tracking-[0.35em] text-blue-500/80 uppercase mb-2">Toplam Çalışma</p>
                      <p className="text-[32px] font-bold text-blue-400">{totalStudyHours.toFixed(1)} <span className="text-lg text-blue-400/50">saat</span></p>
                    </div>
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-6">
                      <p className="text-[9px] tracking-[0.35em] text-blue-500/80 uppercase mb-2">Haftalık Ortalama</p>
                      <p className="text-[32px] font-bold text-blue-400">{(totalStudyHours / (uniqueDays || 1)).toFixed(1)} <span className="text-lg text-blue-400/50">saat/gün</span></p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                    <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-8">Son 7 Günlük Çalışma Süresi</p>
                    <div className="flex items-end justify-between h-[150px] gap-2">
                      {studyHoursByDay.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3">
                          <div className="w-full bg-white/[0.03] rounded-t-sm flex items-end justify-center relative overflow-hidden" style={{ height: '100%' }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(d.hours / maxStudyHours) * 100}%` }}
                              transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                              className="w-full bg-blue-500/80"
                            />
                            {d.hours > 0 && (
                              <span className="absolute bottom-2 text-[8px] text-white/80 font-bold">{d.hours}s</span>
                            )}
                          </div>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest">{d.date.slice(-2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Derslere Göre Dağılım */}
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                    <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-6">Derslere Göre Dağılım</p>
                    <div className="space-y-4">
                      {sortedSubjects.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 tracking-widest uppercase text-center py-4">Veri yok</p>
                      ) : sortedSubjects.map(([subject, hours], i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] text-white">{subject}</span>
                            <span className="text-[11px] text-zinc-400">{hours.toFixed(1)} saat</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-blue-500/60 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${(hours / (sortedSubjects[0][1] || 1)) * 100}%` }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'wallet' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-6">
                      <p className="text-[9px] tracking-[0.35em] text-emerald-500/80 uppercase mb-2">Toplam Giren Para</p>
                      <p className="text-[32px] font-bold text-emerald-400">₺{incomes.toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6">
                      <p className="text-[9px] tracking-[0.35em] text-red-500/80 uppercase mb-2">Toplam Çıkan Para</p>
                      <p className="text-[32px] font-bold text-red-400">₺{expenses.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                    <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-6">Gelir / Gider Oranı</p>
                    <div className="h-4 w-full bg-white/[0.05] rounded-full overflow-hidden flex">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(incomes / (incomes + expenses || 1)) * 100}%` }} className="h-full bg-emerald-500" />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(expenses / (incomes + expenses || 1)) * 100}%` }} className="h-full bg-red-500" />
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] tracking-widest uppercase">
                      <span className="text-emerald-500">%{Math.round((incomes / (incomes + expenses || 1)) * 100)}</span>
                      <span className="text-red-500">%{Math.round((expenses / (incomes + expenses || 1)) * 100)}</span>
                    </div>
                  </div>

                  {/* Hesaplara Göre Bakiye */}
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                    <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-6">Hesaplara Göre Bakiye</p>
                    <div className="space-y-3">
                      {accounts.map(acc => {
                        const accTxs = transactions.filter(t => t.account_id === acc.id)
                        const accBal = accTxs.reduce((a, b) => a + (b.type === 'income' ? b.amount : -b.amount), 0)
                        return (
                          <div key={acc.id} className="flex justify-between items-center p-3 border border-white/[0.04] bg-white/[0.01] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                              <span className="text-[12px] text-white">{acc.name}</span>
                            </div>
                            <span className={`text-[14px] font-bold ${accBal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ₺{accBal.toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </DashboardLayout>
  )
}

