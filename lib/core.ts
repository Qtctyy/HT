import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// ---- Supabase ----
let client: ReturnType<typeof createClient> | null = null;
export function db() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// ---- Auth ----
export type Agent = 'hamzah' | 'talal';

export async function getAgent(): Promise<Agent | null> {
  const store = await cookies();
  const value = store.get('hth_agent')?.value;
  return value === 'hamzah' || value === 'talal' ? value : null;
}

export async function requireAgent(): Promise<Agent> {
  const agent = await getAgent();
  if (!agent) redirect('/login');
  return agent;
}

// ---- Day / time (Asia/Amman, day resets 4am) ----
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getBusinessDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const y = Number(map.year), m = Number(map.month), d = Number(map.day), h = Number(map.hour) % 24;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (h < 4) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = Number(hStr);
  const m = Number(mStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatMoney(amount: number): string {
  return `${amount.toFixed(3)} JOD`;
}

// ---- Recurring ride generation ----
export async function ensureGenerated(businessDate: string) {
  const weekday = weekdayOf(businessDate);
  const { data: templates, error } = await db()
    .from('recurring_rides')
    .select('id, customer_id, agent, pickup, dropoff, time, price')
    .eq('active', true)
    .contains('days_of_week', [weekday]);
  if (error || !templates || templates.length === 0) return;
  const rows = templates.map((t: any) => ({
    customer_id: t.customer_id,
    recurring_ride_id: t.id,
    agent: t.agent,
    pickup: t.pickup,
    dropoff: t.dropoff,
    time: t.time,
    price: t.price,
    business_date: businessDate,
    status: 'pending',
  }));
  await db().from('rides').upsert(rows, { onConflict: 'recurring_ride_id,business_date', ignoreDuplicates: true });
}
