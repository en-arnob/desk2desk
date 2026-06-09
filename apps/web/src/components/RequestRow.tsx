import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Tag, User, UserCheck } from 'lucide-react';
import { type RequestDto } from '@desk2desk/shared';
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

export function RequestRow({ request }: { request: RequestDto }) {
  return (
    <Link to={`/requests/${request.id}`} className="block">
      <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
        <span
          className={cn(
            'absolute inset-y-0 left-0 w-1',
            STATUS_ACCENT[request.status],
          )}
        />
        <div className="flex items-start gap-4 py-4 pl-5 pr-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                #{request.id}
              </span>
              <StatusBadge status={request.status} />
            </div>

            <h3 className="mt-1.5 truncate font-semibold leading-tight">
              {request.title}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {request.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {request.category.name}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {request.requester.name}
              </span>
              {request.assignee && (
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  {request.assignee.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeAgo(request.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <PriorityBadge priority={request.priority} />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </div>
        </div>
      </div>
    </Link>
  );
}
