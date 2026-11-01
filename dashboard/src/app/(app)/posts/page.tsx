'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Search } from 'lucide-react';
import { errorText, fetcher, send } from '@/lib/client';
import { useDebounced } from '@/hooks/useDebounced';
import { useToast } from '@/components/Toast';
import { CopyButton, EmptyState, ErrorState, LinkButton, PageHeader, Pager, ScoreBadge, Select, SkeletonRows, StatusBadge } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import type { PostAction, PostRow } from '@/lib/types';

const PAGE_SIZE = 12;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...['Discovered', 'Recommended', 'Reviewed', 'Commented', 'Skipped'].map((s) => ({ value: s, label: s })),
];
const SCORE_OPTIONS = [
  { value: '0', label: 'Any score' },
  { value: '70', label: '70+ recommended' },
  { value: '85', label: '85+' },
];
const SORT_OPTIONS = [
  { value: 'relevance_score:desc', label: 'Score: high to low' },
  { value: 'discovered_at:desc', label: 'Newest first' },
  { value: 'discovered_at:asc', label: 'Oldest first' },
];

const ACTIONS: { action: PostAction; label: string }[] = [
  { action: 'reviewed', label: 'Reviewed' },
  { action: 'commented', label: 'Mark Commented' },
  { action: 'skip', label: 'Skip' },
];

export default function PostsPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('0');
  const [sort, setSort] = useState('relevance_score:desc');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const dq = useDebounced(q);

  const [sortKey, dir] = sort.split(':');
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: sortKey, dir, minScore });
  if (dq) params.set('q', dq);
  if (status) params.set('status', status);

  const { data, error, isLoading, mutate } = useSWR<{ rows: PostRow[]; total: number }>(`/api/posts?${params}`, fetcher, {
    refreshInterval: 20000,
    keepPreviousData: true,
  });

  async function act(p: PostRow, action: PostAction) {
    setPending(`${p.id}:${action}`);
    try {
      await send(`/api/posts/${p.id}`, 'PATCH', { action });
      toast('Recorded.', 'success');
      await mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <PageHeader title="Post Intelligence" subtitle="Relevant posts with suggested comments. You post every comment yourself." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className="input !pl-9" placeholder="Search author, company or topic" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
        <Select label="Minimum score" value={minScore} onChange={(v) => { setMinScore(v); setPage(1); }} options={SCORE_OPTIONS} />
        <Select label="Sort" value={sort} onChange={(v) => { setSort(v); setPage(1); }} options={SORT_OPTIONS} />
      </div>

      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <SkeletonRows />
      ) : !data?.rows.length ? (
        <EmptyState title="No posts match" hint="Adjust the filters, or start a research run from Agent Control." />
      ) : (
        <>
          <div className="space-y-3">
            {data.rows.map((p) => (
              <article key={p.id} className="card animate-fade-up space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{p.author_name || 'Unknown author'}{p.company ? <span className="font-normal text-slate-400"> · {p.company}</span> : null}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Found {timeAgo(p.discovered_at)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={p.status} />
                    <ScoreBadge score={p.relevance_score} />
                  </div>
                </div>

                <div>
                  <div className="label mb-1">Topic</div>
                  <p className="text-[13px] text-slate-200">{p.topic ?? '-'}</p>
                </div>

                {(p.main_argument || p.networking_value) && (
                  <div>
                    <div className="label mb-1">AI analysis</div>
                    {p.main_argument && <p className="text-[13px] text-slate-300">{p.main_argument}</p>}
                    {p.networking_value && <p className="mt-1 text-xs text-slate-500">Value: {p.networking_value}</p>}
                  </div>
                )}

                {p.content_basis !== 'full' && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Based on a search snippet only. Read the full post before commenting.
                  </p>
                )}

                <CommentBlock title="Suggested comment" text={p.suggested_comment} />
                {p.alternative_comment && <CommentBlock title="Alternative" text={p.alternative_comment} />}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <LinkButton href={p.post_url} label="Open Post" />
                  <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
                  {ACTIONS.map((a) => (
                    <button key={a.action} className="btn" disabled={pending !== null} onClick={() => act(p, a.action)}>
                      {pending === `${p.id}:${a.action}` ? '...' : a.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}

function CommentBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="label">{title}</div>
        <CopyButton text={text} label="Copy Comment" />
      </div>
      <p className="rounded-lg border border-line bg-ink-950/60 p-3 text-[13px] leading-relaxed text-slate-200">{text}</p>
    </div>
  );
}
