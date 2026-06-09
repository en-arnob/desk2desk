import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import * as bcrypt from 'bcryptjs';
import { AuthResponse } from '@desk2desk/shared';
import { User } from '../entities';
import { serializeUser } from '../common/serializers';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne(
      { id: dto.id.trim(), isActive: true },
      { populate: ['department', 'serviceCategories'] },
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    return { accessToken, user: serializeUser(user, true) };
  }

  me(user: User): AuthResponse['user'] {
    return serializeUser(user, true);
  }
}
