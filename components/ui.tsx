'use client';

import { useState } from 'react';
import Link from 'next/link';

export function NavBar({ active }: { active?: string }) {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold">
          HT Dispatch
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/today"
            className={active === 'today' ? 'font-semibold' : ''}
          >
            Today
          </Link>

          <Link
            href="/customers"
            className={active === 'customers' ? 'font-semibold' : ''}
          >
            Customers
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function CliqCopyButton({
  value,
  alias,
}: {
  value?: string;
  alias?: string;
}) {
  const [copied, setCopied] = useState(false);

  const text = alias ?? value ?? '';

  async function copy() {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
