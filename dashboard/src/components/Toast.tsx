'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; text: string }

const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((text: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex animate-fade-up items-start gap-2.5 rounded-lg border bg-ink-800/95 px-3.5 py-3 text-[13px] shadow-xl backdrop-blur',
              t.kind === 'success' && 'border-emerald-500/40',
              t.kind === 'error' && 'border-red-500/50',
              t.kind === 'info' && 'border-accent/40',
            )}
          >
            {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
            {t.kind === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
            {t.kind === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
            <span className="flex-1 text-slate-200">{t.text}</span>
            <button aria-label="Dismiss" onClick={() => setItems((c) => c.filter((x) => x.id !== t.id))} className="text-slate-500 hover:text-slate-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
