import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

/** Read-only catalog endpoints available to any authenticated user. */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly adminService: AdminService) {}

  @Get('categories')
  activeCategories() {
    return this.adminService.listCategories(true);
  }

  @Get('departments')
  departments() {
    return this.adminService.listDepartments();
  }
}
