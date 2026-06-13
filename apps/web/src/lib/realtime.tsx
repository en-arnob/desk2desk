import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDto, RealtimeEvent } from '@desk2desk/shared';
import { apiGet, apiPost, getToken } from './api';
import { useAuth } from './auth';

type DesktopState = 'unsupported' | 'default' | 'granted' | 'denied';

interface RealtimeContextValue {
  notifications: NotificationDto[];
  unread: number;
  connected: boolean;
  markRead: (id: number) => void;
  markAllRead: () => void;
  /** Subscribe to raw realtime events (for live view refreshes). */
  subscribe: (cb: (e: RealtimeEvent) => void) => () => void;
  desktop: DesktopState;
  enableDesktop: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

// ---- attention helpers ----
let audioCtx: AudioContext | null = null;
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.value = 880;
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.start(t);
    o.stop(t + 0.3);
  } catch {
    /* audio not available — ignore */
  }
}

function desktopState(): DesktopState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as DesktopState;
}

interface Toast {
  key: number;
  notification: NotificationDto;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [desktop, setDesktop] = useState<DesktopState>(desktopState());

  const listeners = useRef(new Set<(e: RealtimeEvent) => void>());
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const subscribe = useCallback((cb: (e: RealtimeEvent) => void) => {
    listeners.current.add(cb);
    return () => {
      listeners.current.delete(cb);
    };
  }, []);

  const markRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
    apiPost(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    apiPost('/notifications/read-all').catch(() => {});
  }, []);

  const enableDesktop = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((p) =>
      setDesktop(p as DesktopState),
    );
  }, []);

  // Fire an OS notification when permitted + secure context.
  const showDesktop = useCallback((n: NotificationDto) => {
    if (
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted' ||
      !window.isSecureContext
    ) {
      return;
    }
    try {
      const note = new Notification(n.title, {
        body: n.body,
        tag: `d2d-${n.id}`,
        icon: '/pattern.svg',
      });
      note.onclick = () => {
        window.focus();
        if (n.requestId) navigateRef.current(`/requests/${n.requestId}`);
        note.close();
      };
    } catch {
      /* ignore */
    }
  }, []);

  const pushToast = useCallback((n: NotificationDto) => {
    const key = Date.now() + Math.random();
    setToasts((prev) => [...prev, { key, notification: n }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.key !== key));
    }, 6000);
  }, []);

  // ---- load initial state + open the SSE stream when logged in ----
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      setConnected(false);
      return;
    }

    let cancelled = false;
    apiGet<NotificationDto[]>('/notifications')
      .then((list) => !cancelled && setNotifications(list))
      .catch(() => {});
    apiGet<{ count: number }>('/notifications/unread-count')
      .then((r) => !cancelled && setUnread(r.count))
      .catch(() => {});

    const token = getToken();
    if (!token) return;
    const es = new EventSource(
      `/api/events?token=${encodeURIComponent(token)}`,
    );
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      let data: RealtimeEvent | { kind: 'ping' };
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.kind === 'ping') return;
      const event = data as RealtimeEvent;

      // Notify subscribers (dashboard / request detail) to refresh views.
      listeners.current.forEach((cb) => cb(event));

      // Raise an alert if this event carries a notification.
      if (event.notification) {
        const n = event.notification;
        setNotifications((prev) =>
          prev.some((x) => x.id === n.id) ? prev : [n, ...prev],
        );
        setUnread((u) => u + 1);
        pushToast(n);
        beep();
        showDesktop(n);
      }
    };

    return () => {
      cancelled = true;
      es.close();
      setConnected(false);
    };
  }, [user, pushToast, showDesktop]);

  // ---- tab-title flash while there are unread and the tab is hidden ----
  useEffect(() => {
    const base = 'Desk2Desk';
    function apply() {
      document.title =
        document.hidden && unread > 0 ? `(${unread}) ${base}` : base;
    }
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => {
      document.removeEventListener('visibilitychange', apply);
      document.title = base;
    };
  }, [unread]);

  function openToast(n: NotificationDto, key: number) {
    setToasts((prev) => prev.filter((t) => t.key !== key));
    if (n.requestId) navigate(`/requests/${n.requestId}`);
    if (!n.isRead) markRead(n.id);
  }

  return (
    <RealtimeContext.Provider
      value={{
        notifications,
        unread,
        connected,
        markRead,
        markAllRead,
        subscribe,
        desktop,
        enableDesktop,
      }}
    >
      {children}
      <Toaster toasts={toasts} onOpen={openToast} />
    </RealtimeContext.Provider>
  );
}

function Toaster({
  toasts,
  onOpen,
}: {
  toasts: Toast[];
  onOpen: (n: NotificationDto, key: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.key}
          onClick={() => onOpen(t.notification, t.key)}
          className="pointer-events-auto animate-in slide-in-from-right-4 rounded-xl border border-primary/20 bg-card p-3.5 text-left shadow-lg transition hover:shadow-xl"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {t.notification.title}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {t.notification.body}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
