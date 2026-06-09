import { Link } from 'react-router-dom';
import type { RequestDto } from '@desk2desk/shared';
import { Card } from './ui/card';
import { PriorityBadge, StatusBadge } from './StatusBadge';

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
    <Link to={`/requests/${request.id}`}>
      <Card className="p-4 transition-colors hover:bg-accent/40">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{request.title}</span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {request.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{request.category.name}</span>
              <span>·</span>
              <span>by {request.requester.name}</span>
              {request.assignee && (
                <>
                  <span>·</span>
                  <span>handled by {request.assignee.name}</span>
                </>
              )}
              <span>·</span>
              <span>{timeAgo(request.createdAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
