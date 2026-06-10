import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { Priority, RequestStatus } from '@desk2desk/shared';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Category } from './category.entity';
import { RequestComment } from './request-comment.entity';
import { StatusHistory } from './status-history.entity';
import { WorkAttachment } from './work-attachment.entity';

@Entity()
export class Request extends BaseEntity {
  @Property()
  title!: string;

  @Property({ type: 'text' })
  description!: string;

  @Enum({ items: () => RequestStatus, default: RequestStatus.OPEN })
  status: RequestStatus = RequestStatus.OPEN;

  @Enum({ items: () => Priority, default: Priority.MEDIUM })
  priority: Priority = Priority.MEDIUM;

  @ManyToOne(() => Category, { eager: true })
  category!: Category;

  @ManyToOne(() => User, { eager: true })
  requester!: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  assignee?: User;

  @Property({ type: 'timestamptz', nullable: true })
  claimedAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @OneToMany(() => RequestComment, (c) => c.request)
  comments = new Collection<RequestComment>(this);

  @OneToMany(() => StatusHistory, (h) => h.request)
  history = new Collection<StatusHistory>(this);

  @OneToMany(() => WorkAttachment, (a) => a.request)
  attachments = new Collection<WorkAttachment>(this);
}
