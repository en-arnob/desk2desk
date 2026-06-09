import { Migration } from '@mikro-orm/migrations';

export class Migration20260609063359 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "category" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "description" text null, "is_active" boolean not null default true);`);
    this.addSql(`alter table "category" add constraint "category_name_unique" unique ("name");`);

    this.addSql(`create table "department" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null);`);
    this.addSql(`alter table "department" add constraint "department_name_unique" unique ("name");`);

    this.addSql(`create table "user" ("id" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, "name" varchar(255) not null, "password_hash" varchar(255) not null, "role" text check ("role" in ('USER', 'ADMIN')) not null default 'USER', "is_provider" boolean not null default false, "is_active" boolean not null default true, "department_id" int null, constraint "user_pkey" primary key ("id"));`);

    this.addSql(`create table "request" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "title" varchar(255) not null, "description" text not null, "status" text check ("status" in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED')) not null default 'OPEN', "priority" text check ("priority" in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) not null default 'MEDIUM', "category_id" int not null, "requester_id" varchar(255) not null, "assignee_id" varchar(255) null, "claimed_at" timestamptz null, "resolved_at" timestamptz null, "closed_at" timestamptz null);`);

    this.addSql(`create table "status_history" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "from_status" text check ("from_status" in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED')) null, "to_status" text check ("to_status" in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED')) not null, "actor_id" varchar(255) not null);`);

    this.addSql(`create table "request_comment" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "author_id" varchar(255) not null, "body" text not null);`);

    this.addSql(`create table "user_service_categories" ("user_id" varchar(255) not null, "category_id" int not null, constraint "user_service_categories_pkey" primary key ("user_id", "category_id"));`);

    this.addSql(`alter table "user" add constraint "user_department_id_foreign" foreign key ("department_id") references "department" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "request" add constraint "request_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade;`);
    this.addSql(`alter table "request" add constraint "request_requester_id_foreign" foreign key ("requester_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "request" add constraint "request_assignee_id_foreign" foreign key ("assignee_id") references "user" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "status_history" add constraint "status_history_request_id_foreign" foreign key ("request_id") references "request" ("id") on update cascade;`);
    this.addSql(`alter table "status_history" add constraint "status_history_actor_id_foreign" foreign key ("actor_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "request_comment" add constraint "request_comment_request_id_foreign" foreign key ("request_id") references "request" ("id") on update cascade;`);
    this.addSql(`alter table "request_comment" add constraint "request_comment_author_id_foreign" foreign key ("author_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "user_service_categories" add constraint "user_service_categories_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "user_service_categories" add constraint "user_service_categories_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade on delete cascade;`);
  }

}
