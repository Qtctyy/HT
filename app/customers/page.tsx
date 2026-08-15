import Link from 'next/link';
import { requireAgent, db, formatTime, formatMoney, DAY_LABELS } from '@/lib/core';
import {
  addCustomer, updateCustomer, deleteCustomer,
  addRecurringRide, toggleRecurringRide, deleteRecurringRide,
} from '@/lib/actions';
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
    const { data: customer } = await db().from('customers').select('*').eq('id', id).single();
    if (!customer) {
      return (
        <main className="screen">
          <p>Customer not found.</p>
          <Link href="/customers">Back</Link>
        </main>
      );
    }
    const { data: rides } = await db().from('recurring_rides').select('*').eq('customer_id', id).order('time');

    return (
      <main className="screen">
        <header className="topbar">
          <h1>{customer.name as string}</h1>
          <Link href="/customers">Back</Link>
        </header>

        <form action={updateCustomer} className="form">
          <input type="hidden" name="id" value={customer.id as string} />
          <label>Name<input type="text" name="name" defaultValue={customer.name as string} required /></label>
          <label>Phone<input type="tel" name="phone" defaultValue={customer.phone as string} required /></label>
          <label>CliQ alias<input type="text" name="cliq_alias" defaultValue={(customer.cliq_alias as string) ?? ''} /></label>
          <button type="submit" className="primary-btn">Save</button>
        </form>

        <form action={deleteCustomer}>
          <input type="hidden" name="id" value={customer.id as string} />
          <button type="submit" className="danger-btn">Delete customer</button>
        </form>

        <h2 className="section-title">Recurring rides</h2>
        <ul className="recurring-list">
          {(rides ?? []).map((r: any) => (
            <li key={r.id} className={`recurring-row ${r.active ? '' : 'is-paused'}`}>
              <p>{formatTime(r.time)} · {r.pickup} → {r.dropoff} · {formatMoney(Number(r.price))}</p>
              <p className="days-row">{(r.days_of_week as number[]).map((d: number) => DAY_LABELS[d]).join(' ')}</p>
              <div className="row-actions">
                <form action={toggleRecurringRide}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={String(r.active)} />
                  <button type="submit">{r.active ? 'Pause' : 'Resume'}</button>
                </form>
                <form action={deleteRecurringRide}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        {rides?.length === 0 && <p className="empty">No recurring rides yet.</p>}

        <details className="add-customer">
          <summary>+ Add recurring ride</summary>
          <form action={addRecurringRide} className="form">
            <input type="hidden" name="customer_id" value={customer.id as string} />
            <label>Pickup<input type="text" name="pickup" required /></label>
            <label>Dropoff<input type="text" name="dropoff" required /></label>
            <label>Time<input type="time" name="time" required /></label>
            <label>Price (JOD)<input type="number" name="price" step="0.001" min="0" required /></label>
            <fieldset className="days-picker">
              <legend>Days</legend>
              {DAY_LABELS.map((label, i) => (
                <label key={i} className="day-check">
                  <input type="checkbox" name="days" value={i} />
                  {label}
                </label>
              ))}
            </fieldset>
            <button type="submit" className="primary-btn">Add recurring ride</button>
          </form>
        </details>
      </main>
    );
  }

  let query = db().from('customers').select('id, name, phone, agent').order('name');
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
            <Link href={`/customers?id=${c.id}`} className="customer-row">
              <span>{c.name}</span>
              {view === 'both' && <span className="agent-tag">{c.agent}</span>}
            </Link>
          </li>
        ))}
      </ul>
      {customers?.length === 0 && <p className="empty">No customers yet.</p>}

      <details className="add-customer">
        <summary>+ Add customer</summary>
        <form action={addCustomer} className="form">
          <label>Name<input type="text" name="name" required /></label>
          <label>Phone<input type="tel" name="phone" placeholder="+9627XXXXXXXX" required /></label>
          <label>CliQ alias (optional)<input type="text" name="cliq_alias" /></label>
          <button type="submit" className="primary-btn">Save customer</button>
        </form>
      </details>

      <NavBar active="customers" />
    </main>
  );
}
