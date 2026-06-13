import { Link } from 'react-router-dom';
import { ChevronRight, Tag, UserCheck } from 'lucide-react';
import { Priority, type RequestDto } from '@desk2desk/shared';
import { PriorityBadge, StatusBadge, STATUS_ACCENT } from './StatusBadge';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function RequestRow({ request }: { request: RequestDto }) {
  const urgent = request.priority === Priority.URGENT;

  return (
    <Link to={`/requests/${request.id}`} className="block">
      <div
        className={cn(
          'group rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-md',
          urgent && 'border-red-200/80',
        )}
      >
        {/* Top: status + priority, time on the right */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                STATUS_ACCENT[request.status],
              )}
            />
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(request.createdAt)}
          </span>
        </div>

        {/* Title + description */}
        <h3 className="mt-2.5 truncate font-semibold leading-tight transition-colors group-hover:text-primary">
          <span className="mr-1.5 text-xs font-medium tabular-nums text-muted-foreground/70">
            #{request.id}
          </span>
          {request.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
          {request.description}
        </p>

        {/* Footer: requester · category · assignee */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {initials(request.requester.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-medium">
                {request.requester.name}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {request.requester.department?.name ?? `ID ${request.requester.id}`}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
              <Tag className="h-3 w-3" />
              {request.category.name}
            </span>
            {request.assignee && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
                title={`Handled by ${request.assignee.name}`}
              >
                <UserCheck className="h-3 w-3" />
                {initials(request.assignee.name)}
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </div>
      </div>
    </Link>
  );
}
