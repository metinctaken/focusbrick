'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Completion {
  id: string
  item_type: string
  item_id: string
  completed_date: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 10
const BRICK_SHADES = [
  '#8b2500', '#9a2e08', '#a33510', '#ad3c14',
  '#b44018', '#a83810', '#9f3210', '#b04018',
  '#ac3c16', '#b54418',
]

function getBrickShade(index: number) {
  return BRICK_SHADES[(index * 3 + (index % 5)) % BRICK_SHADES.length]
}

function getStreak(dates: string[]): number {
  if (!dates.length) return 0
  const unique = [...new Set(dates)].sort().reverse()
  let streak = 0
  const check = new Date()
  check.setHours(0, 0, 0, 0)
  for (const d of unique) {
    const dt = new Date(d)
    dt.setHours(0, 0, 0, 0)
    if (dt.getTime() === check.getTime()) {
      streak++
      check.setDate(check.getDate() - 1)
    } else if (dt.getTime() < check.getTime()) {
      break
    }
  }
  return streak
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WallPage() {
  const [completions, setCompletions]   = useState<Completion[]>([])
  const [loading, setLoading]           = useState(true)
  const [newBrickIdx, setNewBrickIdx]   = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await createClient()
      .from('completions')
      .select('*')
      .order('completed_date', { ascending: true })
    setCompletions(data ?? [])
    setLoading(false)
  }

  const streak = getStreak(completions.map(c => c.completed_date))
  const uniqueDays = new Set(completions.map(c => c.completed_date)).size
  const totalBricks = uniqueDays // Tuğla sayısı = Gün sayısı

  // Hedef 270 Gün
  const GOAL = 270
  const rows = Math.ceil(GOAL / COLS)

  return (
    <DashboardLayout>
      <div style={{ fontFamily: 'var(--font-geist-sans)' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">İlerleme</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Duvar</h1>
          </div>
          <button
            onClick={load}
            className="text-[9px] tracking-[0.35em] text-zinc-700 uppercase hover:text-zinc-400 transition-colors"
          >
            Yenile
          </button>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"
        />

        {loading ? (
          <div className="flex justify-center py-24">
            <p className="text-[10px] tracking-[0.4em] text-zinc-700 uppercase">Yükleniyor</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {/* Total Bricks */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-5"
              >
                <div className="text-[30px] font-bold text-white leading-none mb-2">{totalBricks}</div>
                <div className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Toplam Tuğla</div>
                <div className="mt-2 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(totalBricks / GOAL) * 100}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-orange-900 to-orange-600"
                  />
                </div>
                <p className="text-[8px] text-zinc-700 mt-1">{GOAL} hedefin {Math.round((totalBricks / GOAL) * 100)}%'i</p>
              </motion.div>

              {/* Streak - with flame system */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.33 }}
                className={`rounded-xl border px-5 py-5 relative overflow-hidden transition-all
                  ${streak > 0 ? 'border-orange-500/20 bg-orange-500/[0.02]' : 'border-white/[0.07] bg-white/[0.02]'}`}
              >
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-[30px] font-bold leading-none ${streak > 0 ? 'text-orange-400' : 'text-white'}`}>
                    {streak}
                  </span>
                </div>
                <div className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Aktif Seri</div>
              </motion.div>

              {/* Unique Days */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.41 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-5"
              >
                <div className="text-[30px] font-bold text-white leading-none mb-2">{uniqueDays}</div>
                <div className="text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Tamamlanan Gün</div>
              </motion.div>
            </div>

            {/* Wall label */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 border-t border-dashed border-white/[0.08]" />
              <span className="text-[9px] tracking-[0.3em] text-white/20 uppercase">İnşaat</span>
              <div className="flex-1 border-t border-dashed border-white/[0.08]" />
            </div>

            {/* Brick wall */}
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {Array.from({ length: rows * COLS }).map((_, idx) => {
                const row = Math.floor(idx / COLS)
                const col = idx % COLS
                // Bottom-left fill: convert grid position to brick index
                const brickIdx = (rows - 1 - row) * COLS + col
                const filled = brickIdx < totalBricks
                const isNew  = brickIdx === newBrickIdx

                return (
                  <div key={idx} className="relative" style={{ paddingBottom: '35%' }}>
                    <div className="absolute inset-0">
                      <AnimatePresence>
                        {filled ? (
                          <motion.div
                            key="brick"
                            initial={isNew ? { y: -160, opacity: 0 } : false}
                            animate={{ y: 0, opacity: 1 }}
                            transition={isNew
                              ? { type: 'spring', stiffness: 300, damping: 22 }
                              : { duration: 0 }
                            }
                            className="absolute inset-0 rounded-[3px] overflow-hidden"
                            style={{
                              backgroundColor: getBrickShade(brickIdx),
                              boxShadow: isNew
                                ? '0 0 16px 3px rgba(160,50,10,0.5)'
                                : undefined,
                            }}
                          >
                            <div className="absolute inset-0 border border-black/40 rounded-[3px]" />
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10" />
                          </motion.div>
                        ) : (
                          <div className="absolute inset-0 rounded-[3px] border border-white/[0.04] bg-white/[0.01]" />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Ground */}
            <div className="mt-1 h-[2px] rounded-full bg-white/[0.08]" />

            {/* Count label */}
            <div className="flex justify-between mt-3">
              <span className="text-[9px] text-zinc-800 tracking-widest uppercase">0</span>
              <span className="text-[9px] text-zinc-700 tracking-widest">
                {totalBricks} tuğla yerleşti
              </span>
            </div>

          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
