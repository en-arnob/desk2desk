import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.list(user);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.service.unreadCount(user);
  }

  @Post(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.service.markRead(user, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.service.markAllRead(user);
  }
}
