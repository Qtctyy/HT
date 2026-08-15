import Link from 'next/link';
import {
  requireAgent, getBusinessDate, weekdayOf, db,
  isScheduledToday, activeLegs, legTime, legPickup, legDest, legStatus,
  formatTime, formatMoney, callLink, waLink, sumDistinctRideDay, type Leg,
} from '@/lib/core';
import { completeLeg, uncompleteLeg, skipLeg, unskipLeg, addOneOffRide } from '@/lib/actions';
import { NavBar, CliqCopyButton } from '@/components/ui';

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const agent = await requireAgent();
  const { view: viewParam } = await searchParams;
  const view = viewParam === 'both' ? 'both' : 'mine';
  const businessDate = getBusinessDate();
  const weekday = weekdayOf(businessDate);

  let query = db().from('rides').select('*');
  if (view === 'mine') query = query.eq('agent', agent);
  const { data } = await query;
  const allRides = (data ?? []) as any[];
  const todaysRides = allRides.filter((r) => isScheduledToday(r, weekday, businessDate));

  const { data: historyToday } = await db()
    .from('trip_history')
    .select('ride_id, business_day, amount')
    .eq('business_day', businessDate)
    .in('agent', view === 'both' ? ['Hamzah', 'Talal'] : [agent]);
  const earnedToday = sumDistinctRideDay((historyToday ?? []) as any[]);

  type LegItem = { ride: any; leg: Leg; status: 'pending' | 'done' | 'skipped' };
  const items: LegItem[] = [];
  for (const ride of todaysRides) {
    for (const leg of activeLegs(ride)) {
      items.push({ ride, leg, status: legStatus(ride, leg, businessDate) });
    }
  }
  const pending = items.filter((i) => i.status === 'pending').sort((a, b) => legTime(a.ride, a.leg).localeCompare(legTime(b.ride, b.leg)));
  const resolved = items.filter((i) => i.status !== 'pending');

  const { data: myCustomers } = await db().from('rides').select('id, name').eq('agent', agent).order('name');
  const seen = new Set<string>();
  const customerOptions = (myCustomers ?? []).filter((c: any) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

  function LegCard({ item }: { item: LegItem }) {
    const { ride, leg, status } = item;
    const pickup = legPickup(ride, leg);
    const dest = legDest(ride, leg);
    const telHref = callLink(ride.mobile_number);
    const waHref = waLink(ride.mobile_number);
    const uberHref = `https://m.uber.com/ul/?action=setPickup&pickup[formatted_address]=${encodeURIComponent(pickup || '')}&pickup[nickname]=${encodeURIComponent(pickup || '')}&dropoff[formatted_address]=${encodeURIComponent(dest || '')}&dropoff[nickname]=${encodeURIComponent(dest || '')}`;
    const legLabel = leg === 'to_work' ? 'To work' : 'Way back';

    return (
      <li className={`ride-card ${status !== 'pending' ? 'is-done' : ''}`}>
        <form action={status === 'done' ? uncompleteLeg : completeLeg} className="ride-check">
          <input type="hidden" name="ride_id" value={ride.id} />
          <input type="hidden" name="leg" value={leg} />
          <input type="hidden" name="name" value={ride.name} />
          <input type="hidden" name="amount" value={ride.amount} />
          <button type="submit" className="check-btn" aria-label="Toggle done" disabled={status === 'skipped'}>
            {status === 'done' ? '✓' : status === 'skipped' ? '–' : ''}
          </button>
        </form>
        <div className="ride-body">
          <div className="ride-top">
            <span className="ride-time">{formatTime(legTime(ride, leg))} · {legLabel}</span>
            <span className="ride-price">{formatMoney(Number(ride.amount))}</span>
          </div>
          <p className="ride-name">
            {ride.name}
            {view === 'both' && <span className="agent-tag">{ride.agent}</span>}
            {status === 'skipped' && <span className="agent-tag">Skipped</span>}
          </p>
          <p className="ride-route">{pickup} → {dest}</p>
          <div className="ride-actions">
            {telHref && <a href={telHref} className="action-btn">Call</a>}
            {waHref && <a href={waHref} className="action-btn" target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            <a href={uberHref} className="action-btn" target="_blank" rel="noopener noreferrer">Uber</a>
            {ride.cliq_alias && <CliqCopyButton alias={ride.cliq_alias} />}
            {status === 'pending' && (
              <form action={skipLeg}>
                <input type="hidden" name="ride_id" value={ride.id} />
                <input type="hidden" name="leg" value={leg} />
                <button type="submit" className="action-btn">Skip</button>
              </form>
            )}
            {status === 'skipped' && (
              <form action={unskipLeg}>
                <input type="hidden" name="ride_id" value={ride.id} />
                <input type="hidden" name="leg" value={leg} />
                <button type="submit" className="action-btn">Unskip</button>
              </form>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <main className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">{agent}</p>
          <h1 className="today-date">Today</h1>
        </div>
        <div className="view-toggle">
          <Link href="/today?view=mine" className={view === 'mine' ? 'active' : ''}>Mine</Link>
          <Link href="/today?view=both" className={view === 'both' ? 'active' : ''}>Both</Link>
        </div>
      </header>

      <div className="summary-strip">
        <span>{pending.length} left</span>
        <span>{resolved.filter((i) => i.status === 'done').length} done</span>
        <span>{earnedToday.toFixed(3)} JOD</span>
      </div>

      <details className="add-customer">
        <summary>+ Add one-off ride</summary>
        {(!customerOptions.length) ? (
          <p className="empty">No customers yet. <Link href="/customers">Add one first</Link>.</p>
        ) : null}
        <form action={addOneOffRide} className="form">
          <label>Name<input type="text" name="name" required /></label>
          <label>Mobile number<input type="tel" name="mobile_number" placeholder="07XXXXXXXX" /></label>
          <label>Pickup<input type="text" name="pickup" required /></label>
          <label>Dropoff<input type="text" name="dropoff" required /></label>
          <label>Time<input type="time" name="time" required /></label>
          <label>Price (JOD)<input type="number" name="amount" step="0.001" min="0" required /></label>
          <label>Date<input type="date" name="business_date" defaultValue={businessDate} required /></label>
          <button type="submit" className="primary-btn">Add ride</button>
        </form>
      </details>

      {items.length === 0 && <p className="empty">No rides today.</p>}

      <ul className="ride-list">
        {pending.map((item) => <LegCard key={`${item.ride.id}-${item.leg}`} item={item} />)}
        {resolved.map((item) => <LegCard key={`${item.ride.id}-${item.leg}`} item={item} />)}
      </ul>

      <NavBar active="today" />
    </main>
  );
}
