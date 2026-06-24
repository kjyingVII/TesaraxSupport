import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ScheduledTaskStatus, ScheduledTaskType, TicketPriority, UserRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { parseNullablePhoneNumber } from "../common/phone-number";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateScheduledTaskDto } from "./dto/create-scheduled-task.dto";
import { UpdateScheduledTaskDto } from "./dto/update-scheduled-task.dto";

type ListScheduledTasksInput = {
  customerId?: string;
  machineId?: string;
  ticketId?: string;
  technicianId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

@Injectable()
export class ScheduledTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async list(input: ListScheduledTasksInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 25);
    const where: Prisma.ScheduledTaskWhereInput = {};

    if (input.customerId?.trim()) where.customerId = input.customerId.trim();
    if (input.machineId?.trim()) where.machineId = input.machineId.trim();
    if (input.ticketId?.trim()) where.ticketId = input.ticketId.trim();
    if (input.technicianId?.trim()) {
      where.assignments = {
        some: {
          technicianId: input.technicianId.trim()
        }
      };
    }
    if (input.status?.trim()) where.status = this.parseStatus(input.status);
    if (input.dateFrom || input.dateTo) {
      where.scheduledStartAt = {};
      if (input.dateFrom) where.scheduledStartAt.gte = this.parseDate(input.dateFrom, "dateFrom");
      if (input.dateTo) where.scheduledStartAt.lte = this.parseDate(input.dateTo, "dateTo");
    }
    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { internalRemarks: { contains: search, mode: "insensitive" } },
        { machine: { machineName: { contains: search, mode: "insensitive" } } },
        { machine: { serialNumber: { contains: search, mode: "insensitive" } } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { ticket: { ticketNumber: { contains: search, mode: "insensitive" } } }
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.scheduledTask.findMany({
        where,
        include: this.includeTask(),
        orderBy: [
          { scheduledStartAt: "asc" },
          { createdAt: "desc" }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.scheduledTask.count({ where })
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

  async getById(id: string) {
    const task = await this.prisma.scheduledTask.findUnique({
      where: { id },
      include: this.includeTask()
    });

    if (!task) throw new NotFoundException("Scheduled task not found.");
    return { data: task };
  }

  async create(dto: CreateScheduledTaskDto, actorUserId: string) {
    const title = this.requiredString(dto.title, "Title is required.");
    const taskType = this.parseTaskType(dto.taskType);
    const scheduledStartAt = this.parseDate(dto.scheduledStartAt, "scheduledStartAt");
    const scheduledEndAt = this.parseNullableDate(dto.scheduledEndAt, "scheduledEndAt");
    if (scheduledEndAt && scheduledEndAt <= scheduledStartAt) {
      throw new BadRequestException("Scheduled end time must be after start time.");
    }

    const context = await this.resolveTaskContext(dto);
    const assignedTechnicianIds = this.uniqueStrings(dto.assignedTechnicianIds ?? []);
    await this.ensureActiveTechnicians(assignedTechnicianIds);
    const notifyRecipientName = this.cleanNullableString(dto.notifyRecipientName);
    const notifyRecipientPhone = parseNullablePhoneNumber(dto.notifyRecipientPhone, "Notify recipient phone");
    const notifyRecipientEmail = this.cleanNullableString(dto.notifyRecipientEmail);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.scheduledTask.create({
        data: {
          customerId: context.customerId,
          machineId: context.machineId,
          ticketId: context.ticketId,
          title,
          taskType,
          description: this.cleanNullableString(dto.description),
          scheduledStartAt,
          scheduledEndAt,
          status: dto.status ? this.parseStatus(dto.status) : ScheduledTaskStatus.SCHEDULED,
          priority: dto.priority ? this.parsePriority(dto.priority) : context.priority,
          notifyRecipientName,
          notifyRecipientPhone,
          notifyRecipientEmail,
          createdByUserId: actorUserId,
          internalRemarks: this.cleanNullableString(dto.internalRemarks)
        }
      });

      await this.replaceAssignments(tx, created.id, assignedTechnicianIds, actorUserId);
      return tx.scheduledTask.findUniqueOrThrow({
        where: { id: created.id },
        include: this.includeTask()
      });
    });

    await this.auditService.write({
      actorUserId,
      action: "CREATE_SCHEDULED_TASK",
      entityType: "ScheduledTask",
      entityId: task.id,
      afterData: task
    });

    await this.notificationsService.logScheduledTaskCreated(task.id);

    return { data: task };
  }

  async update(id: string, dto: UpdateScheduledTaskDto, actorUserId: string) {
    const before = await this.prisma.scheduledTask.findUnique({
      where: { id },
      include: this.includeTask()
    });
    if (!before) throw new NotFoundException("Scheduled task not found.");

    const context = dto.ticketId !== undefined || dto.machineId !== undefined || dto.customerId !== undefined
      ? await this.resolveTaskContext({
          ticketId: dto.ticketId,
          machineId: dto.machineId ?? before.machineId,
          customerId: dto.customerId ?? before.customerId
        })
      : {
          ticketId: before.ticketId,
          machineId: before.machineId,
          customerId: before.customerId,
          priority: before.priority
        };

    const data: Prisma.ScheduledTaskUpdateInput = {
      customer: { connect: { id: context.customerId } },
      machine: { connect: { id: context.machineId } },
      ticket: context.ticketId ? { connect: { id: context.ticketId } } : { disconnect: true }
    };

    if (dto.title !== undefined) data.title = this.requiredString(dto.title, "Title cannot be empty.");
    if (dto.taskType !== undefined) data.taskType = this.parseTaskType(dto.taskType);
    if (dto.description !== undefined) data.description = this.cleanNullableString(dto.description);
    if (dto.scheduledStartAt !== undefined) data.scheduledStartAt = this.parseDate(dto.scheduledStartAt, "scheduledStartAt");
    if (dto.scheduledEndAt !== undefined) data.scheduledEndAt = this.parseNullableDate(dto.scheduledEndAt, "scheduledEndAt");
    if (dto.status !== undefined) data.status = this.parseStatus(dto.status);
    if (dto.priority !== undefined) data.priority = this.parsePriority(dto.priority);
    if (dto.notifyRecipientName !== undefined) data.notifyRecipientName = this.cleanNullableString(dto.notifyRecipientName);
    if (dto.notifyRecipientPhone !== undefined) data.notifyRecipientPhone = parseNullablePhoneNumber(dto.notifyRecipientPhone, "Notify recipient phone");
    if (dto.notifyRecipientEmail !== undefined) data.notifyRecipientEmail = this.cleanNullableString(dto.notifyRecipientEmail);
    if (dto.internalRemarks !== undefined) data.internalRemarks = this.cleanNullableString(dto.internalRemarks);
    if (dto.completedByUserId !== undefined) {
      data.completedByUser = dto.completedByUserId ? { connect: { id: dto.completedByUserId } } : { disconnect: true };
    }

    const start = dto.scheduledStartAt !== undefined ? data.scheduledStartAt as Date : before.scheduledStartAt;
    const end = dto.scheduledEndAt !== undefined ? data.scheduledEndAt as Date | null : before.scheduledEndAt;
    if (end && end <= start) throw new BadRequestException("Scheduled end time must be after start time.");

    const assignedTechnicianIds = dto.assignedTechnicianIds ? this.uniqueStrings(dto.assignedTechnicianIds) : undefined;
    if (assignedTechnicianIds) await this.ensureActiveTechnicians(assignedTechnicianIds);

    const task = await this.prisma.$transaction(async (tx) => {
      await tx.scheduledTask.update({
        where: { id },
        data
      });
      if (assignedTechnicianIds) {
        await this.replaceAssignments(tx, id, assignedTechnicianIds, actorUserId);
      }
      return tx.scheduledTask.findUniqueOrThrow({
        where: { id },
        include: this.includeTask()
      });
    });

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_SCHEDULED_TASK",
      entityType: "ScheduledTask",
      entityId: id,
      beforeData: before,
      afterData: task
    });

    return { data: task };
  }

  async cancel(id: string, actorUserId: string) {
    return this.update(id, { status: ScheduledTaskStatus.CANCELLED }, actorUserId);
  }

  async complete(id: string, actorUserId: string) {
    const task = await this.prisma.scheduledTask.update({
      where: { id },
      data: {
        status: ScheduledTaskStatus.COMPLETED,
        completedByUserId: actorUserId,
        completedAt: new Date()
      },
      include: this.includeTask()
    }).catch(() => null);

    if (!task) throw new NotFoundException("Scheduled task not found.");

    await this.auditService.write({
      actorUserId,
      action: "COMPLETE_SCHEDULED_TASK",
      entityType: "ScheduledTask",
      entityId: id,
      afterData: task
    });

    return { data: task };
  }

  async notifyRescheduled(id: string, actorUserId: string) {
    const task = await this.prisma.scheduledTask.findUnique({
      where: { id },
      include: this.includeTask()
    });

    if (!task) throw new NotFoundException("Scheduled task not found.");

    await this.notificationsService.logScheduledTaskRescheduled(id);

    const updated = await this.prisma.scheduledTask.findUniqueOrThrow({
      where: { id },
      include: this.includeTask()
    });

    await this.auditService.write({
      actorUserId,
      action: "NOTIFY_SCHEDULED_TASK_RESCHEDULED",
      entityType: "ScheduledTask",
      entityId: id,
      beforeData: task,
      afterData: updated
    });

    return { data: updated };
  }

  private async resolveTaskContext(dto: { ticketId?: string | null; machineId?: string; customerId?: string }) {
    const ticketId = this.cleanNullableString(dto.ticketId);
    if (ticketId) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          machineId: true,
          priority: true,
          machine: {
            select: {
              customerId: true
            }
          }
        }
      });
      if (!ticket) throw new NotFoundException("Ticket not found.");
      return {
        ticketId: ticket.id,
        machineId: ticket.machineId,
        customerId: ticket.machine.customerId,
        priority: ticket.priority
      };
    }

    const machineId = this.requiredString(dto.machineId, "Machine is required.");
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: {
        id: true,
        customerId: true
      }
    });
    if (!machine) throw new NotFoundException("Machine not found.");
    if (dto.customerId && dto.customerId !== machine.customerId) {
      throw new BadRequestException("Customer does not match selected machine.");
    }

    return {
      ticketId: null,
      machineId: machine.id,
      customerId: machine.customerId,
      priority: TicketPriority.NORMAL
    };
  }

  private async replaceAssignments(
    tx: Prisma.TransactionClient,
    scheduledTaskId: string,
    technicianIds: string[],
    actorUserId?: string
  ) {
    await tx.scheduledTaskAssignment.deleteMany({
      where: {
        scheduledTaskId,
        technicianId: {
          notIn: technicianIds
        }
      }
    });

    for (const technicianId of technicianIds) {
      await tx.scheduledTaskAssignment.upsert({
        where: {
          scheduledTaskId_technicianId: {
            scheduledTaskId,
            technicianId
          }
        },
        update: {},
        create: {
          scheduledTaskId,
          technicianId,
          assignedByUserId: actorUserId
        }
      });
    }
  }

  private async ensureActiveTechnicians(technicianIds: string[]) {
    if (technicianIds.length === 0) return;
    const count = await this.prisma.user.count({
      where: {
        id: { in: technicianIds },
        role: { in: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN] },
        isActive: true
      }
    });
    if (count !== technicianIds.length) throw new BadRequestException("One or more assigned technicians are invalid or inactive.");
  }

  private includeTask() {
    return {
      customer: true,
      machine: {
        include: {
          customer: true
        }
      },
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          issueTitle: true,
          status: true,
          priority: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      completedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      assignments: {
        include: {
          technician: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              isActive: true
            }
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    } satisfies Prisma.ScheduledTaskInclude;
  }

  private parseTaskType(value: string | undefined) {
    const taskType = this.requiredString(value, "Task type is required.").toUpperCase();
    if (!Object.values(ScheduledTaskType).includes(taskType as ScheduledTaskType)) throw new BadRequestException("Invalid task type.");
    return taskType as ScheduledTaskType;
  }

  private parseStatus(value: string | undefined) {
    const status = this.requiredString(value, "Status is required.").toUpperCase();
    if (!Object.values(ScheduledTaskStatus).includes(status as ScheduledTaskStatus)) throw new BadRequestException("Invalid scheduled task status.");
    return status as ScheduledTaskStatus;
  }

  private parsePriority(value: string | undefined) {
    const priority = this.requiredString(value, "Priority is required.").toUpperCase();
    if (!Object.values(TicketPriority).includes(priority as TicketPriority)) throw new BadRequestException("Invalid priority.");
    return priority as TicketPriority;
  }

  private parseDate(value: string | undefined, field: string) {
    const cleaned = this.requiredString(value, `${field} is required.`);
    const parsed = new Date(cleaned);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`${field} must be a valid date.`);
    return parsed;
  }

  private parseNullableDate(value: string | null | undefined, field: string) {
    if (value === null || value === "") return null;
    if (value === undefined) return undefined;
    return this.parseDate(value, field);
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new BadRequestException("Pagination values must be positive integers.");
    return Math.min(parsed, 100);
  }

  private requiredString(value: string | undefined | null, message: string) {
    const cleaned = value?.trim();
    if (!cleaned) throw new BadRequestException(message);
    return cleaned;
  }

  private cleanNullableString(value: string | null | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private uniqueStrings(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
