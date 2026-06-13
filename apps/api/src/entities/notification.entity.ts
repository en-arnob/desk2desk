import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/core';
import { NotificationType } from '@desk2desk/shared';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Request } from './request.entity';

@Entity({ tableName: 'notifications' })
export class Notification extends BaseEntity {
  @ManyToOne(() => User)
  recipient!: User;

  @Enum({ items: () => NotificationType })
  type!: NotificationType;

  @Property()
  title!: string;

  @Property({ type: 'text' })
  body!: string;

  @ManyToOne(() => Request, { nullable: true })
  request?: Request;

  @Property()
  isRead: boolean = false;
}
