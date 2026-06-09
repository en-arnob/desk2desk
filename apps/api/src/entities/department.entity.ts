import { Collection, Entity, OneToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class Department extends BaseEntity {
  @Property({ unique: true })
  name!: string;

  @OneToMany(() => User, (user) => user.department)
  members = new Collection<User>(this);
}
