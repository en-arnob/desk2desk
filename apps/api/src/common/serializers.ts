import {
  CategoryDto,
  CommentDto,
  DepartmentDto,
  RequestDto,
  StatusHistoryDto,
  UserDto,
} from '@desk2desk/shared';
import {
  Category,
  Department,
  Request,
  RequestComment,
  StatusHistory,
  User,
} from '../entities';

export function serializeDepartment(d?: Department | null): DepartmentDto | null {
  if (!d) return null;
  return { id: d.id, name: d.name };
}

export function serializeCategory(c: Category): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    isActive: c.isActive,
  };
}

export function serializeUser(u: User, includeCategories = false): UserDto {
  const dto: UserDto = {
    id: u.id,
    name: u.name,
    role: u.role,
    isProvider: u.isProvider,
    isActive: u.isActive,
    department: u.department ? serializeDepartment(u.department) : null,
  };
  if (includeCategories && u.serviceCategories.isInitialized()) {
    dto.serviceCategories = u.serviceCategories
      .getItems()
      .map(serializeCategory);
  }
  return dto;
}

export function serializeComment(c: RequestComment): CommentDto {
  return {
    id: c.id,
    body: c.body,
    author: serializeUser(c.author),
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeHistory(h: StatusHistory): StatusHistoryDto {
  return {
    id: h.id,
    fromStatus: h.fromStatus ?? null,
    toStatus: h.toStatus,
    actor: serializeUser(h.actor),
    createdAt: h.createdAt.toISOString(),
  };
}

export function serializeRequest(r: Request, detailed = false): RequestDto {
  const dto: RequestDto = {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    category: serializeCategory(r.category),
    requester: serializeUser(r.requester),
    assignee: r.assignee ? serializeUser(r.assignee) : null,
    createdAt: r.createdAt.toISOString(),
    claimedAt: r.claimedAt?.toISOString() ?? null,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    closedAt: r.closedAt?.toISOString() ?? null,
  };
  if (detailed) {
    if (r.comments.isInitialized()) {
      dto.comments = r.comments.getItems().map(serializeComment);
    }
    if (r.history.isInitialized()) {
      dto.history = r.history.getItems().map(serializeHistory);
    }
  }
  return dto;
}
