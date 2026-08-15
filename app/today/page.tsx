import Link from 'next/link';
import { requireAgent, db } from '@/lib/core';
import {
  getBusinessDate, weekdayOf, isScheduledToday, activeLegs,
  legTime, legPickup, legDest, legStatus, sumDistinctRideDay,
} from '@/lib/format';
import { addOneOffRide } from '@/lib/actions';
import { NavBar } from '@/components/ui';
import { RideList } from '@/components/RideList';

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

  let ridesQuery = db().from('rides').select('*');
  if (view === 'mine') ridesQuery = ridesQuery.eq('agent', agent);

  let historyQuery = db()
    .from('trip_history')
    .select('ride_id, business_day, amount')
    .eq('business_day', businessDate);
  if (view === 'mine') historyQuery = historyQuery.eq('agent', agent);

  const [{ data: rideRows }, { data: historyRows }] = await Promise.all([ridesQuery, historyQuery]);

  const allRides = (rideRows ?? []) as any[];
  const todaysRides = allRides.filter((r) => isScheduledToday(r, weekday, businessDate));
  const earnedToday = sumDistinctRideDay((historyRows ?? []) as any[]);

  const items = todaysRides.map((ride) => ({
    rideId: ride.id as string,
    name: ride.name as string,
    agent: ride.agent as string,
    amount: Number(ride.amount) || 0,
    mobileNumber: ride.mobile_number as string | null,
    cliqAlias: ride.cliq_alias as string | null,
    legs: activeLegs(ride).map((leg) => ({
      leg,
      label: leg === 'to_work' ? 'To work' : 'Way back',
      time: legTime(ride, leg) as string,
      pickup: (legPickup(ride, leg) as string) || '',
      dropoff: (legDest(ride, leg) as string) || '',
      status: legStatus(ride, leg, businessDate),
    })),
  }));

  const doneCount = items.reduce((n, r) => n + r.legs.filter((l) => l.status === 'done').length, 0);
  const pendingCount = items.reduce((n, r) => n + r.legs.filter((l) => l.status === 'pending').length, 0);

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
        <span>{pendingCount} left</span>
        <span>{doneCount} done</span>
        <span>{earnedToday.toFixed(3)} JOD</span>
      </div>

      <details className="add-customer">
        <summary>+ Add one-off ride</summary>
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

      <RideList initialItems={items} view={view} />

      <NavBar active="today" />
    </main>
  );
}
