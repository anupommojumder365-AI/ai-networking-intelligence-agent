'use client';

import clsx from 'clsx';
import { Play, Square, Loader2 } from 'lucide-react';
import { useAgent } from '@/hooks/useAgent';
import { dateTime, timeAgo } from '@/lib/format';

const STATE_STYLE: Record<string, { dot: string; text: string; ring: string }> = {
  Idle: { dot: 'bg-slate-500', text: 'text-slate-300', ring: 'border-line-strong' },
  Starting: { dot: 'bg-accent animate-pulse-dot', text: 'text-blue-200', ring: 'border-accent/40' },
  Running: { dot: 'bg-accent animate-pulse-dot', text: 'text-blue-200', ring: 'border-accent/40' },
  Completed: { dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'border-emerald-500/40' },
  Failed: { dot: 'bg-red-400', text: 'text-red-300', ring: 'border-red-500/40' },
  Stopping: { dot: 'bg-amber-400 animate-pulse-dot', text: 'text-amber-300', ring: 'border-amber-500/40' },
};

export function StatusPill({ state }: { state: string }) {
  const s = STATE_STYLE[state] ?? STATE_STYLE.Idle;
  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full border bg-ink-900 px-3 py-1 text-xs font-medium', s.ring, s.text)}>
      <span className={clsx('h-2 w-2 rounded-full', s.dot)} />
      {state}
    </span>
  );
}

export function AgentControl({ compact = false }: { compact?: boolean }) {
  const { data, state, busy, start, stop } = useAgent();
  const running = state === 'Running' || state === 'Stopping' || state === 'Starting';
  const latest = data?.latest;

  return (
    <div className={clsx('card', compact ? 'p-4' : 'p-5')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="label">Research agent</div>
          <div className="flex items-center gap-3">
            <StatusPill state={state} />
            {data?.stale && <span className="text-xs text-amber-300">No update for 30+ min. It will be closed out on the next start.</span>}
          </div>
          <div className="text-xs text-slate-500">
            {latest
              ? `Last run ${latest.execution_id} · started ${timeAgo(latest.started_at)}${latest.finished_at ? ` · finished ${dateTime(latest.finished_at)}` : ''}${latest.status === 'stopped' ? ' · stopped by user' : ''}`
              : 'No research has run yet.'}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={running || busy !== null} onClick={start}>
            {busy === 'start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Start Research
          </button>
          <button className="btn btn-danger" disabled={state !== 'Running' || busy !== null} onClick={stop}>
            {busy === 'stop' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            Stop Research
          </button>
        </div>
      </div>
    </div>
  );
}
