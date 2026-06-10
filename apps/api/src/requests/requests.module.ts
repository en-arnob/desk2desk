import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import {
  Category,
  Request,
  RequestComment,
  StatusHistory,
  User,
  WorkAttachment,
} from '../entities';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Request,
      RequestComment,
      StatusHistory,
      Category,
      User,
      WorkAttachment,
    ]),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
