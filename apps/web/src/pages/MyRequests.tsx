import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Inbox, PlusCircle } from 'lucide-react';
import type { RequestDto } from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RequestRow } from '@/components/RequestRow';
import { Loader } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export function MyRequestsPage() {
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());

  useEffect(() => {
    apiGet<RequestDto[]>('/requests/mine')
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const day = toStr(new Date(r.createdAt));
      return day >= from && day <= to;
    });
  }, [requests, from, to]);

  const presets: { label: string; from: string; to: string }[] = [
    { label: 'Today', from: today(), to: today() },
    { label: 'Last 7 days', from: daysAgo(6), to: today() },
    { label: 'This month', from: monthStart(), to: today() },
  ];
  const activePreset = presets.find((p) => p.from === from && p.to === to);
  const rangeLabel = from === to ? `on ${from}` : `from ${from} to ${to}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Requests</h1>
          <p className="text-sm text-muted-foreground">
            Support you have asked for.
          </p>
        </div>
        <Button asChild>
          <Link to="/requests/new">
            <PlusCircle className="h-4 w-4" /> New Request
          </Link>
        </Button>
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
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
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
      </div>

      {loading ? (
        <Loader />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          message="You haven't raised any requests yet."
          cta
        />
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            {filtered.length} request{filtered.length === 1 ? '' : 's'}{' '}
            {rangeLabel}.
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              message="No requests in this period. Try a wider date range."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <RequestRow key={r.id} request={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
  cta,
}: {
  icon: typeof Inbox;
  message: string;
  cta?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center',
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      {cta && (
        <Button asChild className="mt-4" size="sm">
          <Link to="/requests/new">
            <PlusCircle className="h-4 w-4" /> New Request
          </Link>
        </Button>
      )}
    </div>
  );
}
