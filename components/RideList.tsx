'use client';
import { useOptimistic, useTransition } from 'react';
import { formatTime, formatMoney, callLink, waLink, type Leg } from '@/lib/format';
import { completeLeg, uncompleteLeg, skipLeg, unskipLeg } from '@/lib/actions';
import { CliqCopyButton } from '@/components/ui';

type LegStatus = 'pending' | 'done' | 'skipped';
type LegItem = { leg: Leg; label: string; time: string; pickup: string; dropoff: string; status: LegStatus };
type RideItem = {
  rideId: string; name: string; agent: string; amount: number;
  mobileNumber: string | null; cliqAlias: string | null; legs: LegItem[];
};
type Update = { rideId: string; leg: Leg; status: LegStatus };

export function RideList({ initialItems, view }: { initialItems: RideItem[]; view: 'mine' | 'both' }) {
  const [items, applyOptimistic] = useOptimistic(initialItems, (state: RideItem[], update: Update) =>
    state.map((r) =>
      r.rideId === update.rideId
        ? { ...r, legs: r.legs.map((l) => (l.leg === update.leg ? { ...l, status: update.status } : l)) }
        : r
    )
  );
  const [, startTransition] = useTransition();

  function act(ride: RideItem, leg: LegItem, nextStatus: LegStatus) {
    startTransition(async () => {
      applyOptimistic({ rideId: ride.rideId, leg: leg.leg, status: nextStatus });
      const fd = new FormData();
      fd.set('ride_id', ride.rideId);
      fd.set('leg', leg.leg);
      fd.set('name', ride.name);
      fd.set('amount', String(ride.amount));
      if (nextStatus === 'done') await completeLeg(fd);
      else if (leg.status === 'skipped') await unskipLeg(fd);
      else if (nextStatus === 'skipped') await skipLeg(fd);
      else await uncompleteLeg(fd);
    });
  }

  const pending = [...items].filter((r) => r.legs.some((l) => l.status === 'pending'));
  const resolved = items.filter((r) => r.legs.every((l) => l.status !== 'pending'));

  pending.sort((a, b) => {
    const at = a.legs.find((l) => l.status === 'pending')?.time ?? '';
    const bt = b.legs.find((l) => l.status === 'pending')?.time ?? '';
    return at.localeCompare(bt);
  });

  function Card({ ride }: { ride: RideItem }) {
    const allResolved = ride.legs.every((l) => l.status !== 'pending');
    const telHref = callLink(ride.mobileNumber);
    const waHref = waLink(ride.mobileNumber);

    return (
      <li className={`ride-card ${allResolved ? 'is-done' : ''}`}>
        <div className="ride-card-header">
          <div>
            <p className="ride-name">
              {ride.name}
              {view === 'both' && <span className="agent-tag">{ride.agent}</span>}
            </p>
            <p className="ride-price">{formatMoney(ride.amount)}</p>
          </div>
          <div className="ride-actions">
            {telHref && <a href={telHref} className="action-btn">Call</a>}
            {waHref && <a href={waHref} className="action-btn" target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {ride.cliqAlias && <CliqCopyButton alias={ride.cliqAlias} />}
          </div>
        </div>

        <div className="leg-rows">
          {ride.legs.map((leg) => {
            const uberHref = `https://m.uber.com/ul/?action=setPickup&pickup[formatted_address]=${encodeURIComponent(leg.pickup)}&pickup[nickname]=${encodeURIComponent(leg.pickup)}&dropoff[formatted_address]=${encodeURIComponent(leg.dropoff)}&dropoff[nickname]=${encodeURIComponent(leg.dropoff)}`;
            return (
              <div key={leg.leg} className={`leg-row leg-${leg.leg} status-${leg.status}`}>
                <button
                  type="button"
                  className="check-btn small"
                  disabled={leg.status === 'skipped'}
                  onClick={() => act(ride, leg, leg.status === 'done' ? 'pending' : 'done')}
                  aria-label="Toggle done"
                >
                  {leg.status === 'done' ? '✓' : leg.status === 'skipped' ? '–' : ''}
                </button>
                <div className="leg-info">
                  <span className="leg-meta">{leg.label} · {formatTime(leg.time)}</span>
                  <span className="leg-route">{leg.pickup} → {leg.dropoff}</span>
                </div>
                <div className="leg-actions">
                  <a href={uberHref} className="mini-link" target="_blank" rel="noopener noreferrer">Uber</a>
                  {leg.status === 'pending' && (
                    <button type="button" className="mini-link" onClick={() => act(ride, leg, 'skipped')}>Skip</button>
                  )}
                  {leg.status === 'skipped' && (
                    <button type="button" className="mini-link" onClick={() => act(ride, leg, 'pending')}>Unskip</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </li>
    );
  }

  return (
    <ul className="ride-list">
      {pending.map((ride) => <Card key={ride.rideId} ride={ride} />)}
      {resolved.map((ride) => <Card key={ride.rideId} ride={ride} />)}
    </ul>
  );
}
