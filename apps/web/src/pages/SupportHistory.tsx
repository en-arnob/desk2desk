import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, History } from 'lucide-react';
import { RequestDto } from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriorityBadge, StatusBadge } from '@/components/StatusBadge';
import { Loader } from '@/components/Logo';

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
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SupportHistoryPage() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [items, setItems] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((f: string, t: string) => {
    setLoading(true);
    apiGet<RequestDto[]>(
      `/requests/history?from=${f}&to=${t}`,
    )
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(today(), today());
  }, [load]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    load(from, to);
  }
  function preset(f: string, t: string) {
    setFrom(f);
    setTo(t);
    load(f, t);
  }

  const rangeLabel =
    from === to ? `on ${from}` : `from ${from} to ${to}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Support History</h1>
        <p className="text-sm text-muted-foreground">
          A log of the support you’ve delivered, by date.
        </p>
      </div>

      <form
        onSubmit={apply}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm"
      >
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
        <Button type="submit">
          <CalendarRange className="h-4 w-4" /> Apply
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => preset(today(), today())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => preset(daysAgo(6), today())}
          >
            Last 7 days
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => preset(monthStart(), today())}
          >
            This month
          </Button>
        </div>
      </form>

      {!loading && (
        <div className="text-sm text-muted-foreground">
          {`${items.length} request${items.length === 1 ? '' : 's'} handled ${rangeLabel}.`}
        </div>
      )}

      {loading && <Loader />}

      {!loading &&
        (items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 px-6 py-14 text-center">
            <History className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No support delivered in this period.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Resolved</th>
                  <th className="px-4 py-2.5 font-medium">Request</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Requester</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {r.resolvedAt ? fmtDateTime(r.resolvedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/requests/${r.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.category.name}</td>
                    <td className="px-4 py-3">
                      {r.requester.name}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({r.requester.department?.name ?? '—'})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
