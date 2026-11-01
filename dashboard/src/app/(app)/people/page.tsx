'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronDown, Search } from 'lucide-react';
import clsx from 'clsx';
import { errorText, fetcher, send } from '@/lib/client';
import { useDebounced } from '@/hooks/useDebounced';
import { useToast } from '@/components/Toast';
import {
  CategoryBadge, CopyButton, EmptyState, ErrorState, LinkButton, PageHeader, Pager, ScoreBadge, Select, SkeletonRows, StatusBadge,
} from '@/components/ui';
import { timeAgo } from '@/lib/format';
import type { PersonAction, PersonRow } from '@/lib/types';

const PAGE_SIZE = 20;

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'career_opportunity', label: 'Career' },
  { value: 'industry_leader', label: 'Industry leader' },
  { value: 'potential_client', label: 'Potential client' },
  { value: 'professional_peer', label: 'Peer' },
  { value: 'unclassified', label: 'Unclassified' },
];
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...['Discovered', 'Recommended', 'Reviewed', 'Connection Request Sent', 'Connected', 'Ignored', 'Follow-up Needed'].map((s) => ({ value: s, label: s })),
];
const SCORE_OPTIONS = [
  { value: '0', label: 'Any score' },
  { value: '55', label: '55+' },
  { value: '70', label: '70+ recommended' },
  { value: '85', label: '85+ highly valuable' },
];
const SORT_OPTIONS = [
  { value: 'relevance_score:desc', label: 'Score: high to low' },
  { value: 'relevance_score:asc', label: 'Score: low to high' },
  { value: 'discovered_at:desc', label: 'Newest first' },
  { value: 'discovered_at:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A-Z' },
];

const ACTIONS: { action: PersonAction; label: string }[] = [
  { action: 'reviewed', label: 'Reviewed' },
  { action: 'sent', label: 'Mark Sent' },
  { action: 'connected', label: 'Mark Connected' },
  { action: 'followup', label: 'Follow-up' },
  { action: 'ignore', label: 'Skip' },
];

export default function PeoplePage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('0');
  const [sort, setSort] = useState('relevance_score:desc');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const dq = useDebounced(q);

  const [sortKey, dir] = sort.split(':');
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: sortKey, dir, minScore });
  if (dq) params.set('q', dq);
  if (category) params.set('category', category);
  if (status) params.set('status', status);

  const { data, error, isLoading, mutate } = useSWR<{ rows: PersonRow[]; total: number }>(`/api/people?${params}`, fetcher, {
    refreshInterval: 20000,
    keepPreviousData: true,
  });

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  async function act(p: PersonRow, action: PersonAction) {
    setPending(`${p.id}:${action}`);
    try {
      await send(`/api/people/${p.id}`, 'PATCH', { action });
      toast(`${p.name}: recorded.`, 'success');
      await mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <PageHeader title="People Intelligence" subtitle="Professionals found by research. Buttons only record what you already did on LinkedIn." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input !pl-9" placeholder="Search name, company or title" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select label="Category" value={category} onChange={reset(setCategory)} options={CATEGORY_OPTIONS} />
        <Select label="Status" value={status} onChange={reset(setStatus)} options={STATUS_OPTIONS} />
        <Select label="Minimum score" value={minScore} onChange={reset(setMinScore)} options={SCORE_OPTIONS} />
        <Select label="Sort" value={sort} onChange={reset(setSort)} options={SORT_OPTIONS} />
      </div>

      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <SkeletonRows />
      ) : !data?.rows.length ? (
        <EmptyState title="No professionals match" hint="Adjust the filters, or start a research run from Agent Control." />
      ) : (
        <>
          <div className="space-y-2">
            {data.rows.map((p) => {
              const isOpen = open === p.id;
              return (
                <div key={p.id} className="card animate-fade-up overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : p.id)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition hover:bg-ink-800/60"
                  >
                    <div className="min-w-0 flex-1 basis-56">
                      <div className="truncate text-sm font-medium text-white">{p.name}</div>
                      <div className="truncate text-xs text-slate-400">{[p.position, p.company].filter(Boolean).join(' · ') || 'Title unknown'}</div>
                    </div>
                    <CategoryBadge category={p.category} />
                    <StatusBadge status={p.status} />
                    <ScoreBadge score={p.relevance_score} />
                    <ChevronDown className={clsx('h-4 w-4 text-slate-500 transition', isOpen && 'rotate-180')} />
                  </button>

                  {isOpen && (
                    <div className="space-y-4 border-t border-line bg-ink-900/50 px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Detail title="Why this person">
                          <p className="text-[13px] text-slate-300">{p.reason ?? 'No recommendation reason recorded (score below 70 or not yet recommended).'}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Confidence {p.confidence} · discovered {timeAgo(p.discovered_at)}
                            {p.times_recommended > 0 && ` · recommended ${p.times_recommended}×`}
                          </p>
                        </Detail>
                        <Detail title="Evidence">
                          <FactList label="Verified" items={p.verified} />
                          <FactList label="Inferred" items={p.inferred} />
                          <FactList label="Unknown" items={p.unknown} />
                          {p.evidence_url && <p className="mt-2 break-all text-xs text-slate-500">Source: {p.evidence_url}</p>}
                        </Detail>
                      </div>

                      <Detail title="Suggested connection message">
                        {p.connection_message ? (
                          <p className="rounded-lg border border-line bg-ink-950/60 p-3 text-[13px] leading-relaxed text-slate-200">{p.connection_message}</p>
                        ) : (
                          <p className="text-xs text-slate-500">No message generated for this profile.</p>
                        )}
                      </Detail>

                      <div className="flex flex-wrap items-center gap-2">
                        <LinkButton href={p.profile_url} label="Open Profile" />
                        <CopyButton text={p.connection_message} label="Copy Message" />
                        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
                        {ACTIONS.map((a) => (
                          <button key={a.action} className="btn" disabled={pending !== null} onClick={() => act(p, a.action)}>
                            {pending === `${p.id}:${a.action}` ? '...' : a.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">You send every request on LinkedIn yourself. These buttons only update tracking after you confirm.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}

function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function FactList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[13px] text-slate-300">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
