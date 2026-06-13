import { Migration } from '@mikro-orm/migrations';

export class Migration20260610102752 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "notifications" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "recipient_id" varchar(255) not null, "type" text check ("type" in ('NEW_REQUEST', 'CLAIMED', 'COMMENT', 'ATTACHMENT', 'RESOLVED', 'CLOSED', 'REOPENED', 'REASSIGNED')) not null, "title" varchar(255) not null, "body" text not null, "request_id" int null, "is_read" boolean not null default false);`);

    this.addSql(`alter table "notifications" add constraint "notifications_recipient_id_foreign" foreign key ("recipient_id") references "user" ("id") on update cascade;`);
    this.addSql(`alter table "notifications" add constraint "notifications_request_id_foreign" foreign key ("request_id") references "request" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notifications" cascade;`);
  }

}
