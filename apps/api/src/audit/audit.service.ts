import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ListAuditLogsInput = {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  actorRequesterName?: string;
  page?: string;
  pageSize?: string;
};

type WriteAuditLogInput = {
  actorUserId?: string | null;
  actorRequesterName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListAuditLogsInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const where: Prisma.AuditLogWhereInput = {};

    if (input.action?.trim()) where.action = { contains: input.action.trim(), mode: "insensitive" };
    if (input.entityType?.trim()) where.entityType = input.entityType.trim();
    if (input.entityId?.trim()) where.entityId = input.entityId.trim();
    if (input.actorUserId?.trim()) where.actorUserId = input.actorUserId.trim();
    if (input.actorRequesterName?.trim()) {
      where.actorRequesterName = { contains: input.actorRequesterName.trim(), mode: "insensitive" };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data: items,
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  async write(input: WriteAuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId || undefined,
        actorRequesterName: input.actorRequesterName || undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: this.toJson(input.beforeData),
        afterData: this.toJson(input.afterData),
        ipAddress: input.ipAddress || undefined,
        userAgent: input.userAgent || undefined
      }
    });
  }

  private toJson(value: unknown) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("Pagination values must be positive integers.");
    }

    return Math.min(parsed, 100);
  }
}
