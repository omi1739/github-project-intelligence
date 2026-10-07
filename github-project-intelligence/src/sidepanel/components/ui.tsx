import type { ReactNode } from 'react';
import type { Confidence } from '../../models/types';

export function Card({
  title,
  children,
  right,
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-3">
      {title ? (
        <header className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold tracking-wider text-[#8b949e] uppercase">
            {title}
          </h3>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  high: 'bg-[#1f6feb]/15 text-[#58a6ff] border-[#1f6feb]/40',
  medium: 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40',
  low: 'bg-[#8b949e]/15 text-[#8b949e] border-[#8b949e]/40',
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${CONFIDENCE_STYLES[confidence]}`}
    >
      {confidence}
    </span>
  );
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    neutral: 'border-[#30363d] bg-[#21262d] text-[#c9d1d9]',
    good: 'border-[#238636]/50 bg-[#238636]/15 text-[#3fb950]',
    warn: 'border-[#d29922]/50 bg-[#d29922]/15 text-[#d29922]',
    bad: 'border-[#da3633]/50 bg-[#da3633]/15 text-[#f85149]',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Bar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? '#3fb950' : value >= 50 ? '#d29922' : '#f85149';
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-[#c9d1d9]">{label}</span>
        <span className="font-semibold text-[#e6edf3]">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#21262d]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#21262d] py-1.5 last:border-b-0">
      <span className="text-[11px] text-[#8b949e]">{label}</span>
      <span className="text-right text-[12px] font-medium text-[#e6edf3]">{value}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[#8b949e]">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#30363d] border-t-[#58a6ff]" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#30363d] bg-[#0d1117] p-6 text-center">
      <h2 className="mb-1 text-sm font-semibold text-[#e6edf3]">{title}</h2>
      <p className="text-[12px] leading-relaxed text-[#8b949e]">{body}</p>
    </div>
  );
}

export function EvidenceList({ items }: { items: { label: string; source?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {items.slice(0, 6).map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          className="rounded border border-[#30363d] bg-[#0d1117] px-1.5 py-0.5 text-[10px] text-[#8b949e]"
        >
          {item.label}
          {item.source ? <span className="text-[#6e7681]"> · {item.source}</span> : null}
        </li>
      ))}
    </ul>
  );
}
