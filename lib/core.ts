import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Agent } from './format';

let client: any = null;
export function db(): any {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export async function getAgent(): Promise<Agent | null> {
  const store = await cookies();
  const value = store.get('hth_agent')?.value;
  return value === 'Hamzah' || value === 'Talal' ? (value as Agent) : null;
}

export async function requireAgent(): Promise<Agent> {
  const agent = await getAgent();
  if (!agent) redirect('/login');
  return agent;
}
