'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Bot, Briefcase, LayoutDashboard, LogOut, Menu, MessageSquareText, ScrollText, Settings, Users, X } from 'lucide-react';
import { useAgent } from '@/hooks/useAgent';
import { StatusPill } from './AgentControl';
import { send } from '@/lib/client';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/people', label: 'People', icon: Users },
  { href: '/posts', label: 'Posts', icon: MessageSquareText },
  { href: '/opportunities', label: 'Opportunities', icon: Briefcase },
  { href: '/agent', label: 'Agent Control', icon: Bot },
  { href: '/logs', label: 'Execution Logs', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={clsx(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition',
              active ? 'bg-accent/10 text-white ring-1 ring-inset ring-accent/30' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-100',
            )}
          >
            <Icon className={clsx('h-4 w-4', active ? 'text-accent' : 'text-slate-500')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-violet text-[11px] font-bold text-white">N</div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">NIS</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Command Center</div>
      </div>
    </div>
  );
}

function SidebarFooter() {
  const { state } = useAgent();
  const router = useRouter();
  return (
    <div className="mt-auto space-y-3">
      <div className="rounded-lg border border-line bg-ink-900/70 p-3">
        <div className="label mb-2">Agent</div>
        <StatusPill state={state} />
      </div>
      <button
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-slate-400 transition hover:bg-ink-800 hover:text-slate-100"
        onClick={async () => {
          await send('/api/logout', 'POST').catch(() => null);
          router.replace('/login');
        }}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-line bg-ink-950/80 p-4 backdrop-blur lg:flex">
        <Brand />
        <NavList />
        <SidebarFooter />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button aria-label="Open menu" className="btn !px-2" onClick={() => setOpen(true)}>
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 animate-fade-up flex-col gap-6 border-r border-line bg-ink-950 p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button aria-label="Close menu" className="btn !px-2" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
