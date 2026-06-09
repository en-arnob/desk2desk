import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import * as bcrypt from 'bcryptjs';
import { Category, Department, Request, User } from '../entities';
import {
  serializeCategory,
  serializeDepartment,
  serializeUser,
} from '../common/serializers';
import {
  CreateCategoryDto,
  CreateDepartmentDto,
  CreateUserDto,
  SetUserCategoriesDto,
  UpdateCategoryDto,
  UpdateDepartmentDto,
  UpdateUserDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: EntityRepository<Department>,
    @InjectRepository(Category)
    private readonly catRepo: EntityRepository<Category>,
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    @InjectRepository(Request)
    private readonly requestRepo: EntityRepository<Request>,
    private readonly em: EntityManager,
  ) {}

  // ---- Departments ----
  async listDepartments() {
    const items = await this.deptRepo.findAll({ orderBy: { name: 'asc' } });
    return items.map((d) => serializeDepartment(d));
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const dept = this.deptRepo.create({
      name: dto.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(dept);
    return serializeDepartment(dept);
  }

  async updateDepartment(id: number, dto: UpdateDepartmentDto) {
    const dept = await this.deptRepo.findOne({ id });
    if (!dept) throw new NotFoundException('Department not found');
    dept.name = dto.name;
    await this.em.flush();
    return serializeDepartment(dept);
  }

  async deleteDepartment(id: number) {
    const dept = await this.deptRepo.findOne(
      { id },
      { populate: ['members'] },
    );
    if (!dept) throw new NotFoundException('Department not found');
    // Detach members so we don't orphan accounts, then remove.
    for (const member of dept.members) {
      member.department = undefined;
    }
    await this.em.flush();
    await this.em.removeAndFlush(dept);
    return { success: true };
  }

  // ---- Categories ----
  async listCategories(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    const items = await this.catRepo.find(where, { orderBy: { name: 'asc' } });
    return items.map(serializeCategory);
  }

  async createCategory(dto: CreateCategoryDto) {
    const cat = this.catRepo.create({
      name: dto.name,
      description: dto.description,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(cat);
    return serializeCategory(cat);
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const cat = await this.catRepo.findOne({ id });
    if (!cat) throw new NotFoundException('Category not found');
    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.description !== undefined) cat.description = dto.description;
    if (dto.isActive !== undefined) cat.isActive = dto.isActive;
    await this.em.flush();
    return serializeCategory(cat);
  }

  async deleteCategory(id: number) {
    const cat = await this.catRepo.findOne(
      { id },
      { populate: ['providers'] },
    );
    if (!cat) throw new NotFoundException('Category not found');
    const usage = await this.requestRepo.count({ category: cat.id });
    if (usage > 0) {
      throw new ConflictException(
        `This category is used by ${usage} request(s). Deactivate it instead of deleting.`,
      );
    }
    cat.providers.removeAll();
    await this.em.removeAndFlush(cat);
    return { success: true };
  }

  // ---- Users ----
  async listUsers() {
    const users = await this.userRepo.findAll({
      populate: ['department', 'serviceCategories'],
      orderBy: { name: 'asc' },
    });
    return users.map((u) => serializeUser(u, true));
  }

  async createUser(dto: CreateUserDto) {
    const id = dto.id.trim();
    const existing = await this.userRepo.findOne({ id });
    if (existing) throw new BadRequestException('Employee ID already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      id,
      name: dto.name,
      passwordHash,
      role: dto.role,
      isProvider: dto.isProvider ?? false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (dto.departmentId) {
      user.department = await this.findDepartment(dto.departmentId);
    }
    if (dto.categoryIds?.length) {
      const cats = await this.catRepo.find({ id: { $in: dto.categoryIds } });
      user.serviceCategories.set(cats);
    }
    await this.em.persistAndFlush(user);
    await this.em.populate(user, ['department', 'serviceCategories']);
    return serializeUser(user, true);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne(
      { id },
      { populate: ['department', 'serviceCategories'] },
    );
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isProvider !== undefined) user.isProvider = dto.isProvider;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.departmentId !== undefined) {
      user.department = dto.departmentId
        ? await this.findDepartment(dto.departmentId)
        : undefined;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    await this.em.flush();
    return serializeUser(user, true);
  }

  async setUserCategories(id: string, dto: SetUserCategoriesDto) {
    const user = await this.userRepo.findOne(
      { id },
      { populate: ['serviceCategories', 'department'] },
    );
    if (!user) throw new NotFoundException('User not found');
    const cats = dto.categoryIds.length
      ? await this.catRepo.find({ id: { $in: dto.categoryIds } })
      : [];
    user.serviceCategories.set(cats);
    await this.em.flush();
    return serializeUser(user, true);
  }

  async deleteUser(id: string) {
    const user = await this.userRepo.findOne(
      { id },
      { populate: ['serviceCategories'] },
    );
    if (!user) throw new NotFoundException('User not found');
    const linked =
      (await this.requestRepo.count({ requester: user.id })) +
      (await this.requestRepo.count({ assignee: user.id }));
    if (linked > 0) {
      throw new ConflictException(
        `This user is linked to ${linked} request(s). Disable the account instead of deleting.`,
      );
    }
    user.serviceCategories.removeAll();
    await this.em.removeAndFlush(user);
    return { success: true };
  }

  private async findDepartment(id: number): Promise<Department> {
    const dept = await this.deptRepo.findOne({ id });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }
}
