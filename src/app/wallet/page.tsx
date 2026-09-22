'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import Toast, { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

interface Account {
  id: string
  name: string
  color: string
  initial_balance: number
}

interface Transaction {
  id: string
  account_id: string
  amount: number
  type: 'income' | 'expense'
  description: string
  created_at: string
}

const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316']

function formatCurrency(n: number) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000000) return `${sign}₺${(abs/1000000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}₺${(abs/1000).toFixed(1)}K`
  return `${sign}₺${abs.toFixed(2)}`
}

export default function WalletPage() {
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState<string | null>(null)
  const [showTxModal, setShowTxModal]   = useState(false)
  const [showAccModal, setShowAccModal] = useState(false)
  const [saving, setSaving]             = useState(false)
  const { toasts, toast, remove }       = useToast()

  // Tx Form
  const [fAmount, setFAmount] = useState('')
  const [fDesc, setFDesc]     = useState('')
  const [fType, setFType]     = useState<'income' | 'expense'>('expense')
  const [fDate, setFDate]     = useState(new Date().toISOString().split('T')[0])

  // Acc Form
  const [aName, setAName]         = useState('')
  const [aColor, setAColor]       = useState(COLORS[0])
  const [aInitial, setAInitial]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const sb = createClient()
      const [{ data: accs, error: ae }, { data: txs, error: te }] = await Promise.all([
        sb.from('wallet_accounts').select('*').order('created_at'),
        sb.from('wallet_transactions').select('*').order('created_at', { ascending: false })
      ])
      if (ae) throw ae
      if (te) throw te
      setAccounts(accs ?? [])
      setTransactions(txs ?? [])
      if (!activeTab && accs && accs.length > 0) setActiveTab(accs[0].id)
    } catch (e: any) {
      toast(`Yükleme hatası: ${e?.message ?? 'Bilinmeyen hata'}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function saveAccount() {
    if (!aName.trim()) { toast('Hesap adı boş olamaz', 'error'); return }
    setSaving(true)
    try {
      const initialBalance = parseFloat(aInitial.replace(',', '.')) || 0
      const { data, error } = await createClient().from('wallet_accounts').insert({
        name: aName.trim(), color: aColor
      }).select().single()
      if (error) throw error

      // Başlangıç bakiyesi varsa income işlemi ekle
      if (initialBalance > 0 && data) {
        await createClient().from('wallet_transactions').insert({
          account_id: data.id, amount: initialBalance, type: 'income', description: 'Başlangıç Bakiyesi'
        })
      }

      await load()
      setShowAccModal(false)
      setAName(''); setAInitial('')
      toast('Hesap oluşturuldu ✓', 'success')
    } catch (e: any) {
      toast(`Hesap oluşturulamadı: ${e?.message ?? 'Bilinmeyen hata'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveTx() {
    if (!activeTab) return
    const amountNum = parseFloat(fAmount.replace(',', '.'))
    if (!amountNum || amountNum <= 0) { toast('Geçerli bir miktar girin', 'error'); return }
    if (!fDesc.trim()) { toast('Açıklama boş olamaz', 'error'); return }

    setSaving(true)
    try {
      const { error } = await createClient().from('wallet_transactions').insert({
        account_id: activeTab, amount: amountNum, type: fType,
        description: fDesc.trim(),
        created_at: new Date(fDate).toISOString()
      })
      if (error) throw error
      await load()
      setShowTxModal(false)
      setFAmount(''); setFDesc('')
      toast('İşlem eklendi ✓', 'success')
    } catch (e: any) {
      toast(`Kaydedilemedi: ${e?.message ?? 'Bilinmeyen hata'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function delTx(id: string) {
    if (!confirm('Bu işlemi silmek istediğine emin misin?')) return
    try {
      const { error } = await createClient().from('wallet_transactions').delete().eq('id', id)
      if (error) throw error
      await load()
      toast('İşlem silindi', 'info')
    } catch { toast('Silme başarısız', 'error') }
  }

  async function delAcc(id: string) {
    if (!confirm('Hesabı ve tüm işlemleri silmek istiyor musun?')) return
    try {
      const { error } = await createClient().from('wallet_accounts').delete().eq('id', id)
      if (error) throw error
      if (activeTab === id) setActiveTab(accounts.find(a => a.id !== id)?.id ?? null)
      await load()
      toast('Hesap silindi', 'info')
    } catch { toast('Hesap silinemedi', 'error') }
  }

  const activeAcc  = accounts.find(a => a.id === activeTab)
  const activeTxs  = transactions.filter(t => t.account_id === activeTab)
  const income     = activeTxs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const expense    = activeTxs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const balance    = income - expense
  const totalAll   = transactions.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)

  const balancePct = income + expense > 0 ? Math.round((income / (income + expense)) * 100) : 50

  return (
    <DashboardLayout>
      <Toast toasts={toasts} remove={remove} />
      <div style={{ fontFamily: 'var(--font-geist-sans)' }} className="max-w-5xl">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-2">Bütçe Takibi</p>
            <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Kasa</h1>
          </div>
          <div className="flex gap-3">
            {activeTab && (
              <button onClick={() => { setFType('expense'); setShowTxModal(true) }}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[11px] tracking-[0.25em] uppercase text-zinc-400 hover:text-white hover:border-white/20 transition-all duration-200">
                + İşlem
              </button>
            )}
            <button onClick={() => setShowAccModal(true)}
              className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-[11px] tracking-[0.25em] uppercase text-white transition-all duration-200 hover:bg-white hover:text-black">
              + Hesap
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-600"
                  animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.2 }} />
              ))}
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl border border-white/[0.05] bg-white/[0.01] py-16 text-center">
            <p className="text-[12px] tracking-[0.3em] text-zinc-500 uppercase mb-6">Henüz hesap yok</p>
            <button onClick={() => setShowAccModal(true)}
              className="px-6 py-3 bg-white text-black text-[11px] uppercase tracking-widest font-bold rounded-lg hover:bg-zinc-200 transition">
              İlk Hesabını Oluştur
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>

            {/* Global top stat */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="col-span-1 md:col-span-2 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.02] -translate-y-8 translate-x-8" />
                <p className="text-[9px] tracking-[0.4em] text-zinc-500 uppercase mb-3">Toplam Net Bakiye</p>
                <p className={`text-[36px] font-bold leading-none ${totalAll >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {formatCurrency(totalAll)}
                </p>
                <p className="text-[9px] text-zinc-600 mt-3">{accounts.length} hesap</p>
              </div>
              
              {accounts.map(acc => {
                const txs = transactions.filter(t => t.account_id === acc.id)
                const bal = txs.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)
                return (
                  <div key={acc.id} onClick={() => setActiveTab(acc.id)} className={`rounded-2xl border p-6 cursor-pointer transition-all duration-200 relative overflow-hidden
                    ${activeTab === acc.id ? 'border-white/20 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10'}`}>
                    <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(to right, transparent, ${acc.color}80, transparent)` }} />
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: acc.color }} />
                    </div>
                    <p className="text-[10px] tracking-widest text-zinc-400 uppercase truncate mb-2">{acc.name}</p>
                    <p className={`text-[24px] font-bold leading-none ${bal >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(bal)}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-6">
              {/* Right: Active account details */}
              <div className="flex-1 min-w-0">
                {activeTab && activeAcc ? (
                  <>
                    {/* Account header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeAcc.color }} />
                        <p className="text-[15px] font-semibold text-white">{activeAcc.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => delAcc(activeAcc.id)}
                          className="w-7 h-7 rounded-lg border border-white/[0.05] flex items-center justify-center text-zinc-600 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                          title="Hesabı Sil">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                        <button onClick={() => { setFType('expense'); setShowTxModal(true) }}
                          className="text-[9px] tracking-[0.35em] text-zinc-400 uppercase border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white hover:text-black transition-all">
                          + İşlem Ekle
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                      <div className={`col-span-2 sm:col-span-1 rounded-xl border p-4 ${balance >= 0 ? 'border-white/10 bg-white/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'}`}>
                        <p className="text-[8px] tracking-[0.35em] text-zinc-500 uppercase mb-2">Bakiye</p>
                        <p className={`text-[24px] font-bold leading-none ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(balance)}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
                        <p className="text-[8px] tracking-[0.35em] text-emerald-500/70 uppercase mb-2">Toplam Gelir</p>
                        <p className="text-[18px] font-bold text-emerald-400 leading-none">{formatCurrency(income)}</p>
                      </div>
                      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-4">
                        <p className="text-[8px] tracking-[0.35em] text-red-500/70 uppercase mb-2">Toplam Gider</p>
                        <p className="text-[18px] font-bold text-red-400 leading-none">{formatCurrency(expense)}</p>
                      </div>
                    </div>

                    {/* Gelir/Gider bar */}
                    {(income + expense) > 0 && (
                      <div className="mb-5">
                        <div className="flex justify-between text-[8px] tracking-widest uppercase mb-1.5">
                          <span className="text-emerald-500/70">Gelir %{balancePct}</span>
                          <span className="text-red-500/70">Gider %{100 - balancePct}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden flex">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${balancePct}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-emerald-500 rounded-l-full" />
                          <motion.div initial={{ width: 0 }} animate={{ width: `${100 - balancePct}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-red-500 rounded-r-full" />
                        </div>
                      </div>
                    )}

                    {/* Transactions */}
                    <div className="space-y-1">
                      {activeTxs.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-white/[0.05] rounded-xl">
                          <p className="text-[10px] tracking-widest text-zinc-700 uppercase">Henüz işlem yok</p>
                          <p className="text-[9px] text-zinc-800 mt-1">Sağ üstten işlem ekle</p>
                        </div>
                      ) : activeTxs.map((t, i) => (
                        <motion.div key={t.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="group flex items-center gap-3 md:gap-4 px-3 md:px-4 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all"
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                            ${t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            <span className="text-[12px]">{t.type === 'income' ? '↑' : '↓'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] md:text-[12px] font-medium text-white truncate">{t.description}</p>
                            <p className="text-[9px] text-zinc-600 tracking-wider mt-0.5">
                              {new Date(t.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            <span className={`text-[12px] md:text-[14px] font-bold tabular-nums ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </span>
                            <button onClick={() => delTx(t.id)}
                              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-7 h-7 md:w-6 md:h-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-[14px] md:text-[12px]">×</button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-zinc-700 text-[11px] tracking-widest uppercase">Bir hesap seç</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Account Modal */}
      <AnimatePresence>
        {showAccModal && (
          <ModalWrapper close={() => { if (!saving) setShowAccModal(false) }}>
            <p className="text-[10px] tracking-[0.4em] text-zinc-400 uppercase mb-7">Yeni Hesap Oluştur</p>

            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Hesap Adı</label>
                <input value={aName} onChange={e => setAName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white outline-none focus:border-white/25 transition-all placeholder-zinc-700"
                  placeholder="Örn: Nakit, Ziraat, Birikim..." autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveAccount()} />
              </div>

              <div>
                <label className="block mb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Başlangıç Bakiyesi (₺)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[13px]">₺</span>
                  <input type="number" step="0.01" min="0" value={aInitial} onChange={e => setAInitial(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-4 py-3 text-[13px] text-white outline-none focus:border-white/25 transition-all placeholder-zinc-700 font-mono"
                    placeholder="0.00" />
                </div>
                <p className="text-[9px] text-zinc-700 mt-1.5">Mevcut bakiyeni gir (opsiyonel)</p>
              </div>

              <div>
                <label className="block mb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Renk</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setAColor(c)}
                      className={`h-7 w-7 rounded-full transition-all duration-150 ${aColor === c ? 'ring-2 ring-offset-2 ring-offset-zinc-950 scale-110' : 'opacity-40 hover:opacity-80'}`}
                      style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties} />
                  ))}
                </div>
              </div>
            </div>

            <ModalButtons close={() => setShowAccModal(false)} save={saveAccount} saving={saving} label="Hesap Oluştur" />
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTxModal && (
          <ModalWrapper close={() => { if (!saving) setShowTxModal(false) }}>
            <p className="text-[10px] tracking-[0.4em] text-zinc-400 uppercase mb-6">İşlem Ekle</p>

            {/* Gelir/Gider toggle */}
            <div className="flex bg-white/[0.03] p-1 rounded-xl mb-5 border border-white/[0.05]">
              <button onClick={() => setFType('expense')}
                className={`flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all
                  ${fType === 'expense' ? 'bg-red-500/20 text-red-400 shadow-inner' : 'text-zinc-600 hover:text-zinc-400'}`}>
                ↓ Gider
              </button>
              <button onClick={() => setFType('income')}
                className={`flex-1 py-2.5 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all
                  ${fType === 'income' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'text-zinc-600 hover:text-zinc-400'}`}>
                ↑ Gelir
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Miktar (₺)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[13px]">₺</span>
                  <input type="number" step="0.01" min="0" value={fAmount} onChange={e => setFAmount(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-4 py-3 text-[18px] text-white outline-none focus:border-white/25 transition-all font-mono placeholder-zinc-700"
                    placeholder="0.00" autoFocus />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Açıklama</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white outline-none focus:border-white/25 transition-all placeholder-zinc-700"
                  placeholder={fType === 'expense' ? 'Yemek, market, fatura...' : 'Maaş, harçlık, ek gelir...'}
                  onKeyDown={e => e.key === 'Enter' && saveTx()} />
              </div>
              <div>
                <label className="block mb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">Tarih</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white outline-none focus:border-white/25 transition-all"
                  style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <ModalButtons close={() => setShowTxModal(false)} save={saveTx} saving={saving}
              label={fType === 'income' ? '+ Gelir Ekle' : '− Gider Ekle'} />
          </ModalWrapper>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

function ModalWrapper({ children, close }: { children: React.ReactNode, close: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.94 }} animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-950 p-7 shadow-2xl shadow-black/50"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function ModalButtons({ close, save, saving, label }: { close: () => void, save: () => void, saving: boolean, label: string }) {
  return (
    <div className="flex gap-3 mt-7">
      <button onClick={close} disabled={saving}
        className="flex-1 rounded-xl border border-white/10 py-3 text-[10px] tracking-[0.3em] uppercase text-zinc-600 hover:text-white hover:border-white/20 transition-all">
        İptal
      </button>
      <button onClick={save} disabled={saving}
        className="flex-1 rounded-xl border border-white/20 py-3 text-[10px] tracking-[0.3em] uppercase text-white hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? (
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>◌</motion.span>
        ) : label}
      </button>
    </div>
  )
}
