import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import {
  CategoryDto,
  RequestDto,
  RequestStatus,
} from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/components/StatsUI';
import { Loader } from '@/components/Logo';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function today() {
  return toStr(new Date());
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toStr(d);
}
function monthStart() {
  const d = new Date();
  return toStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

type SortKey = 'handled' | 'active' | 'avg' | 'name';

interface WorkloadRow {
  id: string;
  name: string;
  handled: number;
  active: number;
  avgMinutes: number | null;
}

const ACTIVE_STATUSES = [RequestStatus.IN_PROGRESS, RequestStatus.REOPENED];
const DONE_STATUSES = [RequestStatus.RESOLVED, RequestStatus.CLOSED];

export function AdminWorkloadPage() {
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('handled');

  useEffect(() => {
    Promise.all([
      apiGet<RequestDto[]>('/requests/all').then(setRequests),
      apiGet<CategoryDto[]>('/admin/categories').then(setCategories),
    ]).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, WorkloadRow & { resSum: number; resN: number }>();
    for (const r of requests) {
      if (!r.assignee) continue;
      if (categoryFilter !== 'ALL' && String(r.category.id) !== categoryFilter) {
        continue;
      }
      const a = r.assignee;
      const row =
        map.get(a.id) ??
        ({
          id: a.id,
          name: a.name,
          handled: 0,
          active: 0,
          avgMinutes: null,
          resSum: 0,
          resN: 0,
        } as WorkloadRow & { resSum: number; resN: number });

      // Active = current point-in-time work, regardless of date range.
      if (ACTIVE_STATUSES.includes(r.status)) row.active++;

      // Handled = resolved/closed within the selected date range (by resolvedAt).
      if (DONE_STATUSES.includes(r.status) && r.resolvedAt) {
        const day = toStr(new Date(r.resolvedAt));
        if (day >= from && day <= to) {
          row.handled++;
          if (r.claimedAt) {
            row.resSum +=
              new Date(r.resolvedAt).getTime() -
              new Date(r.claimedAt).getTime();
            row.resN++;
          }
        }
      }
      map.set(a.id, row);
    }

    let list: WorkloadRow[] = [...map.values()].map((r) => ({
      id: r.id,
      name: r.name,
      handled: r.handled,
      active: r.active,
      avgMinutes: r.resN ? Math.round(r.resSum / r.resN / 60000) : null,
    }));

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'active') return b.active - a.active;
      if (sort === 'avg') return (a.avgMinutes ?? 1e12) - (b.avgMinutes ?? 1e12);
      return b.handled - a.handled;
    });
    return list;
  }, [requests, categoryFilter, query, sort, from, to]);

  const totals = useMemo(
    () => ({
      providers: rows.length,
      handled: rows.reduce((n, r) => n + r.handled, 0),
      active: rows.reduce((n, r) => n + r.active, 0),
    }),
    [rows],
  );

  const presets: { label: string; from: string; to: string }[] = [
    { label: 'Last 7 days', from: daysAgo(6), to: today() },
    { label: 'Last 30 days', from: daysAgo(29), to: today() },
    { label: 'This month', from: monthStart(), to: today() },
  ];
  const activePreset = presets.find((p) => p.from === from && p.to === to);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workload</h1>
        <p className="text-sm text-muted-foreground">
          Per-provider support activity. Handled counts are within the selected
          date range; active work is current.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant={activePreset?.label === p.label ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search provider…"
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="handled">Sort: Handled</SelectItem>
              <SelectItem value="active">Sort: Active now</SelectItem>
              <SelectItem value="avg">Sort: Avg resolution</SelectItem>
              <SelectItem value="name">Sort: Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {totals.providers} provider{totals.providers === 1 ? '' : 's'} ·{' '}
        {totals.handled} handled · {totals.active} active now
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 text-right font-medium">Handled</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Active now
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Avg resolution
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No provider activity for these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(r.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            #{r.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {r.handled}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={cn(
                          r.active > 0
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {r.active}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatDuration(r.avgMinutes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
