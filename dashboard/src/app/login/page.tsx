'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { errorText, send } from '@/lib/client';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send('/api/login', 'POST', { password });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm animate-fade-up space-y-5 p-7">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-violet text-sm font-bold text-white">N</div>
          <div>
            <div className="text-base font-semibold text-white">NIS Command Center</div>
            <div className="text-xs text-slate-500">Owner access only</div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pw" className="label">Password</label>
          <input
            id="pw"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
        </div>
        <button className="btn btn-primary w-full !py-2" disabled={busy || !password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </button>
      </form>
    </div>
  );
}
