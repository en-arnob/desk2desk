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
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { RequestRow } from '@/components/RequestRow';
import { Loader } from '@/components/Logo';
import { Card } from '@/components/ui/card';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

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
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-muted/30 p-4">
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
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-semibold">
            {title}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                brand && requests.length > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-muted-foreground',
              )}
            >
              {requests.length}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
          <EmptyIcon className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {requests.map((r) => (
            <RequestRow key={r.id} request={r} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function SupporterDashboardPage() {
  const { user } = useAuth();
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
    return <Loader />;
  }

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Support Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ''} — claim new requests and keep
            track of what you’re working on.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SummaryPill
            icon={Inbox}
            value={available.length}
            label="available"
            brand
          />
          <SummaryPill
            icon={ListChecks}
            value={assigned.length}
            label="in progress"
          />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
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

function SummaryPill({
  icon: Icon,
  value,
  label,
  brand,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  brand?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        brand ? 'border-primary/20 bg-primary/5' : 'bg-card',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          brand ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <span className="text-lg font-semibold tabular-nums leading-none">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
