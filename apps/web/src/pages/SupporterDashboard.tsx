import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Coffee,
  Inbox,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { RequestDto } from '@desk2desk/shared';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RequestRow } from '@/components/RequestRow';

function Queue({
  icon: Icon,
  title,
  description,
  requests,
  emptyIcon: EmptyIcon,
  emptyText,
  brand,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  requests: RequestDto[];
  emptyIcon: LucideIcon;
  emptyText: string;
  brand?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            brand
              ? 'bg-primary/10 text-primary'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {title}
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {requests.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 px-6 py-14 text-center">
          <EmptyIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </section>
  );
}

export function SupporterDashboardPage() {
  const [available, setAvailable] = useState<RequestDto[]>([]);
  const [assigned, setAssigned] = useState<RequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<RequestDto[]>('/requests/available').then(setAvailable),
      apiGet<RequestDto[]>('/requests/assigned').then(setAssigned),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Support Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Claim new requests and keep track of what you’re working on.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Queue
          icon={Inbox}
          brand
          title="Available to claim"
          description="Unassigned requests in your service categories."
          requests={available}
          emptyIcon={CheckCircle2}
          emptyText="All caught up — nothing waiting to be claimed."
        />
        <Queue
          icon={ListChecks}
          title="My active work"
          description="Requests you’ve claimed and are working on."
          requests={assigned}
          emptyIcon={Coffee}
          emptyText="Nothing in progress. Claim a request to get started."
        />
      </div>
    </div>
  );
}
