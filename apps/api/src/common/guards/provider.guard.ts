import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/** Allows access only to users flagged as providers (isProvider === true). */
@Injectable()
export class ProviderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.isProvider) {
      throw new ForbiddenException('Provider access required');
    }
    return true;
  }
}
