import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Request } from './request.entity';

@Entity()
export class RequestComment extends BaseEntity {
  @ManyToOne(() => Request)
  request!: Request;

  @ManyToOne(() => User, { eager: true })
  author!: User;

  @Property({ type: 'text' })
  body!: string;
}
