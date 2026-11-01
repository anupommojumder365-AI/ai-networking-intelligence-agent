'use client';

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';
import { CATEGORY_LABEL, tierLabel } from '@/lib/format';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, loading }: { label: string; value: ReactNode; hint?: string; loading?: boolean }) {
  return (
    <div className="card animate-fade-up p-4">
      <div className="label">{label}</div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-ink-700" />
      ) : (
        <div className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-white">{value}</div>
      )}
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  blue: 'border-accent/40 bg-accent/10 text-blue-200',
  violet: 'border-violet-400/40 bg-violet-500/10 text-violet-200',
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  red: 'border-red-500/40 bg-red-500/10 text-red-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  slate: 'border-line-strong bg-ink-800 text-slate-300',
};

export function Badge({ tone = 'slate', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge>-</Badge>;
  const tone = score >= 85 ? 'green' : score >= 70 ? 'blue' : score >= 55 ? 'amber' : 'slate';
  return (
    <span title={tierLabel(score)} className="inline-flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-ink-700">
        <span
          className={clsx('block h-full rounded-full', tone === 'green' && 'bg-emerald-400', tone === 'blue' && 'bg-accent', tone === 'amber' && 'bg-amber-400', tone === 'slate' && 'bg-slate-500')}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </span>
      <span className="w-7 text-sm font-semibold tabular-nums text-white">{score}</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: string | null }) {
  const c = category ?? 'unclassified';
  const tone = c === 'career_opportunity' ? 'green' : c === 'potential_client' ? 'violet' : c === 'industry_leader' ? 'blue' : 'slate';
  return <Badge tone={tone}>{CATEGORY_LABEL[c] ?? c}</Badge>;
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge>-</Badge>;
  const tone =
    status === 'Connected' || status === 'Commented' ? 'green' :
    status === 'Connection Request Sent' ? 'blue' :
    status === 'Recommended' ? 'violet' :
    status === 'Follow-up Needed' ? 'amber' :
    status === 'Ignored' || status === 'Skipped' ? 'slate' : 'slate';
  return <Badge tone={tone}>{status}</Badge>;
}

export function CopyButton({ text, label = 'Copy', disabled }: { text: string | null | undefined; label?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn"
      disabled={disabled || !text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text ?? '');
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          toast('Copy failed. Select the text and copy manually.', 'error');
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function LinkButton({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return null;
  return (
    <a className="btn" href={href} target="_blank" rel="noopener noreferrer">
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="text-sm font-medium text-slate-200">{title}</div>
      {hint && <div className="mt-1 max-w-md text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-sm font-medium text-red-300">Could not load data</div>
      <div className="max-w-md text-xs text-slate-500">The server could not reach Supabase. Check the environment variables and the deployment logs.</div>
      {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-ink-700" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-ink-700" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-ink-700" />
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
      <span>
        {(page - 1) * pageSize + 1}-{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex gap-2">
        <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <select aria-label={label} className="input !w-auto min-w-[8.5rem] py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
