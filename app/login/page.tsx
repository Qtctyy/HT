import { redirect } from 'next/navigation';
import { login } from '@/lib/actions';
import { getAgent } from '@/lib/core';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const agent = await getAgent();
  if (agent) redirect('/today');
  const { error } = await searchParams;

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">HTH</p>
        <h1>Dispatch</h1>
        <form action={login} className="form">
          <input type="password" name="password" placeholder="Password" required autoFocus />
          {error && <p className="error">Wrong password</p>}
          <div className="agent-pick">
            <button type="submit" name="agent" value="hamzah" className="agent-btn">Hamzah</button>
            <button type="submit" name="agent" value="talal" className="agent-btn">Talal</button>
          </div>
        </form>
      </div>
    </main>
  );
}
