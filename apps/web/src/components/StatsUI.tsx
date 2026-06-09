import type { ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { RequestStatus } from '@desk2desk/shared';
import { cn } from '@/lib/utils';

export const STATUS_META: Record<
  RequestStatus,
  { label: string; color: string }
> = {
  [RequestStatus.OPEN]: { label: 'Open', color: '#2563eb' },
  [RequestStatus.IN_PROGRESS]: { label: 'In progress', color: '#7c3aed' },
  [RequestStatus.RESOLVED]: { label: 'Resolved', color: '#059669' },
  [RequestStatus.CLOSED]: { label: 'Closed', color: '#6b7280' },
  [RequestStatus.REOPENED]: { label: 'Reopened', color: '#ea580c' },
  [RequestStatus.CANCELLED]: { label: 'Cancelled', color: '#e11d48' },
};

export function formatDuration(min: number | null): string {
  if (min === null) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  brand,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  brand?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            brand
              ? 'bg-primary/10 text-primary'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(count > 0 ? 4 : 0, (count / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{label}</span>
        <span className="font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
