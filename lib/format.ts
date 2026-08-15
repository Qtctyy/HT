export type Agent = 'Hamzah' | 'Talal';
export type Leg = 'to_work' | 'way_back';

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getBusinessDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Amman',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
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

export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
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

export function toIntlDigits(mobile: string | null | undefined): string | null {
  if (!mobile) return null;
  let digits = mobile.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('962')) return digits;
  if (digits.startsWith('0')) return '962' + digits.slice(1);
  return '962' + digits;
}
export function waLink(mobile: string | null | undefined): string | null {
  const num = toIntlDigits(mobile);
  return num ? `https://wa.me/${num}` : null;
}
export function callLink(mobile: string | null | undefined): string | null {
  const num = toIntlDigits(mobile);
  return num ? `tel:+${num}` : null;
}

export function activeLegs(ride: any): Leg[] {
  const legs: Leg[] = [];
  if (ride.to_work_enabled !== false && ride.to_work_time) legs.push('to_work');
  if (ride.way_back_enabled !== false && ride.way_back_time) legs.push('way_back');
  return legs;
}

export function isScheduledToday(ride: any, weekday: number, dateStr: string): boolean {
  if (ride.active === false) return false;
  if (activeLegs(ride).length === 0) return false;
  if (ride.one_time_date) return ride.one_time_date === dateStr;
  if (!ride.days_of_week || ride.days_of_week.length === 0) return true;
  return ride.days_of_week.includes(weekday);
}

export function legTime(ride: any, leg: Leg): string { return leg === 'to_work' ? ride.to_work_time : ride.way_back_time; }
export function legPickup(ride: any, leg: Leg): string { return leg === 'to_work' ? ride.to_work_pickup : ride.way_back_pickup; }
export function legDest(ride: any, leg: Leg): string { return leg === 'to_work' ? ride.to_work_dest : ride.way_back_dest; }
export function legCompletedField(leg: Leg): string { return leg === 'to_work' ? 'to_work_completed_date' : 'way_back_completed_date'; }
export function legSkippedField(leg: Leg): string { return leg === 'to_work' ? 'to_work_skipped_date' : 'way_back_skipped_date'; }

export function legStatus(ride: any, leg: Leg, businessDay: string): 'pending' | 'done' | 'skipped' {
  if (ride[legCompletedField(leg)] === businessDay) return 'done';
  if (ride[legSkippedField(leg)] === businessDay) return 'skipped';
  return 'pending';
}

export function sumDistinctRideDay(entries: { ride_id: string; business_day: string; amount: number }[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const h of entries) {
    const key = `${h.ride_id}-${h.business_day}`;
    if (!seen.has(key)) {
      seen.add(key);
      total += Number(h.amount) || 0;
    }
  }
  return total;
}
