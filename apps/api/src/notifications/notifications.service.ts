import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Notification, User } from '../entities';
import { serializeNotification } from './notification.serializer';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: EntityRepository<Notification>,
    private readonly em: EntityManager,
  ) {}

  async list(user: User, limit = 30) {
    const items = await this.repo.find(
      { recipient: user.id },
      { orderBy: { createdAt: 'desc' }, limit },
    );
    return items.map(serializeNotification);
  }

  async unreadCount(user: User) {
    const count = await this.repo.count({
      recipient: user.id,
      isRead: false,
    });
    return { count };
  }

  async markRead(user: User, id: number) {
    const n = await this.repo.findOne({ id, recipient: user.id });
    if (!n) throw new NotFoundException('Notification not found');
    n.isRead = true;
    await this.em.flush();
    return serializeNotification(n);
  }

  async markAllRead(user: User) {
    await this.em.nativeUpdate(
      Notification,
      { recipient: user.id, isRead: false },
      { isRead: true, updatedAt: new Date() },
    );
    return { success: true };
  }
}
