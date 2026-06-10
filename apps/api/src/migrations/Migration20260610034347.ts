import { Migration } from '@mikro-orm/migrations';

export class Migration20260610034347 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "work_attachments" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "request_id" int not null, "uploader_id" varchar(255) not null, "file_name" varchar(255) not null, "stored_path" varchar(255) not null, "mime_type" varchar(255) not null, "file_size" int not null);`);

    this.addSql(`alter table "work_attachments" add constraint "work_attachments_request_id_foreign" foreign key ("request_id") references "request" ("id") on update cascade;`);
    this.addSql(`alter table "work_attachments" add constraint "work_attachments_uploader_id_foreign" foreign key ("uploader_id") references "user" ("id") on update cascade;`);

    this.addSql(`drop table if exists "user_categories" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table "user_categories" ("user_id" int4 not null, "category_id" int4 not null, constraint "user_categories_pkey" primary key ("user_id", "category_id"));`);

    this.addSql(`drop table if exists "work_attachments" cascade;`);
  }

}
