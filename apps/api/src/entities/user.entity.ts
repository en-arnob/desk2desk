import {
  Collection,
  Entity,
  Enum,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Role } from '@desk2desk/shared';
import { Department } from './department.entity';
import { Category } from './category.entity';

@Entity()
export class User {
  /**
   * Employee ID assigned by the office (e.g. "005019"). This is the primary
   * key AND the login identifier — not auto-generated, manually assigned.
   */
  @PrimaryKey({ type: 'string' })
  id!: string;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property()
  name!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Enum({ items: () => Role, default: Role.USER })
  role: Role = Role.USER;

  /** Whether this user can claim and handle support requests. */
  @Property()
  isProvider: boolean = false;

  @Property()
  isActive: boolean = true;

  @ManyToOne(() => Department, { nullable: true })
  department?: Department;

  /**
   * Service categories this user (as a provider) handles. Drives which OPEN
   * requests appear in their dashboard. Join table: user_service_categories.
   */
  @ManyToMany(() => Category, (category) => category.providers, { owner: true })
  serviceCategories = new Collection<Category>(this);
}
