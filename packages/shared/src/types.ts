import { Priority, RequestStatus, Role } from './enums';

export interface DepartmentDto {
  id: number;
  name: string;
}

export interface CategoryDto {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface UserDto {
  /** Employee ID — also the login identifier. */
  id: string;
  name: string;
  role: Role;
  /** Whether this user can claim and handle support requests. */
  isProvider: boolean;
  isActive: boolean;
  department?: DepartmentDto | null;
  /** Categories this user can provide support for (their service categories). */
  serviceCategories?: CategoryDto[];
}

export interface CommentDto {
  id: number;
  body: string;
  author: UserDto;
  createdAt: string;
}

export interface AttachmentDto {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploader: UserDto;
  createdAt: string;
}

export interface StatusHistoryDto {
  id: number;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  actor: UserDto;
  createdAt: string;
}

export interface RequestDto {
  id: number;
  title: string;
  description: string;
  status: RequestStatus;
  priority: Priority;
  category: CategoryDto;
  requester: UserDto;
  assignee?: UserDto | null;
  createdAt: string;
  claimedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  comments?: CommentDto[];
  history?: StatusHistoryDto[];
  attachments?: AttachmentDto[];
}

// ---- Auth ----
export interface LoginRequest {
  /** Employee ID used to log in. */
  id: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

// ---- Dashboard stats ----
export interface PersonalStats {
  available: number;
  active: number;
  resolvedTotal: number;
  resolvedThisWeek: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ProviderStat {
  id: string;
  name: string;
  handled: number;
  active: number;
}

export interface AdminStats {
  totalRequests: number;
  byStatus: Record<RequestStatus, number>;
  openBacklog: number;
  unassignedOpen: number;
  createdToday: number;
  createdThisWeek: number;
  /** Avg minutes from creation to a provider picking it up. */
  avgResponseMinutes: number | null;
  /** Avg minutes from pick-up to resolution. */
  avgResolutionMinutes: number | null;
  byCategory: CategoryCount[];
  topProviders: ProviderStat[];
  activeProviders: number;
}

export interface DashboardStats {
  personal: PersonalStats;
  admin?: AdminStats;
}

// ---- Request payloads ----
export interface CreateRequestPayload {
  title: string;
  description: string;
  categoryId: number;
  priority: Priority;
}

export interface CreateCommentPayload {
  body: string;
}
