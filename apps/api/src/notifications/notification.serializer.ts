import { NotificationDto } from '@desk2desk/shared';
import { Notification } from '../entities';

export function serializeNotification(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    requestId: n.request?.id ?? null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}
