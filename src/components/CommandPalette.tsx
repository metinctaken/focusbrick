'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

type Message = {
  id: string
  role: 'user' | 'system'
  text: string
  widget?: React.ReactNode
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'system', text: 'Sistem hazır. Gideceğiniz sayfayı yazabilir veya komut verebilirsiniz. (Örn: "Kasaya 150 eksi yaz", "Bakiye grafiğini göster", "Sayaç aç")' }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const processCommand = async (text: string) => {
    const lower = text.toLowerCase().trim()
    setIsProcessing(true)
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }])
    
    setTimeout(async () => {
      try {
        let responseText = "Bunu tam olarak anlayamadım efendim. Kasa, program, görevler veya analiz hakkında sorular sorabilirsiniz."
        let responseWidget: React.ReactNode = null
        let shouldNavigate = ''
        const sb = createClient()

        // --- 1. DERS PROGRAMI / GÜNLÜK PLAN ---
        if (lower.includes('program') || lower.includes('ders') || lower.includes('bugün ne var') || lower.includes('çalışma planı')) {
          const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
          const { data: schedule } = await sb.from('schedule_items').select('*').eq('day_of_week', todayIndex)
          
          if (schedule && schedule.length > 0) {
            responseText = `Bugün için tanımlı ${schedule.length} dersiniz bulunuyor. İşte programınız:`
            responseWidget = (
              <div className="w-full mt-2 bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden text-[12px] p-2">
                {schedule.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 hover:bg-white/[0.02] border-b border-white/5 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: s.color || '#10b981'}} />
                    <span className="font-medium text-white/80">{s.title}</span>
                    <span className="ml-auto text-zinc-500 font-mono text-[10px]">{s.duration_hours} saat</span>
                  </div>
                ))}
              </div>
            )
          } else {
            responseText = "Bugün için kayıtlı bir ders programınız görünmüyor."
          }
        }

        // --- 2. GÖREVLER / ALIŞKANLIKLAR ---
        else if (lower.includes('görev') || lower.includes('alışkanlık') || lower.includes('hedef')) {
          const { data: habits } = await sb.from('daily_habits').select('*').eq('is_active', true)
          if (habits && habits.length > 0) {
            responseText = `Şu anda takip edilen ${habits.length} aktif göreviniz var:`
            responseWidget = (
              <div className="w-full mt-2 bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden text-[12px] p-2 flex flex-wrap gap-2">
                {habits.map((h, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-full bg-black/40 border border-white/5 text-zinc-400">
                    {h.title}
                  </div>
                ))}
              </div>
            )
          } else {
            responseText = "Sistemde aktif bir görev bulunamadı."
          }
        }
        
        // --- 3. KASA / BAKİYE / PARA İŞLEMLERİ ---
        else if (/(?:kasa|kasaya|kasadan)\s+?(\d+)\s+?(eksi|artı|gider|gelir)/.test(lower)) {
          const txMatch = lower.match(/(?:kasa|kasaya|kasadan)\s+?(\d+)\s+?(eksi|artı|gider|gelir)/)
          if (txMatch) {
            const amount = parseInt(txMatch[1])
            const typeStr = txMatch[2]
            const type = (typeStr === 'eksi' || typeStr === 'gider') ? 'expense' : 'income'
            
            const { data: accs } = await sb.from('wallet_accounts').select('*').limit(1)
            if (accs && accs.length > 0) {
              await sb.from('wallet_transactions').insert({
                account_id: accs[0].id,
                amount: amount,
                type: type,
                category: 'Terminal',
                description: 'Terminal Girişi',
                transaction_date: new Date().toISOString().split('T')[0]
              })
              responseText = `İşlem onaylandı. Kasaya ${type === 'expense' ? '-' : '+'}${amount}₺ olarak işlendi.`
            } else {
              responseText = "Kasa hesabı bulunamadı."
            }
          }
        }
        else if (lower.includes('bakiye grafiği') || lower.includes('grafik') || lower.includes('param ne kadar') || lower.includes('harcama durumu')) {
          const { data: txs } = await sb.from('wallet_transactions').select('*').order('created_at')
          if (txs) {
            let currentBal = 0
            const chartData = txs.map(t => {
              currentBal += (t.type === 'income' ? t.amount : -t.amount)
              return { date: t.created_at.slice(5,10).replace('-','/'), bakiye: currentBal }
            })
            const recent = chartData.slice(-7)
            
            responseText = "Bakiye durumunuz hesaplandı. İşte son hareketlerinize göre net tablonuz:"
            responseWidget = (
              <div className="w-full h-36 mt-3 bg-[#0a0a0a] border border-white/5 rounded-xl p-3 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recent}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{backgroundColor:'#000', border:'1px solid rgba(255,255,255,0.1)', fontSize:11, borderRadius:8}} />
                    <Line type="stepAfter" dataKey="bakiye" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          } else {
            responseText = "Grafik oluşturulurken veriye ulaşılamadı."
          }
        }

        // --- 4. ZORLUKLAR / MEYDAN OKUMALAR ---
        else if (lower.includes('zorluk') || lower.includes('meydan okuma') || lower.includes('streak')) {
          const { data: challenges } = await sb.from('challenges').select('*')
          if (challenges && challenges.length > 0) {
            responseText = `Şu anda ${challenges.length} farklı zorluk mücadelesi veriyorsunuz. İradenize hakim olun.`
          } else {
            responseText = "Zorluklar ekranına yönlendiriliyorsunuz..."
            shouldNavigate = '/challenges'
          }
        }

        // --- 5. YÖNLENDİRMELER VE SOHBET ---
        else if (lower.includes('nasılsın') || lower.includes('merhaba') || lower.includes('selam')) {
          responseText = "Sistemler devrede efendim, ben hazırım. Siz nasılsınız? Bugün neye odaklanıyoruz?"
        }
        else if (lower.includes('sayaç') || lower.includes('zamanlayıcı') || lower.includes('odak')) {
          responseText = "Odaklanma moduna geçiş yapılıyor..."
          shouldNavigate = '/timer'
        }
        else if (lower.includes('kasa') || lower.includes('cüzdan') || lower.includes('para')) {
          responseText = "Kasa paneline aktarıyorum..."
          shouldNavigate = '/wallet'
        }
        else if (lower.includes('analiz') || lower.includes('istatistik')) {
          responseText = "Analiz veritabanına bağlanılıyor..."
          shouldNavigate = '/analytics'
        }
        else if (lower.includes('ana sayfa') || lower.includes('merkez')) {
          responseText = "Ana komuta merkezine dönülüyor..."
          shouldNavigate = '/'
        }
        else if (lower.includes('çıkış') || lower.includes('kapat')) {
          responseText = "Sistemden çıkış yapılıyor. Görüşmek üzere."
          shouldNavigate = '/login'
          sessionStorage.removeItem('authenticated')
        }
        
        // Add system response
        setMessages(prev => [...prev, { id: Date.now().toString()+'sys', role: 'system', text: responseText, widget: responseWidget }])
        
        if (shouldNavigate) {
          setTimeout(() => {
            router.push(shouldNavigate)
            setIsOpen(false)
          }, 1500)
        }

      } catch (err) {
        setMessages(prev => [...prev, { id: Date.now().toString()+'err', role: 'system', text: "Sistem hatası: Bağlantı kurulamadı." }])
      } finally {
        setIsProcessing(false)
        setInput('')
      }
    }, 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      processCommand(input)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ fontFamily: 'var(--font-geist-sans)', height: '70vh', maxHeight: '600px' }}
          >
            {/* Header */}
            <div className="flex items-center px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] mr-3 animate-pulse" />
              <span className="text-[11px] tracking-[0.25em] text-white/70 uppercase font-medium">Focus Terminal // JARVIS</span>
              <kbd className="ml-auto px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/50 font-mono tracking-widest uppercase">ESC</kbd>
            </div>

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth bg-gradient-to-b from-transparent to-white/[0.01]">
              {messages.map(msg => (
                <div key={msg.id} className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  {msg.role === 'system' && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-50">
                      <span className="text-[9px] tracking-widest uppercase text-emerald-400 font-mono">SYS</span>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="flex items-center gap-2 mb-1.5 opacity-50">
                      <span className="text-[9px] tracking-widest uppercase text-zinc-400 font-mono">USER</span>
                    </div>
                  )}
                  <div className={`px-4 py-3 text-[13px] leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm' 
                      : 'bg-white/[0.03] text-zinc-300 rounded-2xl rounded-tl-sm border border-white/[0.05] font-mono'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.widget && (
                    <div className="mt-3 w-full max-w-sm">
                      {msg.widget}
                    </div>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="mr-auto items-start max-w-[85%] mt-2">
                  <div className="px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] rounded-tl-sm">
                    <span className="flex gap-1.5">
                      <motion.span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }} />
                      <motion.span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                      <motion.span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/[0.06] bg-black/50">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-emerald-500 font-mono text-[13px]">{'>'}</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Komut bekliyor..."
                  className="w-full bg-white/[0.03] border border-white/10 focus:border-emerald-500/30 focus:bg-white/[0.05] transition-all rounded-xl pl-8 pr-12 py-3.5 text-white text-[13px] font-mono placeholder-zinc-600 outline-none"
                  disabled={isProcessing}
                  autoComplete="off"
                />
                <button 
                  onClick={() => input.trim() && processCommand(input)}
                  disabled={!input.trim() || isProcessing}
                  className="absolute right-2 p-2 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-30 disabled:hover:text-zinc-500"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
