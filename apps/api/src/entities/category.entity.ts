import { Collection, Entity, ManyToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class Category extends BaseEntity {
  @Property({ unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property()
  isActive: boolean = true;

  /** Providers who handle this service category. */
  @ManyToMany(() => User, (user) => user.serviceCategories)
  providers = new Collection<User>(this);
}
