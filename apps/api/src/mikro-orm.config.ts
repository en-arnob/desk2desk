import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';
import {
  BaseEntity,
  Category,
  Department,
  Notification,
  Request,
  RequestComment,
  StatusHistory,
  User,
  WorkAttachment,
} from './entities';

dotenv.config();

export default defineConfig({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  dbName: process.env.DB_NAME ?? 'd2d',
  entities: [
    BaseEntity,
    Department,
    Category,
    User,
    Request,
    RequestComment,
    StatusHistory,
    WorkAttachment,
    Notification,
  ],
  migrations: {
    path: './src/migrations',
    pathTs: './src/migrations',
    disableForeignKeys: false,
  },
  extensions: [Migrator],
  debug: process.env.NODE_ENV !== 'production',
});
