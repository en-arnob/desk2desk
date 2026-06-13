import {
  Controller,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../common/decorators/public.decorator';
import { RealtimeService } from './realtime.service';

@Controller()
export class RealtimeController {
  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Server-Sent Events stream. EventSource can't send an Authorization header,
   * so the JWT is passed as a query param and verified here.
   */
  @Public()
  @Sse('events')
  events(@Query('token') token?: string) {
    if (!token) throw new UnauthorizedException('Missing token');
    let userId: string;
    try {
      userId = this.jwt.verify(token).sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    return this.realtime.streamFor(userId);
  }
}
