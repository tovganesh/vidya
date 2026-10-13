import { prisma } from '../../database/db.js';
import { Prisma } from '@prisma/client';

export interface AuditQueryFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actorId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class AuditService {
  async getAuditLogs(schoolId: string, filters: AuditQueryFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      schoolId,
    };

    if (filters.action && filters.action !== 'ALL') {
      where.action = filters.action;
    }

    if (filters.entityType && filters.entityType !== 'ALL') {
      where.entityType = filters.entityType;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        if (filters.endDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    if (filters.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        {
          actor: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true,
              primaryRole: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Live statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalAllTime, todayCount] = await Promise.all([
      prisma.auditLog.count({ where: { schoolId } }),
      prisma.auditLog.count({
        where: {
          schoolId,
          createdAt: { gte: today },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalAllTime,
        todayCount,
      },
    };
  }

  async getAuditMetadata(schoolId: string) {
    const [actions, entityTypes] = await Promise.all([
      prisma.auditLog.findMany({
        where: { schoolId },
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: { schoolId },
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
      }),
    ]);

    return {
      actions: actions.map((a) => a.action),
      entityTypes: entityTypes.map((e) => e.entityType),
    };
  }
}

export const auditService = new AuditService();
