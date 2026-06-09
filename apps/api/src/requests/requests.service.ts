import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { DashboardStats, RequestStatus, Role } from '@desk2desk/shared';
import {
  Category,
  Request,
  RequestComment,
  StatusHistory,
  User,
} from '../entities';
import { serializeComment, serializeRequest } from '../common/serializers';
import {
  CreateCommentDto,
  CreateRequestDto,
  ReassignDto,
} from './dto/request.dto';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepo: EntityRepository<Request>,
    @InjectRepository(Category)
    private readonly catRepo: EntityRepository<Category>,
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  // ---- Create ----
  async create(requester: User, dto: CreateRequestDto) {
    const category = await this.catRepo.findOne({
      id: dto.categoryId,
      isActive: true,
    });
    if (!category) throw new BadRequestException('Invalid category');

    const request = this.requestRepo.create({
      title: dto.title,
      description: dto.description,
      category,
      requester,
      priority: dto.priority,
      status: RequestStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(request);
    await this.recordHistory(request, null, RequestStatus.OPEN, requester);
    return serializeRequest(request);
  }

  // ---- Lists ----
  /** Requests the user raised. */
  async listMine(user: User) {
    const items = await this.requestRepo.find(
      { requester: user.id },
      { orderBy: { createdAt: 'desc' } },
    );
    return items.map((r) => serializeRequest(r));
  }

  /** OPEN/REOPENED unassigned requests in the supporter's privileged categories. */
  async listAvailable(user: User) {
    const categoryIds = await this.privilegedCategoryIds(user);
    if (categoryIds.length === 0) return [];
    const items = await this.requestRepo.find(
      {
        status: { $in: [RequestStatus.OPEN, RequestStatus.REOPENED] },
        assignee: null,
        category: { $in: categoryIds },
      },
      { orderBy: { priority: 'desc', createdAt: 'asc' } },
    );
    return items.map((r) => serializeRequest(r));
  }

  /** Requests currently assigned to this supporter and not yet closed. */
  async listAssigned(user: User) {
    const items = await this.requestRepo.find(
      {
        assignee: user.id,
        status: {
          $in: [
            RequestStatus.IN_PROGRESS,
            RequestStatus.REOPENED,
            RequestStatus.RESOLVED,
          ],
        },
      },
      { orderBy: { priority: 'desc', createdAt: 'asc' } },
    );
    return items.map((r) => serializeRequest(r));
  }

  /** Admin: every request. */
  async listAll() {
    const items = await this.requestRepo.findAll({
      orderBy: { createdAt: 'desc' },
    });
    return items.map((r) => serializeRequest(r));
  }

  /** Dashboard metrics: personal for everyone, org-wide for admins. */
  async stats(user: User): Promise<DashboardStats> {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // ---- Personal ----
    const categoryIds = user.isProvider
      ? await this.privilegedCategoryIds(user)
      : [];
    const available = categoryIds.length
      ? await this.requestRepo.count({
          status: { $in: [RequestStatus.OPEN, RequestStatus.REOPENED] },
          assignee: null,
          category: { $in: categoryIds },
        })
      : 0;
    const active = await this.requestRepo.count({
      assignee: user.id,
      status: { $in: [RequestStatus.IN_PROGRESS, RequestStatus.REOPENED] },
    });
    const resolvedTotal = await this.requestRepo.count({
      assignee: user.id,
      status: { $in: [RequestStatus.RESOLVED, RequestStatus.CLOSED] },
    });
    const resolvedThisWeek = await this.requestRepo.count({
      assignee: user.id,
      status: { $in: [RequestStatus.RESOLVED, RequestStatus.CLOSED] },
      resolvedAt: { $gte: weekAgo },
    });

    const result: DashboardStats = {
      personal: { available, active, resolvedTotal, resolvedThisWeek },
    };

    if (user.role !== Role.ADMIN) return result;

    // ---- Admin org-wide ----
    const all = await this.requestRepo.findAll({ populate: ['assignee'] });

    const byStatus = Object.values(RequestStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<RequestStatus, number>,
    );
    const catMap = new Map<string, number>();
    const provMap = new Map<
      string,
      { id: string; name: string; handled: number; active: number }
    >();
    let unassignedOpen = 0;
    let createdToday = 0;
    let createdThisWeek = 0;
    let respSum = 0;
    let respN = 0;
    let resSum = 0;
    let resN = 0;

    for (const r of all) {
      byStatus[r.status]++;
      if (
        (r.status === RequestStatus.OPEN ||
          r.status === RequestStatus.REOPENED) &&
        !r.assignee
      ) {
        unassignedOpen++;
      }
      if (r.createdAt >= startOfToday) createdToday++;
      if (r.createdAt >= weekAgo) createdThisWeek++;
      if (r.claimedAt) {
        respSum += r.claimedAt.getTime() - r.createdAt.getTime();
        respN++;
      }
      if (r.resolvedAt && r.claimedAt) {
        resSum += r.resolvedAt.getTime() - r.claimedAt.getTime();
        resN++;
      }
      catMap.set(r.category.name, (catMap.get(r.category.name) ?? 0) + 1);
      if (r.assignee) {
        const a = r.assignee;
        const p = provMap.get(a.id) ?? {
          id: a.id,
          name: a.name,
          handled: 0,
          active: 0,
        };
        if (
          r.status === RequestStatus.RESOLVED ||
          r.status === RequestStatus.CLOSED
        ) {
          p.handled++;
        }
        if (
          r.status === RequestStatus.IN_PROGRESS ||
          r.status === RequestStatus.REOPENED
        ) {
          p.active++;
        }
        provMap.set(a.id, p);
      }
    }

    const activeProviders = await this.userRepo.count({
      isProvider: true,
      isActive: true,
    });

    result.admin = {
      totalRequests: all.length,
      byStatus,
      openBacklog:
        byStatus[RequestStatus.OPEN] + byStatus[RequestStatus.REOPENED],
      unassignedOpen,
      createdToday,
      createdThisWeek,
      avgResponseMinutes: respN
        ? Math.round(respSum / respN / 60000)
        : null,
      avgResolutionMinutes: resN ? Math.round(resSum / resN / 60000) : null,
      byCategory: [...catMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      topProviders: [...provMap.values()]
        .sort((a, b) => b.handled + b.active - (a.handled + a.active))
        .slice(0, 8),
      activeProviders,
    };

    return result;
  }

  async getOne(id: number, user: User) {
    const request = await this.loadRequest(id, [
      'comments',
      'history',
      'requester.department',
      'assignee.department',
    ]);
    await this.assertCanView(request, user);
    return serializeRequest(request, true);
  }

  /**
   * Support a provider has delivered: their resolved/closed requests, dated by
   * resolvedAt. Defaults to today when no range is given.
   */
  async history(user: User, from?: string, to?: string) {
    const { start, end } = this.dayRange(from, to);
    const items = await this.requestRepo.find(
      {
        assignee: user.id,
        status: { $in: [RequestStatus.RESOLVED, RequestStatus.CLOSED] },
        resolvedAt: { $gte: start, $lte: end },
      },
      {
        orderBy: { resolvedAt: 'desc' },
        populate: ['requester.department'],
      },
    );
    return items.map((r) => serializeRequest(r));
  }

  private dayRange(from?: string, to?: string) {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !re.test(from)) || (to && !re.test(to))) {
      throw new BadRequestException('Dates must be in YYYY-MM-DD format');
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}`;
    const fromStr = from || todayStr;
    const toStr = to || fromStr;
    const start = new Date(`${fromStr}T00:00:00.000`);
    const end = new Date(`${toStr}T23:59:59.999`);
    if (start > end) {
      throw new BadRequestException('"from" date must not be after "to" date');
    }
    return { start, end };
  }

  // ---- Transitions ----
  /**
   * Atomic claim: only one provider can win. Claiming immediately moves the
   * request into IN_PROGRESS — there is no separate "start" step.
   */
  async claim(id: number, user: User) {
    const request = await this.loadRequest(id);
    if (
      request.status !== RequestStatus.OPEN &&
      request.status !== RequestStatus.REOPENED
    ) {
      throw new ConflictException('Request is not available to claim');
    }
    if (!user.isProvider) {
      throw new ForbiddenException('Only providers can claim requests');
    }
    await this.assertHasCategoryPrivilege(user, request.category.id);

    const affected = await this.em.nativeUpdate(
      Request,
      {
        id,
        status: { $in: [RequestStatus.OPEN, RequestStatus.REOPENED] },
        assignee: null,
      },
      {
        assignee: user.id,
        status: RequestStatus.IN_PROGRESS,
        claimedAt: new Date(),
        updatedAt: new Date(),
      },
    );
    if (affected === 0) {
      throw new ConflictException('Request was already claimed');
    }
    this.em.clear();
    const fresh = await this.loadRequest(id);
    await this.recordHistory(
      fresh,
      request.status,
      RequestStatus.IN_PROGRESS,
      user,
    );
    return serializeRequest(fresh);
  }

  async resolve(id: number, user: User) {
    const request = await this.loadRequest(id);
    this.assertAssignee(request, user);
    this.assertStatus(request, [
      RequestStatus.IN_PROGRESS,
      RequestStatus.REOPENED,
    ]);
    request.resolvedAt = new Date();
    return this.transition(request, RequestStatus.RESOLVED, user);
  }

  async confirmClose(id: number, user: User) {
    const request = await this.loadRequest(id);
    this.assertRequester(request, user);
    this.assertStatus(request, [RequestStatus.RESOLVED]);
    request.closedAt = new Date();
    return this.transition(request, RequestStatus.CLOSED, user);
  }

  async reopen(id: number, user: User) {
    const request = await this.loadRequest(id);
    this.assertRequester(request, user);
    this.assertStatus(request, [RequestStatus.RESOLVED, RequestStatus.CLOSED]);
    request.closedAt = undefined;
    request.resolvedAt = undefined;
    return this.transition(request, RequestStatus.REOPENED, user);
  }

  async cancel(id: number, user: User) {
    const request = await this.loadRequest(id);
    this.assertRequester(request, user);
    this.assertStatus(request, [RequestStatus.OPEN, RequestStatus.REOPENED]);
    return this.transition(request, RequestStatus.CANCELLED, user);
  }

  /** Admin override: reassign to a (privileged) supporter. */
  async reassign(id: number, dto: ReassignDto) {
    const request = await this.loadRequest(id);
    const provider = await this.userRepo.findOne(
      { id: dto.assigneeId, isActive: true },
      { populate: ['serviceCategories'] },
    );
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.isProvider) {
      throw new ForbiddenException('Target user is not a provider');
    }
    await this.assertHasCategoryPrivilege(provider, request.category.id);
    request.assignee = provider;
    if (
      request.status === RequestStatus.OPEN ||
      request.status === RequestStatus.REOPENED
    ) {
      request.claimedAt = new Date();
      return this.transition(request, RequestStatus.IN_PROGRESS, provider);
    }
    await this.em.flush();
    return serializeRequest(request);
  }

  // ---- Comments ----
  async addComment(id: number, user: User, dto: CreateCommentDto) {
    const request = await this.loadRequest(id);
    await this.assertCanView(request, user);
    const comment = this.em.create(RequestComment, {
      request,
      author: user,
      body: dto.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(comment);
    return serializeComment(comment);
  }

  // ---- Helpers ----
  private async transition(
    request: Request,
    to: RequestStatus,
    actor: User,
  ) {
    const from = request.status;
    request.status = to;
    await this.em.flush();
    await this.recordHistory(request, from, to, actor);
    return serializeRequest(request);
  }

  private async recordHistory(
    request: Request,
    from: RequestStatus | null,
    to: RequestStatus,
    actor: User,
  ) {
    const history = this.em.create(StatusHistory, {
      request,
      fromStatus: from ?? undefined,
      toStatus: to,
      actor,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(history);
  }

  private async loadRequest(id: number, populate: string[] = []) {
    const request = await this.requestRepo.findOne(
      { id },
      { populate: populate as never },
    );
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  private async privilegedCategoryIds(user: User): Promise<number[]> {
    if (!user.serviceCategories.isInitialized()) {
      await user.serviceCategories.init();
    }
    return user.serviceCategories.getItems().map((c) => c.id);
  }

  private async assertHasCategoryPrivilege(user: User, categoryId: number) {
    const ids = await this.privilegedCategoryIds(user);
    if (!ids.includes(categoryId)) {
      throw new ForbiddenException(
        'You do not have the privilege for this category',
      );
    }
  }

  private assertAssignee(request: Request, user: User) {
    if (!request.assignee || request.assignee.id !== user.id) {
      throw new ForbiddenException('Only the assignee can perform this action');
    }
  }

  private assertRequester(request: Request, user: User) {
    if (request.requester.id !== user.id) {
      throw new ForbiddenException('Only the requester can perform this action');
    }
  }

  private assertStatus(request: Request, allowed: RequestStatus[]) {
    if (!allowed.includes(request.status)) {
      throw new ConflictException(
        `Action not allowed from status ${request.status}`,
      );
    }
  }

  private async assertCanView(request: Request, user: User) {
    if (user.role === Role.ADMIN) return;
    if (request.requester.id === user.id) return;
    if (request.assignee?.id === user.id) return;
    // A provider whose service categories include this one may view it.
    if (user.isProvider) {
      const ids = await this.privilegedCategoryIds(user);
      if (ids.includes(request.category.id)) return;
    }
    throw new ForbiddenException('You cannot view this request');
  }
}
