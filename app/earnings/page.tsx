import Link from 'next/link';
import { requireAgent, db } from '@/lib/core';
import { getBusinessDate, addDays, formatMoney, sumDistinctRideDay } from '@/lib/format';
import { NavBar } from '@/components/ui';

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const agent = await requireAgent();
  const { view: viewParam } = await searchParams;
  const view = viewParam === 'both' ? 'both' : 'mine';

  const today = getBusinessDate();
  const from30 = addDays(today, -29);
  const from7 = addDays(today, -6);

  let query = db()
    .from('trip_history')
    .select('ride_id, agent, amount, business_day')
    .gte('business_day', from30)
    .lte('business_day', today);
  if (view === 'mine') query = query.eq('agent', agent);
  const { data: history } = await query;
  const rows = (history ?? []) as any[];

  const sum = (from: string) => sumDistinctRideDay(rows.filter((r) => r.business_day >= from) as any);

  return (
    <main className="screen">
      <header className="topbar">
        <h1>Earnings</h1>
        <div className="view-toggle">
          <Link href="/earnings?view=mine" className={view === 'mine' ? 'active' : ''}>Mine</Link>
          <Link href="/earnings?view=both" className={view === 'both' ? 'active' : ''}>Both</Link>
        </div>
      </header>

      <div className="earnings-grid">
        <div className="earnings-card">
          <p className="earnings-label">Today</p>
          <p className="earnings-value">{formatMoney(sum(today))}</p>
        </div>
        <div className="earnings-card">
          <p className="earnings-label">Last 7 days</p>
          <p className="earnings-value">{formatMoney(sum(from7))}</p>
        </div>
        <div className="earnings-card">
          <p className="earnings-label">Last 30 days</p>
          <p className="earnings-value">{formatMoney(sum(from30))}</p>
        </div>
      </div>

      <NavBar active="earnings" />
    </main>
  );
}
