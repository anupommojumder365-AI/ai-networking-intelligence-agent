'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_LABEL } from '@/lib/format';

const AXIS = { stroke: '#4b5675', fontSize: 11, tickLine: false, axisLine: false } as const;
const TOOLTIP = {
  contentStyle: { background: '#0f1424', border: '1px solid #283250', borderRadius: 8, fontSize: 12, color: '#dfe4f5' },
  cursor: { fill: 'rgba(109,139,255,0.08)' },
} as const;

export function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-3">
        <div className="text-sm font-medium text-slate-100">{title}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className="h-48">{children}</div>
    </div>
  );
}

export function DiscoveryChart({ data }: { data: { day: string; value: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: d.day.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ left: -18, right: 8, top: 4 }}>
        <defs>
          <linearGradient id="disc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d8bff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#6d8bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1c2338" vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip {...TOOLTIP} formatter={(v) => [v, 'Profiles discovered']} />
        <Area type="monotone" dataKey="value" stroke="#6d8bff" strokeWidth={2} fill="url(#disc)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ScoreChart({ data }: { data: { label: string; count: number }[] }) {
  const colors = ['#3a4462', '#d9a441', '#6d8bff', '#34d399'];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -18, right: 8, top: 4 }}>
        <CartesianGrid stroke="#1c2338" vertical={false} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip {...TOOLTIP} formatter={(v) => [v, 'Profiles']} />
        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i] ?? '#6d8bff'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const rows = data
    .map((d) => ({ name: CATEGORY_LABEL[d.name] ?? d.name, value: d.value }))
    .sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 12, right: 12, top: 4 }}>
        <CartesianGrid stroke="#1c2338" horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...AXIS} />
        <YAxis type="category" dataKey="name" width={112} {...AXIS} />
        <Tooltip {...TOOLTIP} formatter={(v) => [v, 'Profiles']} />
        <Bar dataKey="value" fill="#8b7bff" radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
