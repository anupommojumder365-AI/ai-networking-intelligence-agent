'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { errorText, fetcher, send } from '@/lib/client';
import { useToast } from '@/components/Toast';
import type { AgentStatus } from '@/lib/types';

const STARTING_TIMEOUT_MS = 60_000;

/** Single source of truth for agent state. Reads Supabase, so a run started from Telegram shows up here too. */
export function useAgent() {
  const toast = useToast();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState<'start' | 'stop' | null>(null);
  const prev = useRef<AgentStatus['state'] | null>(null);

  const { data, error, mutate, isLoading } = useSWR<AgentStatus>('/api/agent', fetcher, {
    refreshInterval: (d) => (d?.isRunning || startedAt ? 3000 : 15000),
    revalidateOnFocus: true,
  });

  // "Starting..." bridges the gap between the gateway accepting and the run row appearing.
  const starting = startedAt !== null && !data?.isRunning && Date.now() - startedAt < STARTING_TIMEOUT_MS;

  useEffect(() => {
    if (!data) return;
    if (startedAt && (data.isRunning || Date.now() - startedAt >= STARTING_TIMEOUT_MS)) setStartedAt(null);
    const before = prev.current;
    prev.current = data.state;
    if (before && before !== data.state) {
      if (data.state === 'Running' && before !== 'Stopping') toast('Research is running.', 'info');
      if (data.state === 'Completed' && (before === 'Running' || before === 'Stopping')) {
        toast(data.latest?.status === 'stopped' ? 'Research stopped safely.' : 'Research finished. New results are in.', 'success');
      }
      if (data.state === 'Failed' && (before === 'Running' || before === 'Stopping')) toast('Research run failed. See Execution Logs.', 'error');
    }
  }, [data, startedAt, toast]);

  const start = useCallback(async () => {
    setBusy('start');
    try {
      await send('/api/agent/start', 'POST');
      setStartedAt(Date.now());
      toast('Research requested. Telegram will also receive the report.', 'success');
      void mutate();
    } catch (e) {
      toast(errorText(e), 'error');
      void mutate();
    } finally {
      setBusy(null);
    }
  }, [mutate, toast]);

  const stop = useCallback(async () => {
    setBusy('stop');
    try {
      await send('/api/agent/stop', 'POST');
      toast('Stop requested. The run ends at its next safe checkpoint.', 'info');
      void mutate();
    } catch (e) {
      toast(errorText(e), 'error');
      void mutate();
    } finally {
      setBusy(null);
    }
  }, [mutate, toast]);

  const state = starting ? 'Starting' : (data?.state ?? 'Idle');
  return { data, error, isLoading, state, starting, busy, start, stop };
}
