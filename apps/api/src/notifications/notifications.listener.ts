import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EntityManager } from '@mikro-orm/core';
import { NotificationType } from '@desk2desk/shared';
import { Notification, Request, User } from '../entities';
import { RealtimeService } from '../realtime/realtime.service';
import { serializeNotification } from './notification.serializer';
import {
  REQUEST_ACTIVITY,
  RequestActivityPayload,
} from '../realtime/request-activity';

interface NotifySpec {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
}

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly em: EntityManager,
    private readonly realtime: RealtimeService,
  ) {}

  @OnEvent(REQUEST_ACTIVITY)
  async handle(p: RequestActivityPayload): Promise<void> {
    try {
      const em = this.em.fork();
      const kind = `request.${p.action}`;

      const { notify, refresh } = await this.plan(em, p);

      // Recipients who get a persisted notification (bell + toast + popup).
      const notified = new Set<string>();
      if (notify) {
        for (const userId of dedupe(notify.userIds, p.actorId)) {
          const n = em.create(Notification, {
            recipient: em.getReference(User, userId),
            type: notify.type,
            title: notify.title,
            body: notify.body,
            request: em.getReference(Request, p.requestId),
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await em.persistAndFlush(n);
          notified.add(userId);
          this.realtime.emit([userId], {
            kind,
            requestId: p.requestId,
            notification: serializeNotification(n),
          });
        }
      }

      // Recipients who only need their views refreshed (no alert).
      for (const userId of dedupe(refresh, p.actorId)) {
        if (notified.has(userId)) continue;
        this.realtime.emit([userId], { kind, requestId: p.requestId });
      }
    } catch (err) {
      this.logger.error(`Failed handling ${p.action} for #${p.requestId}`, err);
    }
  }

  /** Work out who to notify and who to merely refresh, per action. */
  private async plan(
    em: EntityManager,
    p: RequestActivityPayload,
  ): Promise<{ notify: NotifySpec | null; refresh: string[] }> {
    const providers = () => this.eligibleProviders(em, p.categoryId);
    const q = `"${p.title}"`;

    switch (p.action) {
      case 'created':
        return {
          notify: {
            userIds: await providers(),
            type: NotificationType.NEW_REQUEST,
            title: 'New request',
            body: `${p.categoryName}: ${p.title}`,
          },
          refresh: [],
        };

      case 'claimed':
        return {
          notify: {
            userIds: [p.requesterId],
            type: NotificationType.CLAIMED,
            title: 'Request claimed',
            body: `${p.actorName} is now handling ${q}`,
          },
          refresh: await providers(),
        };

      case 'commented':
        return {
          notify: {
            userIds: this.otherParties(p),
            type: NotificationType.COMMENT,
            title: 'New reply',
            body: `${p.actorName}: ${p.extra ?? ''}`.trim(),
          },
          refresh: [],
        };

      case 'attached':
        return {
          notify: {
            userIds: this.otherParties(p),
            type: NotificationType.ATTACHMENT,
            title: 'New attachment',
            body: `${p.actorName} attached ${p.extra ?? 'a file'}`,
          },
          refresh: [],
        };

      case 'resolved':
        return {
          notify: {
            userIds: [p.requesterId],
            type: NotificationType.RESOLVED,
            title: 'Request resolved',
            body: `${p.actorName} resolved ${q} — please confirm`,
          },
          refresh: [],
        };

      case 'closed':
        return {
          notify: p.assigneeId
            ? {
                userIds: [p.assigneeId],
                type: NotificationType.CLOSED,
                title: 'Request closed',
                body: `${q} was confirmed and closed`,
              }
            : null,
          refresh: [],
        };

      case 'reopened':
        return {
          notify: p.assigneeId
            ? {
                userIds: [p.assigneeId],
                type: NotificationType.REOPENED,
                title: 'Request reopened',
                body: `${p.actorName} reopened ${q}`,
              }
            : { userIds: await providers(), type: NotificationType.REOPENED, title: 'Request reopened', body: `${q} is open again` },
          refresh: [],
        };

      case 'reassigned':
        return {
          notify: p.assigneeId
            ? {
                userIds: [p.assigneeId],
                type: NotificationType.REASSIGNED,
                title: 'Assigned to you',
                body: `You've been assigned ${q}`,
              }
            : null,
          refresh: await providers(),
        };

      case 'cancelled':
        return { notify: null, refresh: await providers() };

      default:
        return { notify: null, refresh: [] };
    }
  }

  /** Active providers whose service categories include this category. */
  private async eligibleProviders(
    em: EntityManager,
    categoryId: number,
  ): Promise<string[]> {
    const users = await em.find(User, {
      isProvider: true,
      isActive: true,
      serviceCategories: { id: categoryId },
    });
    return users.map((u) => u.id);
  }

  /** The conversation party that isn't the actor. */
  private otherParties(p: RequestActivityPayload): string[] {
    if (p.actorId === p.requesterId) {
      return p.assigneeId ? [p.assigneeId] : [];
    }
    if (p.assigneeId && p.actorId === p.assigneeId) {
      return [p.requesterId];
    }
    // Actor is neither (e.g. an admin) — tell both.
    return [p.requesterId, ...(p.assigneeId ? [p.assigneeId] : [])];
  }
}

function dedupe(ids: string[], excludeId: string): string[] {
  return [...new Set(ids)].filter((id) => id && id !== excludeId);
}
