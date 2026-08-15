import Link from 'next/link';
import { requireAgent, getBusinessDate, ensureGenerated, formatTime, formatMoney, db } from '@/lib/core';
import { markDone, unmarkDone, addOneOffRide } from '@/lib/actions';
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

  await ensureGenerated(businessDate);

  let query = db()
    .from('rides')
    .select('id, pickup, dropoff, time, price, status, agent, customers(name, phone, cliq_alias)')
    .eq('business_date', businessDate)
    .order('time', { ascending: true });
  if (view === 'mine') query = query.eq('agent', agent);
  const { data } = await query;
  const rides = (data ?? []) as any[];

  const pending = rides.filter((r) => r.status === 'pending');
  const done = rides.filter((r) => r.status === 'done');
  const earnedToday = done.reduce((sum, r) => sum + Number(r.price), 0);

  const { data: myCustomers } = await db().from('customers').select('id, name').eq('agent', agent).order('name');

  function RideRow({ ride, isDone }: { ride: any; isDone: boolean }) {
    const customer = ride.customers;
    const phone = customer?.phone ?? '';
    const telHref = phone ? `tel:${phone}` : undefined;
    const waHref = phone ? `https://wa.me/${phone.replace(/[^\d]/g, '')}` : undefined;
    const uberHref = `https://m.uber.com/ul/?action=setPickup&pickup[formatted_address]=${encodeURIComponent(ride.pickup)}&pickup[nickname]=${encodeURIComponent(ride.pickup)}&dropoff[formatted_address]=${encodeURIComponent(ride.dropoff)}&dropoff[nickname]=${encodeURIComponent(ride.dropoff)}`;
    return (
      <li className={`ride-card ${isDone ? 'is-done' : ''}`}>
        <form action={isDone ? unmarkDone : markDone} className="ride-check">
          <input type="hidden" name="id" value={ride.id} />
          <button type="submit" className="check-btn" aria-label={isDone ? 'Mark as not done' : 'Mark as done'}>
            {isDone ? '✓' : ''}
          </button>
        </form>
        <div className="ride-body">
          <div className="ride-top">
            <span className="ride-time">{formatTime(ride.time)}</span>
            <span className="ride-price">{formatMoney(Number(ride.price))}</span>
          </div>
          <p className="ride-name">
            {customer?.name ?? 'Unknown customer'}
            {view === 'both' && <span className="agent-tag">{ride.agent}</span>}
          </p>
          <p className="ride-route">{ride.pickup} → {ride.dropoff}</p>
          <div className="ride-actions">
            {telHref && <a href={telHref} className="action-btn">Call</a>}
            {waHref && <a href={waHref} className="action-btn" target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            <a href={uberHref} className="action-btn" target="_blank" rel="noopener noreferrer">Uber</a>
            {customer?.cliq_alias && <CliqCopyButton alias={customer.cliq_alias} />}
          </div>
        </div>
      </li>
    );
  }

  return (
    <main className="screen">
      <header className="topbar">
        <div>
          <p className="eyebrow">{agent === 'hamzah' ? 'Hamzah' : 'Talal'}</p>
          <h1 className="today-date">Today</h1>
        </div>
        <div className="view-toggle">
          <Link href="/today?view=mine" className={view === 'mine' ? 'active' : ''}>Mine</Link>
          <Link href="/today?view=both" className={view === 'both' ? 'active' : ''}>Both</Link>
        </div>
      </header>

      <div className="summary-strip">
        <span>{pending.length} left</span>
        <span>{done.length} done</span>
        <span>{earnedToday.toFixed(3)} JOD</span>
      </div>

      <details className="add-customer">
        <summary>+ Add ride</summary>
        {(!myCustomers || myCustomers.length === 0) ? (
          <p className="empty">No customers yet. <Link href="/customers">Add one first</Link>.</p>
        ) : (
          <form action={addOneOffRide} className="form">
            <label>Customer
              <select name="customer_id" required>
                {myCustomers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Pickup<input type="text" name="pickup" required /></label>
            <label>Dropoff<input type="text" name="dropoff" required /></label>
            <label>Time<input type="time" name="time" required /></label>
            <label>Price (JOD)<input type="number" name="price" step="0.001" min="0" required /></label>
            <label>Date<input type="date" name="business_date" defaultValue={businessDate} required /></label>
            <button type="submit" className="primary-btn">Add ride</button>
          </form>
        )}
      </details>

      {rides.length === 0 && <p className="empty">No rides today.</p>}

      <ul className="ride-list">
        {pending.map((ride) => <RideRow key={ride.id} ride={ride} isDone={false} />)}
        {done.map((ride) => <RideRow key={ride.id} ride={ride} isDone />)}
      </ul>

      <NavBar active="today" />
    </main>
  );
}
