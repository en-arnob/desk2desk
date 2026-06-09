import { Priority, RequestStatus } from '@desk2desk/shared';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<RequestStatus, string> = {
  [RequestStatus.OPEN]: 'bg-blue-100 text-blue-800',
  [RequestStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
  [RequestStatus.RESOLVED]: 'bg-emerald-100 text-emerald-800',
  [RequestStatus.CLOSED]: 'bg-gray-200 text-gray-700',
  [RequestStatus.REOPENED]: 'bg-orange-100 text-orange-800',
  [RequestStatus.CANCELLED]: 'bg-rose-100 text-rose-700',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  [Priority.LOW]: 'bg-slate-100 text-slate-600',
  [Priority.MEDIUM]: 'bg-sky-100 text-sky-700',
  [Priority.HIGH]: 'bg-amber-100 text-amber-800',
  [Priority.URGENT]: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant="outline" className={cn('border-0', STATUS_STYLES[status])}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={cn('border-0', PRIORITY_STYLES[priority])}>
      {priority}
    </Badge>
  );
}
