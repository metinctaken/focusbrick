'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TARGET_DATE = new Date('2027-06-19T00:00:00').getTime()

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = TARGET_DATE - now

      if (distance < 0) {
        clearInterval(timer)
        return
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex gap-4">
      {[
        { label: 'GÜN', value: timeLeft.days },
        { label: 'SAAT', value: timeLeft.hours },
        { label: 'DAKİKA', value: timeLeft.minutes },
        { label: 'SANİYE', value: timeLeft.seconds },
      ].map((item, i) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="relative h-[48px] w-[52px] rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center overflow-hidden backdrop-blur-md">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={item.value}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'backOut' }}
                className="absolute text-[22px] font-bold text-white font-mono"
              >
                {item.value.toString().padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="mt-2 text-[8px] tracking-[0.3em] text-zinc-500 uppercase font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
