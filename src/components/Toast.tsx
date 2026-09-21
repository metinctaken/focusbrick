'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface Props {
  toasts: ToastMessage[]
  remove: (id: string) => void
}

export default function Toast({ toasts, remove }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2" style={{ fontFamily: 'var(--font-geist-sans)' }}>
      <AnimatePresence>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} remove={remove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, remove }: { toast: ToastMessage; remove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => remove(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, remove])

  const styles = {
    success: { border: 'border-white/20', icon: '✓', iconColor: 'text-emerald-400' },
    error:   { border: 'border-red-500/30', icon: '×', iconColor: 'text-red-400' },
    info:    { border: 'border-white/10', icon: '·', iconColor: 'text-zinc-400' },
  }[toast.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.94 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => remove(toast.id)}
      className={`flex items-center gap-3 rounded-xl border ${styles.border} bg-zinc-950/95 backdrop-blur-md px-4 py-3 cursor-pointer min-w-[220px] max-w-xs`}
    >
      <span className={`text-[14px] font-bold ${styles.iconColor} flex-shrink-0`}>{styles.icon}</span>
      <p className="text-[12px] text-white/80 tracking-wide flex-1">{toast.message}</p>
    </motion.div>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, remove }
}
