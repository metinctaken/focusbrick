'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'tasks' | 'study' | 'wallet'>('tasks')
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

  // --- Tasks Analysis ---
  const taskCompletions = completions.filter(c => c.item_type === 'habit' || c.item_type === 'schedule')
  const totalTasks = taskCompletions.length
  const uniqueDays = new Set(taskCompletions.map(c => c.completed_date)).size
  
  // Last 14 days map for tasks
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })
  
  const tasksChartData = last14Days.map(date => ({
    date: date.slice(-2) + '/' + date.slice(5,7),
    count: taskCompletions.filter(c => c.completed_date === date).length
  }))

  const habitCategoryData = Object.entries(
    completions.filter(c => c.item_type === 'habit').reduce((acc, c) => {
      const hab = habits.find(h => h.id === c.item_id)
      if (hab) {
        const cat = hab.category
        acc[cat] = (acc[cat] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => {
    const labels: Record<string, string> = { health: 'Sağlık', career: 'Kariyer', mind: 'Zihin', finance: 'Finans', personal: 'Kişisel' }
    return { name: labels[name] || name, value }
  })
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b']

  // --- Study Analysis ---
  const studyCompletions = completions.filter(c => c.item_type === 'schedule')
  const totalStudyHours = studyCompletions.reduce((a, c) => a + (Number(c.duration_hours) || 0), 0)
  
  const studyChartData = last14Days.map(date => {
    const dayComps = studyCompletions.filter(c => c.completed_date === date)
    const hours = dayComps.reduce((a, c) => a + (Number(c.duration_hours) || 0), 0)
    return { date: date.slice(-2) + '/' + date.slice(5,7), hours: Number(hours.toFixed(1)) }
  })

  const subjectHours: Record<string, number> = {}
  studyCompletions.forEach(c => {
    const item = scheduleItems.find(s => s.id === c.item_id)
    if (item) {
      subjectHours[item.subject] = (subjectHours[item.subject] || 0) + (Number(c.duration_hours) || 0)
    }
  })
  const subjectChartData = Object.entries(subjectHours)
    .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours)

  // --- Wallet Analysis ---
  const incomes = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)
  
  const walletFlowData = last14Days.map(date => {
    const dayTxs = transactions.filter(t => t.created_at?.startsWith(date))
    const inc = dayTxs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)
    const exp = dayTxs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)
    return { date: date.slice(-2) + '/' + date.slice(5,7), Gelir: inc, Gider: exp }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-[10px] text-zinc-400 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-[12px] font-bold" style={{ color: p.color || p.fill }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <DashboardLayout>
      <div style={{ fontFamily: 'var(--font-geist-sans)' }} className="max-w-5xl mx-auto pb-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Genel Bakış</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Analiz ve İstatistikler</h1>
          </div>
          <div className="flex bg-white/[0.03] p-1 rounded-xl w-full md:w-auto overflow-x-auto border border-white/[0.05]">
            {(['tasks', 'study', 'wallet'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 md:flex-none px-6 py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all
                  ${tab === t ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}>
                {t === 'tasks' ? 'Görevler' : t === 'study' ? 'Çalışma' : 'Bakiye'}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Veriler Yükleniyor</motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              {tab === 'tasks' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard title="Toplam Tamamlama" value={totalTasks} />
                    <StatCard title="Aktif Gün" value={uniqueDays} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard title="Son 14 Günlük Aktivite" className="lg:col-span-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={tasksChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="count" name="Görev" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorTasks)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Kategori Dağılımı">
                      {habitCategoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={habitCategoryData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                              {habitCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart />}
                    </ChartCard>
                  </div>
                </div>
              )}

              {tab === 'study' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard title="Toplam Çalışma" value={totalStudyHours.toFixed(1)} suffix="saat" accent="text-blue-400" />
                    <StatCard title="Günlük Ortalama" value={(totalStudyHours / (uniqueDays || 1)).toFixed(1)} suffix="saat" accent="text-blue-400" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard title="Son 14 Günlük Çalışma (Saat)">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={studyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                          <Bar dataKey="hours" name="Saat" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Derslere Göre Dağılım">
                      {subjectChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectChartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#e4e4e7', fontSize: 11}} width={100} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <Bar dataKey="hours" name="Saat" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart />}
                    </ChartCard>
                  </div>
                </div>
              )}

              {tab === 'wallet' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard title="Toplam Gelir" value={`₺${incomes.toFixed(0)}`} accent="text-emerald-400" />
                    <StatCard title="Toplam Gider" value={`₺${expenses.toFixed(0)}`} accent="text-red-400" />
                    <StatCard title="Net Bakiye" value={`₺${(incomes - expenses).toFixed(0)}`} accent={incomes >= expenses ? 'text-white' : 'text-red-400'} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard title="Son 14 Günlük Para Akışı" className="lg:col-span-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={walletFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Line type="monotone" dataKey="Gelir" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                          <Line type="monotone" dataKey="Gider" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{r: 4}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Hesap Bakiyeleri">
                      <div className="flex flex-col gap-3 justify-center h-full pt-4">
                        {accounts.map(acc => {
                          const accTxs = transactions.filter(t => t.account_id === acc.id)
                          const accBal = accTxs.reduce((a, b) => a + (b.type === 'income' ? b.amount : -b.amount), 0)
                          return (
                            <div key={acc.id} className="flex justify-between items-center p-4 border border-white/[0.04] bg-white/[0.01] rounded-xl hover:bg-white/[0.02] transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ backgroundColor: acc.color, boxShadow: `0 0 12px ${acc.color}40` }} />
                                <span className="text-[13px] text-white font-medium">{acc.name}</span>
                              </div>
                              <span className={`text-[15px] font-bold tracking-tight ${accBal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                ₺{accBal.toFixed(0)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </ChartCard>
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

function StatCard({ title, value, suffix, accent = "text-white" }: { title: string, value: string | number, suffix?: string, accent?: string }) {
  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 overflow-hidden">
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-white/[0.08] rounded-full" />
      <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-3">{title}</p>
      <p className={`text-[36px] font-bold leading-none tabular-nums tracking-tight ${accent}`}>
        {value}
        {suffix && <span className="text-[14px] ml-2 text-zinc-500 tracking-normal font-normal">{suffix}</span>}
      </p>
    </div>
  )
}

function ChartCard({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 flex flex-col ${className}`}>
      <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-6 flex-shrink-0">{title}</p>
      <div className="flex-1 min-h-[250px]">
        {children}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
      <p className="text-[10px] tracking-widest text-zinc-600 uppercase">Yeterli Veri Yok</p>
    </div>
  )
}
