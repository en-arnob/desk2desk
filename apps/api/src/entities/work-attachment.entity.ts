import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Request } from './request.entity';

@Entity({ tableName: 'work_attachments' })
export class WorkAttachment extends BaseEntity {
  @ManyToOne(() => Request)
  request!: Request;

  @ManyToOne(() => User, { eager: true })
  uploader!: User;

  /** Original file name as uploaded, for display/download. */
  @Property()
  fileName!: string;

  /** Path relative to the upload base dir: Dept/YY/MM/storedName. */
  @Property()
  storedPath!: string;

  @Property()
  mimeType!: string;

  @Property()
  fileSize!: number;
}
