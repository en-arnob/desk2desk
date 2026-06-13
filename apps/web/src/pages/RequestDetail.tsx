import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AttachmentDto,
  CommentDto,
  RequestDto,
  RequestStatus,
  UserDto,
} from '@desk2desk/shared';
import { ApiError, apiDownload, apiGet, apiPost, apiUpload } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriorityBadge, StatusBadge } from '@/components/StatusBadge';
import { Loader } from '@/components/Logo';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckCheck,
  Download,
  FileText,
  Loader2,
  Paperclip,
  PlayCircle,
  UserCheck,
  UserRound,
} from 'lucide-react';

const ACCEPT_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Action {
  label: string;
  endpoint: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
}

function actionsFor(req: RequestDto, user: UserDto): Action[] {
  const isRequester = req.requester.id === user.id;
  const isAssignee = req.assignee?.id === user.id;
  const isProvider = user.isProvider;
  const actions: Action[] = [];

  // Provider claiming an unassigned, open request
  if (
    isProvider &&
    !req.assignee &&
    (req.status === RequestStatus.OPEN || req.status === RequestStatus.REOPENED)
  ) {
    actions.push({ label: 'Claim this request', endpoint: 'claim' });
  }

  // Assignee working the request
  if (isAssignee) {
    if (
      req.status === RequestStatus.IN_PROGRESS ||
      req.status === RequestStatus.REOPENED
    ) {
      actions.push({ label: 'Mark resolved', endpoint: 'resolve' });
    }
  }

  // Requester confirming / reopening / cancelling
  if (isRequester) {
    if (req.status === RequestStatus.RESOLVED) {
      actions.push({ label: 'Confirm & close', endpoint: 'close' });
      actions.push({
        label: 'Reopen',
        endpoint: 'reopen',
        variant: 'outline',
      });
    }
    if (
      req.status === RequestStatus.OPEN ||
      req.status === RequestStatus.REOPENED
    ) {
      actions.push({
        label: 'Cancel request',
        endpoint: 'cancel',
        variant: 'destructive',
      });
    }
  }

  return actions;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const navigate = useNavigate();
  const [req, setReq] = useState<RequestDto | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!id) return;
    apiGet<RequestDto>(`/requests/${id}`)
      .then(setReq)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load'),
      );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Live-refresh this request when a realtime event targets it.
  useEffect(
    () =>
      subscribe((e) => {
        if (e.requestId != null && String(e.requestId) === id) load();
      }),
    [subscribe, id, load],
  );

  async function runAction(endpoint: string) {
    setError(null);
    setBusy(true);
    try {
      await apiPost(`/requests/${id}/${endpoint}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      const created = await apiPost<CommentDto>(`/requests/${id}/comments`, {
        body: comment,
      });
      setReq((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), created] } : prev,
      );
      setComment('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to comment');
    } finally {
      setBusy(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const created = await apiUpload<AttachmentDto>(
        `/requests/${id}/attachments`,
        file,
      );
      setReq((prev) =>
        prev
          ? { ...prev, attachments: [...(prev.attachments ?? []), created] }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function download(a: AttachmentDto) {
    apiDownload(
      `/requests/${id}/attachments/${a.id}/download`,
      a.fileName,
    ).catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Download failed'),
    );
  }

  if (!req || !user) {
    return error ? (
      <p className="text-muted-foreground">{error}</p>
    ) : (
      <Loader />
    );
  }

  const actions = actionsFor(req, user);

  type TimelineItem =
    | { kind: 'comment'; at: string; comment: CommentDto }
    | { kind: 'attachment'; at: string; attachment: AttachmentDto };
  const timeline: TimelineItem[] = [
    ...(req.comments ?? []).map(
      (c): TimelineItem => ({ kind: 'comment', at: c.createdAt, comment: c }),
    ),
    ...(req.attachments ?? []).map(
      (a): TimelineItem => ({
        kind: 'attachment',
        at: a.createdAt,
        attachment: a,
      }),
    ),
  ].sort((x, y) => x.at.localeCompare(y.at));

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{req.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={req.status} />
            <PriorityBadge priority={req.priority} />
            <span>· {req.category.name}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{req.description}</p>
            </CardContent>
          </Card>

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button
                  key={a.endpoint}
                  variant={a.variant ?? 'default'}
                  disabled={busy}
                  onClick={() => runAction(a.endpoint)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No messages or files yet.
                </p>
              )}
              {timeline.map((item) => {
                if (item.kind === 'comment') {
                  const c = item.comment;
                  const mine = c.author.id === user.id;
                  return (
                    <div
                      key={`c${c.id}`}
                      className={cn(
                        'flex flex-col',
                        mine ? 'items-end' : 'items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm',
                          mine
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : 'rounded-bl-sm border bg-secondary/40',
                        )}
                      >
                        {!mine && (
                          <div className="mb-0.5 text-xs font-medium text-muted-foreground">
                            {c.author.name}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{c.body}</p>
                      </div>
                      <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                        {mine ? 'You' : c.author.name} · {fmt(c.createdAt)}
                      </span>
                    </div>
                  );
                }
                const a = item.attachment;
                const mine = a.uploader.id === user.id;
                return (
                  <div
                    key={`a${a.id}`}
                    className={cn(
                      'flex flex-col',
                      mine ? 'items-end' : 'items-start',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => download(a)}
                      className={cn(
                        'flex max-w-[85%] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors hover:bg-accent/50',
                        mine ? 'rounded-br-sm' : 'rounded-bl-sm bg-secondary/40',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {a.fileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(a.fileSize)} · Download
                        </span>
                      </span>
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                    <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                      {mine ? 'You' : a.uploader.name} · {fmt(a.createdAt)}
                    </span>
                  </div>
                );
              })}

              <form onSubmit={submitComment} className="space-y-2 pt-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a message…"
                  rows={3}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_TYPES}
                  className="hidden"
                  onChange={onFileChange}
                />
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    {uploading ? 'Uploading…' : 'Attach file'}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !comment.trim()}
                  >
                    Send
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  PDF, Word, Excel, CSV or images · up to 15 MB
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <Detail
                icon={UserRound}
                label="Requester"
                value={req.requester.name}
              />
              <Detail
                icon={Building2}
                label="Department"
                value={req.requester.department?.name ?? '—'}
              />
              <Detail
                icon={UserCheck}
                label="Assigned to"
                value={req.assignee?.name ?? 'Unassigned'}
              />
              <Detail
                icon={CalendarDays}
                label="Created"
                value={fmt(req.createdAt)}
              />
              {req.claimedAt && (
                <Detail
                  icon={PlayCircle}
                  label="Started"
                  value={fmt(req.claimedAt)}
                />
              )}
              {req.resolvedAt && (
                <Detail
                  icon={CheckCircle2}
                  label="Resolved"
                  value={fmt(req.resolvedAt)}
                />
              )}
              {req.closedAt && (
                <Detail
                  icon={CheckCheck}
                  label="Closed"
                  value={fmt(req.closedAt)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {(req.history ?? [])
                  .slice()
                  .reverse()
                  .map((h) => (
                    <li key={h.id} className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {h.fromStatus && (
                          <span className="text-xs text-muted-foreground">
                            {h.fromStatus.replace('_', ' ')} →
                          </span>
                        )}
                        <StatusBadge status={h.toStatus} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {h.actor.name} · {fmt(h.createdAt)}
                      </div>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="ml-auto text-right font-medium">{value}</span>
    </div>
  );
}
