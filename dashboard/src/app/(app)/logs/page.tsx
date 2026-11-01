'use client';

import { useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { fetcher } from '@/lib/client';
import { Badge, EmptyState, ErrorState, PageHeader, Select, SkeletonRows } from '@/components/ui';
import { dateTime, duration, num, str } from '@/lib/format';
import type { ReportRow, SystemLogRow } from '@/lib/types';

interface Actor { id: string; actor_id: string; status: string; items_returned: number | null; cost_usd: number | null; error_message: string | null; started_at: string }
type Tab = 'runs' | 'system' | 'actors';

const RUN_TONE: Record<string, 'green' | 'blue' | 'red' | 'amber'> = { completed: 'green', running: 'blue', failed: 'red', stopped: 'amber', partial: 'amber' };
const LEVEL_TONE: Record<string, 'red' | 'amber' | 'blue' | 'slate'> = { error: 'red', warn: 'amber', info: 'blue', debug: 'slate' };

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>('runs');
  const [level, setLevel] = useState('');
  const { data, error, isLoading, mutate } = useSWR<{ reports: ReportRow[]; logs: SystemLogRow[]; actors: Actor[] }>(
    `/api/logs${level ? `?level=${level}` : ''}`,
    fetcher,
    { refreshInterval: 10000, keepPreviousData: true },
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'runs', label: 'Executions' },
    { id: 'system', label: 'System log' },
    { id: 'actors', label: 'Apify actors' },
  ];

  return (
    <>
      <PageHeader title="Execution Logs" subtitle="Run history, workflow errors and Actor usage recorded by n8n.">
        {tab === 'system' && (
          <Select
            label="Level"
            value={level}
            onChange={setLevel}
            options={[{ value: '', label: 'All levels' }, { value: 'error', label: 'Errors' }, { value: 'warn', label: 'Warnings' }, { value: 'info', label: 'Info' }, { value: 'debug', label: 'Debug' }]}
          />
        )}
      </PageHeader>

      <div className="mb-4 inline-flex rounded-lg border border-line bg-ink-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx('rounded-md px-3 py-1.5 text-[13px] font-medium transition', tab === t.id ? 'bg-accent/15 text-white ring-1 ring-inset ring-accent/30' : 'text-slate-400 hover:text-slate-100')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <SkeletonRows />
      ) : tab === 'runs' ? (
        !data?.reports.length ? <EmptyState title="No executions yet" /> : (
          <div className="space-y-2">
            {data.reports.map((r) => (
              <div key={r.id} className="card animate-fade-up p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-white">Execution {r.execution_id}</div>
                  <div className="flex items-center gap-2">
                    {r.stop_requested && r.status === 'running' && <Badge tone="amber">stop requested</Badge>}
                    <Badge tone={RUN_TONE[r.status] ?? 'slate'}>{r.status}</Badge>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {dateTime(r.started_at)} · duration {r.status === 'running' ? 'in progress' : duration(r.duration_seconds)}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                  <span>Search hits: <b className="text-slate-200">{num(r.summary.found)}</b></span>
                  <span>Analyzed: <b className="text-slate-200">{num(r.summary.analysed)}</b></span>
                  <span>People rec.: <b className="text-slate-200">{num(r.summary.recommended_people)}</b></span>
                  <span>Posts rec.: <b className="text-slate-200">{num(r.summary.recommended_posts)}</b></span>
                </div>
                {(num(r.summary.save_failures) > 0 || num(r.summary.search_errors) > 0 || str(r.summary.note)) && (
                  <p className="mt-2 text-xs text-amber-300">
                    {num(r.summary.search_errors) > 0 && `${num(r.summary.search_errors)} searches failed. `}
                    {num(r.summary.save_failures) > 0 && `${num(r.summary.save_failures)} items failed to save. `}
                    {str(r.summary.note)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : tab === 'system' ? (
        !data?.logs.length ? <EmptyState title="No log entries" hint="Errors from the n8n error handler and run completions appear here." /> : (
          <div className="card divide-y divide-line">
            {data.logs.map((l) => (
              <div key={l.id} className="space-y-1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={LEVEL_TONE[l.level] ?? 'slate'}>{l.level}</Badge>
                  <span className="text-xs text-slate-500">{dateTime(l.created_at)}</span>
                  {l.workflow_name && <span className="text-xs text-slate-400">{l.workflow_name}{l.node_name ? ` · ${l.node_name}` : ''}</span>}
                  {l.execution_id && <span className="text-xs text-slate-600">#{l.execution_id}</span>}
                </div>
                <p className="break-words text-[13px] text-slate-200">{l.message}</p>
              </div>
            ))}
          </div>
        )
      ) : !data?.actors.length ? (
        <EmptyState title="No Apify Actor runs recorded" hint="No Actor has been run yet. Only authorized, compliant Actors are allowed, and each needs an Apify token in n8n." />
      ) : (
        <div className="card divide-y divide-line">
          {data.actors.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
              <div>
                <div className="text-slate-200">{a.actor_id}</div>
                <div className="text-xs text-slate-500">{dateTime(a.started_at)} · {a.items_returned ?? 0} items{a.cost_usd != null ? ` · $${a.cost_usd}` : ''}</div>
                {a.error_message && <div className="text-xs text-red-300">{a.error_message}</div>}
              </div>
              <Badge tone={a.status === 'succeeded' ? 'green' : a.status === 'failed' ? 'red' : 'slate'}>{a.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
