'use client';

import { AgentControl } from '@/components/AgentControl';
import { useAgent } from '@/hooks/useAgent';
import { EmptyState, PageHeader, StatCard } from '@/components/ui';
import { dateTime, duration, num, str } from '@/lib/format';

export default function AgentPage() {
  const { data, isLoading } = useAgent();
  const latest = data?.latest;
  const s = (latest?.summary ?? {}) as Record<string, unknown>;
  const secs = latest?.finished_at ? Math.round((new Date(latest.finished_at).getTime() - new Date(latest.started_at).getTime()) / 1000) : null;

  return (
    <>
      <PageHeader title="Agent Control" subtitle="Telegram and this dashboard start and stop the same n8n workflow and share one run lock." />
      <div className="space-y-4">
        <AgentControl />

        <div className="card p-4 text-[13px] text-slate-400">
          <div className="label mb-2">How control is shared</div>
          <ul className="list-disc space-y-1 pl-4">
            <li>Start here or send <code className="rounded bg-ink-800 px-1">/run</code> in Telegram. Both reach the same research workflow.</li>
            <li>Only one run can exist. A second start is refused, whichever interface sends it.</li>
            <li>Stop here or send <code className="rounded bg-ink-800 px-1">/stop</code>. The run ends at its next safe checkpoint, so the status shows Stopping first.</li>
            <li>No schedules. Research starts only when you ask for it.</li>
          </ul>
        </div>

        <div>
          <div className="mb-2 text-sm font-medium text-slate-100">Last execution</div>
          {!latest && !isLoading ? (
            <EmptyState title="No execution yet" hint="Press Start Research to run the first one." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard loading={isLoading} label="Execution" value={latest?.execution_id} hint={latest ? dateTime(latest.started_at) : undefined} />
                <StatCard loading={isLoading} label="Duration" value={latest?.status === 'running' ? 'Running' : duration(secs)} />
                <StatCard loading={isLoading} label="Search hits" value={num(s.found)} hint={`${num(s.searches)} queries · ${num(s.search_errors)} failed`} />
                <StatCard loading={isLoading} label="Analyzed" value={num(s.analysed)} hint={`${num(s.new_profiles)} new · ${num(s.known_profiles)} known profiles`} />
                <StatCard loading={isLoading} label="People recommended" value={num(s.recommended_people)} />
                <StatCard loading={isLoading} label="Posts recommended" value={num(s.recommended_posts)} hint={`${num(s.comments)} comments drafted`} />
                <StatCard loading={isLoading} label="Career pages" value={num(s.career_pages)} />
                <StatCard loading={isLoading} label="AI provider" value={str(s.providers).replace(/,/g, ' + ') || '-'} hint={num(s.save_failures) ? `${num(s.save_failures)} items failed to save` : undefined} />
              </div>
              {latest && (
                <p className="mt-3 text-xs text-slate-500">
                  Status: {latest.status}. Apify {s.apify_used ? 'was used' : 'was not used'} in this run. Search results are leads, not verified facts.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
