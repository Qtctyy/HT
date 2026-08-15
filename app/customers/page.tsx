import Link from 'next/link';
import { requireAgent, db, DAY_LABELS } from '@/lib/core';
import { saveRide, toggleActive, deleteRide } from '@/lib/actions';
import { NavBar } from '@/components/ui';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; id?: string }>;
}) {
  const agent = await requireAgent();
  const { view: viewParam, id } = await searchParams;
  const view = viewParam === 'both' ? 'both' : 'mine';

  if (id) {
    const { data: ride } = await db().from('rides').select('*').eq('id', id).single();
    if (!ride) {
      return (
        <main className="screen">
          <p>Customer not found.</p>
          <Link href="/customers">Back</Link>
        </main>
      );
    }
    return (
      <main className="screen">
        <header className="topbar">
          <h1>{ride.name}</h1>
          <Link href="/customers">Back</Link>
        </header>

        <form action={saveRide} className="form">
          <input type="hidden" name="id" value={ride.id} />
          <label>Name<input type="text" name="name" defaultValue={ride.name} required /></label>
          <label>Mobile number<input type="tel" name="mobile_number" defaultValue={ride.mobile_number ?? ''} placeholder="07XXXXXXXX" /></label>
          <label>CliQ alias<input type="text" name="cliq_alias" defaultValue={ride.cliq_alias ?? ''} /></label>
          <label>Building #<input type="text" name="building_number" defaultValue={ride.building_number ?? ''} /></label>
          <label>Street<input type="text" name="street_name" defaultValue={ride.street_name ?? ''} /></label>
          <label>Price (JOD)<input type="number" name="amount" step="0.001" min="0" defaultValue={ride.amount ?? 0} required /></label>
          <label>Notes<input type="text" name="notes" defaultValue={ride.notes ?? ''} /></label>

          <fieldset className="days-picker">
            <legend>To work</legend>
            <label className="day-check"><input type="checkbox" name="to_work_enabled" defaultChecked={ride.to_work_enabled !== false} /> Enabled</label>
          </fieldset>
          <label>Pickup<input type="text" name="to_work_pickup" defaultValue={ride.to_work_pickup ?? ''} /></label>
          <label>Destination<input type="text" name="to_work_dest" defaultValue={ride.to_work_dest ?? ''} /></label>
          <label>Time<input type="time" name="to_work_time" defaultValue={ride.to_work_time ?? ''} /></label>

          <fieldset className="days-picker">
            <legend>Way back</legend>
            <label className="day-check"><input type="checkbox" name="way_back_enabled" defaultChecked={ride.way_back_enabled !== false} /> Enabled</label>
          </fieldset>
          <label>Pickup<input type="text" name="way_back_pickup" defaultValue={ride.way_back_pickup ?? ''} /></label>
          <label>Destination<input type="text" name="way_back_dest" defaultValue={ride.way_back_dest ?? ''} /></label>
          <label>Time<input type="time" name="way_back_time" defaultValue={ride.way_back_time ?? ''} /></label>

          <fieldset className="days-picker">
            <legend>Days (leave all unchecked for every day)</legend>
            {DAY_LABELS.map((label, i) => (
              <label key={i} className="day-check">
                <input type="checkbox" name="days" value={i} defaultChecked={(ride.days_of_week ?? []).includes(i)} />
                {label}
              </label>
            ))}
          </fieldset>
          <label>One-time date (overrides days above)<input type="date" name="one_time_date" defaultValue={ride.one_time_date ?? ''} /></label>

          <button type="submit" className="primary-btn">Save</button>
        </form>

        <form action={toggleActive}>
          <input type="hidden" name="id" value={ride.id} />
          <input type="hidden" name="active" value={String(ride.active !== false)} />
          <button type="submit" className="action-btn">{ride.active === false ? 'Resume' : 'Pause'}</button>
        </form>

        <form action={deleteRide}>
          <input type="hidden" name="id" value={ride.id} />
          <button type="submit" className="danger-btn">Delete customer</button>
        </form>
      </main>
    );
  }

  let query = db().from('rides').select('id, name, mobile_number, agent, active').order('name');
  if (view === 'mine') query = query.eq('agent', agent);
  const { data: customers } = await query;

  return (
    <main className="screen">
      <header className="topbar">
        <h1>Customers</h1>
        <div className="view-toggle">
          <Link href="/customers?view=mine" className={view === 'mine' ? 'active' : ''}>Mine</Link>
          <Link href="/customers?view=both" className={view === 'both' ? 'active' : ''}>Both</Link>
        </div>
      </header>

      <ul className="customer-list">
        {(customers ?? []).map((c: any) => (
          <li key={c.id}>
            <Link href={`/customers?id=${c.id}`} className="customer-row" style={c.active === false ? { opacity: 0.5 } : undefined}>
              <span>{c.name}</span>
              {view === 'both' && <span className="agent-tag">{c.agent}</span>}
            </Link>
          </li>
        ))}
      </ul>
      {customers?.length === 0 && <p className="empty">No customers yet.</p>}

      <details className="add-customer">
        <summary>+ Add customer</summary>
        <form action={saveRide} className="form">
          <label>Name<input type="text" name="name" required /></label>
          <label>Mobile number<input type="tel" name="mobile_number" placeholder="07XXXXXXXX" required /></label>
          <label>Price (JOD)<input type="number" name="amount" step="0.001" min="0" required /></label>
          <fieldset className="days-picker">
            <legend>To work</legend>
            <label className="day-check"><input type="checkbox" name="to_work_enabled" defaultChecked /> Enabled</label>
          </fieldset>
          <label>Pickup<input type="text" name="to_work_pickup" /></label>
          <label>Destination<input type="text" name="to_work_dest" /></label>
          <label>Time<input type="time" name="to_work_time" /></label>
          <fieldset className="days-picker">
            <legend>Way back</legend>
            <label className="day-check"><input type="checkbox" name="way_back_enabled" defaultChecked /> Enabled</label>
          </fieldset>
          <label>Pickup<input type="text" name="way_back_pickup" /></label>
          <label>Destination<input type="text" name="way_back_dest" /></label>
          <label>Time<input type="time" name="way_back_time" /></label>
          <fieldset className="days-picker">
            <legend>Days (leave all unchecked for every day)</legend>
            {DAY_LABELS.map((label, i) => (
              <label key={i} className="day-check">
                <input type="checkbox" name="days" value={i} />
                {label}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="primary-btn">Save customer</button>
        </form>
      </details>

      <NavBar active="customers" />
    </main>
  );
}
