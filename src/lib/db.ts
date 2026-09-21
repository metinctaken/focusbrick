import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ScheduleItem {
  id: string
  day_of_week: number   // 0=Mon … 6=Sun
  start_time: string    // "09:00"
  end_time: string      // "10:30"
  subject: string
  description: string
  color: string
  created_at: string
}

export interface DailyHabit {
  id: string
  name: string
  description: string
  category: string      // sport | health | study | general
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Completion {
  id: string
  item_type: 'schedule' | 'habit'
  item_id: string
  completed_date: string  // "2026-09-21"
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const today = () => new Date().toISOString().split('T')[0]

export const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
export const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

// JS getDay(): 0=Sun,1=Mon…6=Sat  →  our 0=Mon…6=Sun
export function todayDayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

// ── DB Functions ──────────────────────────────────────────────────────────────
const db = () => createClient()

export async function fetchSchedule(): Promise<ScheduleItem[]> {
  const { data, error } = await db()
    .from('schedule_items')
    .select('*')
    .order('day_of_week')
    .order('start_time')
  if (error) throw error
  return data ?? []
}

export async function addScheduleItem(item: Omit<ScheduleItem, 'id' | 'created_at'>): Promise<ScheduleItem> {
  const { data, error } = await db().from('schedule_items').insert(item).select().single()
  if (error) throw error
  return data
}

export async function deleteScheduleItem(id: string): Promise<void> {
  const { error } = await db().from('schedule_items').delete().eq('id', id)
  if (error) throw error
}

export async function fetchHabits(): Promise<DailyHabit[]> {
  const { data, error } = await db()
    .from('daily_habits')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function addHabit(habit: Omit<DailyHabit, 'id' | 'created_at'>): Promise<DailyHabit> {
  const { data, error } = await db().from('daily_habits').insert(habit).select().single()
  if (error) throw error
  return data
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await db().from('daily_habits').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCompletions(date?: string): Promise<Completion[]> {
  let q = db().from('completions').select('*')
  if (date) q = q.eq('completed_date', date)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function toggleCompletion(
  item_type: 'schedule' | 'habit',
  item_id: string,
  date: string,
  isCompleted: boolean
): Promise<void> {
  if (isCompleted) {
    // Remove
    const { error } = await db()
      .from('completions')
      .delete()
      .eq('item_type', item_type)
      .eq('item_id', item_id)
      .eq('completed_date', date)
    if (error) throw error
  } else {
    // Add
    const { error } = await db()
      .from('completions')
      .insert({ item_type, item_id, completed_date: date })
    if (error) throw error
  }
}

export async function fetchAllCompletions(): Promise<Completion[]> {
  const { data, error } = await db().from('completions').select('*').order('completed_date')
  if (error) throw error
  return data ?? []
}
