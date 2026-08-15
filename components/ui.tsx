'use client';
import Link from 'next/link';
import { useState } from 'react';
import { logout } from '@/lib/actions';

export function NavBar({ active }: { active: 'today' | 'customers' | 'earnings' }) {
  return (
    <nav className="navbar">
      <Link href="/today" className={active === 'today' ? 'active' : ''}>Today</Link>
      <Link href="/customers" className={active === 'customers' ? 'active' : ''}>Customers</Link>
      <Link href="/earnings" className={active === 'earnings' ? 'active' : ''}>Earnings</Link>
      <form action={logout}>
        <button type="submit">Logout</button>
      </form>
    </nav>
  );
}

export function CliqCopyButton({ alias }: { alias: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="action-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(alias);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
    >
      {copied ? 'Copied' : 'CliQ'}
    </button>
  );
}
