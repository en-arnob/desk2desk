import { Injectable } from '@nestjs/common';
import {
  Observable,
  Subject,
  finalize,
  interval,
  map,
  merge,
} from 'rxjs';
import { RealtimeEvent } from '@desk2desk/shared';

export interface SseMessage {
  data: RealtimeEvent | { kind: 'ping' };
}

/**
 * Tracks open SSE streams per user and fans events out to them. In-memory —
 * fine for a single API instance (add a Redis relay if it ever scales out).
 */
@Injectable()
export class RealtimeService {
  private readonly clients = new Map<string, Set<Subject<RealtimeEvent>>>();

  /** An SSE stream for one user; auto-cleans up when the client disconnects. */
  streamFor(userId: string): Observable<SseMessage> {
    const subject = new Subject<RealtimeEvent>();
    const set = this.clients.get(userId) ?? new Set();
    set.add(subject);
    this.clients.set(userId, set);

    const heartbeat = interval(25_000).pipe(
      map((): SseMessage => ({ data: { kind: 'ping' } })),
    );
    const events = subject
      .asObservable()
      .pipe(map((e): SseMessage => ({ data: e })));

    return merge(events, heartbeat).pipe(
      finalize(() => {
        const current = this.clients.get(userId);
        current?.delete(subject);
        if (current && current.size === 0) this.clients.delete(userId);
      }),
    );
  }

  /** Push an event to every open stream of the given users. */
  emit(userIds: Iterable<string>, event: RealtimeEvent) {
    for (const id of userIds) {
      const set = this.clients.get(id);
      if (!set) continue;
      for (const subject of set) subject.next(event);
    }
  }

  isOnline(userId: string): boolean {
    return this.clients.has(userId);
  }
}
