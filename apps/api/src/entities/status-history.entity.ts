import { Entity, Enum, ManyToOne } from '@mikro-orm/core';
import { RequestStatus } from '@desk2desk/shared';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Request } from './request.entity';

@Entity()
export class StatusHistory extends BaseEntity {
  @ManyToOne(() => Request)
  request!: Request;

  @Enum({ items: () => RequestStatus, nullable: true })
  fromStatus?: RequestStatus;

  @Enum({ items: () => RequestStatus })
  toStatus!: RequestStatus;

  @ManyToOne(() => User, { eager: true })
  actor!: User;
}
