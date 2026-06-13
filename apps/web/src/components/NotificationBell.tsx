import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  FileText,
  Inbox,
  MessageSquare,
  Paperclip,
  RotateCcw,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { NotificationType, type NotificationDto } from '@desk2desk/shared';
import { useRealtime } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const META: Record<NotificationType, { icon: LucideIcon; tint: string }> = {
  [NotificationType.NEW_REQUEST]: { icon: Inbox, tint: 'bg-primary/10 text-primary' },
  [NotificationType.CLAIMED]: { icon: UserCheck, tint: 'bg-amber-100 text-amber-700' },
  [NotificationType.COMMENT]: { icon: MessageSquare, tint: 'bg-blue-100 text-blue-700' },
  [NotificationType.ATTACHMENT]: { icon: Paperclip, tint: 'bg-violet-100 text-violet-700' },
  [NotificationType.RESOLVED]: { icon: CheckCircle2, tint: 'bg-emerald-100 text-emerald-700' },
  [NotificationType.CLOSED]: { icon: FileText, tint: 'bg-gray-200 text-gray-700' },
  [NotificationType.REOPENED]: { icon: RotateCcw, tint: 'bg-orange-100 text-orange-700' },
  [NotificationType.REASSIGNED]: { icon: UserCheck, tint: 'bg-primary/10 text-primary' },
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead, desktop, enableDesktop } =
    useRealtime();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function openItem(n: NotificationDto) {
    if (!n.isRead) markRead(n.id);
    setOpen(false);
    if (n.requestId) navigate(`/requests/${n.requestId}`);
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {desktop === 'default' && (
            <button
              onClick={enableDesktop}
              className="flex w-full items-center gap-2 border-b bg-primary/5 px-4 py-2.5 text-left text-xs text-primary hover:bg-primary/10"
            >
              <Bell className="h-3.5 w-3.5" />
              Enable desktop alerts for new requests &amp; replies
            </button>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                You’re all caught up.
              </div>
            ) : (
              notifications.map((n) => {
                const m = META[n.type] ?? META[NotificationType.NEW_REQUEST];
                const Icon = m.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/50',
                      !n.isRead && 'bg-primary/[0.03]',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        m.tint,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {n.body}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
