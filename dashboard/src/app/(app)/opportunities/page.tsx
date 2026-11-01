'use client';

import { useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { fetcher } from '@/lib/client';
import { Badge, CategoryBadge, EmptyState, ErrorState, LinkButton, PageHeader, ScoreBadge, SkeletonRows, StatusBadge } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import type { JobRow, PersonRow } from '@/lib/types';

type Tab = 'jobs' | 'clients' | 'contacts';

export default function OpportunitiesPage() {
  const [tab, setTab] = useState<Tab>('jobs');
  const { data, error, isLoading, mutate } = useSWR<{ jobs: JobRow[]; clients: PersonRow[]; hiringContacts: PersonRow[] }>('/api/opportunities', fetcher, {
    refreshInterval: 30000,
  });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'jobs', label: 'Career pages', count: data?.jobs.length },
    { id: 'contacts', label: 'Hiring contacts', count: data?.hiringContacts.length },
    { id: 'clients', label: 'Potential clients', count: data?.clients.length },
  ];

  return (
    <>
      <PageHeader title="Opportunities" subtitle="Verified hiring pages are kept apart from general networking contacts and potential clients." />

      <div className="mb-4 inline-flex rounded-lg border border-line bg-ink-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx('rounded-md px-3 py-1.5 text-[13px] font-medium transition', tab === t.id ? 'bg-accent/15 text-white ring-1 ring-inset ring-accent/30' : 'text-slate-400 hover:text-slate-100')}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-xs text-slate-500">{t.count}</span>}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <SkeletonRows />
      ) : tab === 'jobs' ? (
        <Jobs rows={data?.jobs ?? []} />
      ) : tab === 'contacts' ? (
        <People rows={data?.hiringContacts ?? []} empty="No career-oriented contacts yet." />
      ) : (
        <People rows={data?.clients ?? []} empty="No potential clients found yet." />
      )}
    </>
  );
}

function eligibility(j: JobRow) {
  if (j.bangladesh_eligibility === 'verified_accepts') return <Badge tone="green">Accepts Bangladesh</Badge>;
  if (j.bangladesh_eligibility === 'verified_excludes') return <Badge tone="red">Excludes Bangladesh</Badge>;
  if (j.is_bangladesh_based) return <Badge tone="green">Bangladesh-based</Badge>;
  return <Badge tone="amber">Eligibility unverified</Badge>;
}

function Jobs({ rows }: { rows: JobRow[] }) {
  if (!rows.length) return <EmptyState title="No career pages yet" hint="They appear after a research run finds relevant hiring pages." />;
  return (
    <div className="space-y-2">
      {rows.map((j) => (
        <div key={j.id} className="card animate-fade-up space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">{j.title}</div>
              <div className="text-xs text-slate-400">{[j.company, j.location_text].filter(Boolean).join(' · ') || 'Company unknown'}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {eligibility(j)}
              <Badge>{j.remote_policy ?? 'unknown'}</Badge>
              <ScoreBadge score={j.relevance_score} />
            </div>
          </div>
          {j.eligibility_evidence && <p className="rounded-lg border border-line bg-ink-950/60 px-3 py-2 text-xs text-slate-300">Evidence: {j.eligibility_evidence}</p>}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">Found {timeAgo(j.discovered_at)} · {j.status}</span>
            <LinkButton href={j.job_url} label="Open job page" />
          </div>
        </div>
      ))}
    </div>
  );
}

function People({ rows, empty }: { rows: PersonRow[]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} hint="Run research from Agent Control." />;
  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <div key={p.id} className="card animate-fade-up space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">{p.name}</div>
              <div className="text-xs text-slate-400">{[p.position, p.company].filter(Boolean).join(' · ') || 'Title unknown'}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={p.category} />
              <StatusBadge status={p.status} />
              <ScoreBadge score={p.relevance_score} />
            </div>
          </div>
          {p.reason && <p className="text-[13px] text-slate-300">{p.reason}</p>}
          {(p.verified.length > 0 || p.inferred.length > 0) && (
            <div className="grid gap-2 text-xs md:grid-cols-2">
              {p.verified.length > 0 && <Facts title="Verified" items={p.verified} />}
              {p.inferred.length > 0 && <Facts title="Inferred" items={p.inferred} />}
            </div>
          )}
          <div className="flex justify-end"><LinkButton href={p.profile_url} label="Open Profile" /></div>
        </div>
      ))}
    </div>
  );
}

function Facts({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="label mb-1">{title}</div>
      <ul className="list-disc space-y-0.5 pl-4 text-slate-300">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}
