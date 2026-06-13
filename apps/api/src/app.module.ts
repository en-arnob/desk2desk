import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './mikro-orm.config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { RequestsModule } from './requests/requests.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    MikroOrmModule.forRoot(mikroOrmConfig),
    // Serve the built web SPA from the API itself (single port).
    // From the compiled output (apps/api/dist) this resolves to apps/web/dist.
    // The API routes (global prefix `api`) are excluded so the SPA fallback
    // never shadows them; unknown non-`/api` paths fall back to index.html
    // for client-side routing.
    ServeStaticModule.forRoot({
      rootPath: process.env.WEB_DIST_PATH
        ? process.env.WEB_DIST_PATH
        : join(__dirname, '..', '..', 'web', 'dist'),
      exclude: ['/api', '/api/(.*)'],
    }),
    AuthModule,
    AdminModule,
    RequestsModule,
    RealtimeModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
