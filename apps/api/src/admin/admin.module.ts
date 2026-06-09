import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category, Department, Request, User } from '../entities';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CatalogController } from './catalog.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Department, Category, User, Request])],
  controllers: [AdminController, CatalogController],
  providers: [AdminService],
})
export class AdminModule {}
