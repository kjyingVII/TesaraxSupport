import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MachineActivityType, Prisma } from "@prisma/client";
import { AttachmentsService } from "../attachments/attachments.service";
import { parseOptionalPhoneNumber } from "../common/phone-number";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMachineLogDto } from "./dto/create-machine-log.dto";

type ListMachineLogsInput = {
  activityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

type TimelineInput = {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

type TimelineItem = {
  type: "MACHINE_LOG" | "TICKET";
  activityType: MachineActivityType | null;
  eventDate: Date;
  title: string;
  summary: string;
  status: string | null;
  relatedId: string;
  relatedNumber: string | null;
  attachmentCount: number;
  actorName: string | null;
};

@Injectable()
export class MachineLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentsService: AttachmentsService,
    private readonly notificationsService: NotificationsService
  ) {}

  async listLogs(machineId: string, input: ListMachineLogsInput) {
    await this.ensureMachineExists(machineId);

    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const where: Prisma.MachineLogWhereInput = { machineId };

    if (input.activityType?.trim()) {
      where.activityType = this.parseActivityType(input.activityType);
    }

    if (input.dateFrom || input.dateTo) {
      where.workDate = {};
      if (input.dateFrom) where.workDate.gte = this.parseDate(input.dateFrom, "dateFrom");
      if (input.dateTo) where.workDate.lte = this.parseDate(input.dateTo, "dateTo");
    }

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { workSummary: { contains: search, mode: "insensitive" } },
        { partsUsed: { contains: search, mode: "insensitive" } },
        { upgradeVersion: { contains: search, mode: "insensitive" } },
        { upgradeDescription: { contains: search, mode: "insensitive" } }
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.machineLog.findMany({
        where,
        include: {
          loggedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              issueTitle: true,
              status: true
            }
          },
          _count: {
            select: {
              attachments: true
            }
          }
        },
        orderBy: { workDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.machineLog.count({ where })
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

  async createLog(machineId: string, dto: CreateMachineLogDto) {
    const machine = await this.getMachine(machineId);
    const activityType = this.parseActivityType(dto.activityType);
    const workDate = this.parseRequiredDate(dto.workDate, "workDate");
    const workEndAt = this.parseNullableDate(dto.workEndAt, "workEndAt");
    const title = this.requiredString(dto.title, "Title is required.");
    const workSummary = this.requiredString(dto.workSummary, "Work summary is required.");
    const ticketId = this.cleanOptionalString(dto.ticketId);
    const serviceReportId = this.cleanOptionalString(dto.serviceReportId);
    const loggedByUserId = this.cleanOptionalString(dto.loggedByUserId);
    const loggedByContactPhone = parseOptionalPhoneNumber(dto.requesterContactPhone, "Logged by contact number");
    const notifyCustomer = dto.notifyCustomer === true;
    const notifyRecipientPhone = parseOptionalPhoneNumber(dto.notifyRecipientPhone, "Notify recipient phone");

    if (notifyCustomer && !notifyRecipientPhone) {
      throw new BadRequestException("Notify recipient phone is required when notifying customer.");
    }

    if (ticketId) {
      await this.ensureTicketBelongsToMachine(ticketId, machineId);
    }

    if (serviceReportId) {
      await this.ensureServiceReportExists(serviceReportId);
    }

    if (loggedByUserId) {
      await this.ensureUserExists(loggedByUserId);
    }

    if (workEndAt && workEndAt < workDate) {
      throw new BadRequestException("workEndAt cannot be earlier than workDate.");
    }

    const preparedAttachments = await this.attachmentsService.prepareTicketAttachments(dto.attachments);

    const nextServiceDueOverrideAt = this.parseNullableDate(
      dto.nextServiceDueOverrideAt,
      "nextServiceDueOverrideAt"
    );

    const log = await this.prisma.$transaction(async (tx) => {
      const created = await tx.machineLog.create({
        data: {
          machineId,
          ticketId,
          serviceReportId,
          activityType,
          workDate,
          workEndAt,
          title,
          workSummary,
          partsUsed: this.cleanOptionalString(dto.partsUsed),
          upgradeVersion: this.cleanOptionalString(dto.upgradeVersion),
          upgradeDescription: this.cleanOptionalString(dto.upgradeDescription),
          nextServiceDueOverrideAt,
          requesterConfirmedName: this.cleanOptionalString(dto.requesterConfirmedName),
          requesterContactPhone: loggedByContactPhone,
          requesterContactEmail: this.cleanOptionalString(dto.requesterContactEmail),
          requesterAcknowledgementRequired: dto.requesterAcknowledgementRequired === true,
          requesterConfirmedAt: this.parseOptionalDate(dto.requesterConfirmedAt, "requesterConfirmedAt"),
          notifyCustomer,
          notifyRecipientName: this.cleanOptionalString(dto.notifyRecipientName),
          notifyRecipientPhone,
          notifyRecipientEmail: this.cleanOptionalString(dto.notifyRecipientEmail),
          notifyMessage: this.cleanOptionalString(dto.notifyMessage),
          loggedByUserId,
          loggedByRequesterName: this.cleanOptionalString(dto.loggedByRequesterName)
        },
        include: {
          machine: true,
          ticket: true,
          loggedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (activityType === MachineActivityType.MACHINE_MAINTENANCE) {
        await tx.machine.update({
          where: { id: machineId },
          data: {
            lastServiceAt: workDate,
            nextServiceDueAt:
              nextServiceDueOverrideAt ??
              this.addDays(workDate, machine.serviceReminderIntervalDays)
          }
        });
      }

      return created;
    });

    await this.attachmentsService.saveMachineLogAttachments(log.id, preparedAttachments, {
      uploadedByUserId: loggedByUserId,
      uploadedByRequesterName: this.cleanOptionalString(dto.loggedByRequesterName) ?? this.cleanOptionalString(dto.requesterConfirmedName)
    });

    await this.notificationsService.logMachineLogCreated(log.id);

    return { data: log };
  }

  async getLogById(machineId: string, logId: string) {
    await this.ensureMachineExists(machineId);

    const log = await this.prisma.machineLog.findFirst({
      where: {
        id: logId,
        machineId
      },
      include: {
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
            issueDescription: true,
            status: true,
            requesterName: true,
            requesterPhone: true,
            requesterEmail: true
          }
        },
        serviceReport: true,
        loggedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        acknowledgement: {
          include: {
            signatureAttachment: true
          }
        },
        attachments: {
          include: {
            uploadedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!log) {
      throw new NotFoundException("Machine log not found.");
    }

    return { data: log };
  }

  async getTimeline(machineId: string, input: TimelineInput) {
    await this.ensureMachineExists(machineId);

    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const type = this.parseTimelineType(input.type);
    const dateFrom = input.dateFrom ? this.parseDate(input.dateFrom, "dateFrom") : undefined;
    const dateTo = input.dateTo ? this.parseDate(input.dateTo, "dateTo") : undefined;
    const search = input.search?.trim().toLowerCase();
    const dateFilter = this.buildDateFilter(dateFrom, dateTo);

    const [machineLogs, tickets] = await this.prisma.$transaction([
      this.prisma.machineLog.findMany({
        where: {
          machineId,
          ...(this.isActivityTimelineType(type) ? { activityType: type } : {}),
          ...(type === "TICKET" ? { id: "__never__" } : {}),
          ...(dateFilter ? { workDate: dateFilter } : {})
        },
        include: {
          loggedByUser: {
            select: {
              name: true
            }
          },
          _count: {
            select: {
              attachments: true
            }
          }
        },
        orderBy: { workDate: "desc" }
      }),
      this.prisma.ticket.findMany({
        where: {
          machineId,
          ...(type === "MACHINE_LOG" || this.isActivityTimelineType(type) ? { id: "__never__" } : {}),
          ...(dateFilter ? { createdAt: dateFilter } : {})
        },
        include: {
          _count: {
            select: {
              attachments: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const items: TimelineItem[] = [
      ...machineLogs.map((log) => ({
        type: "MACHINE_LOG" as const,
        activityType: log.activityType,
        eventDate: log.workDate,
        title: log.title,
        summary: log.workSummary,
        status: null,
        relatedId: log.id,
        relatedNumber: log.upgradeVersion,
        attachmentCount: log._count.attachments,
        actorName: log.loggedByRequesterName ?? log.loggedByUser?.name ?? null
      })),
      ...tickets.map((ticket) => ({
        type: "TICKET" as const,
        activityType: null,
        eventDate: ticket.createdAt,
        title: ticket.issueTitle,
        summary: ticket.issueDescription,
        status: ticket.status,
        relatedId: ticket.id,
        relatedNumber: ticket.ticketNumber,
        attachmentCount: ticket._count.attachments,
        actorName: ticket.requesterName
      }))
    ];

    const filtered = search
      ? items.filter((item) =>
          [
            item.type,
            item.title,
            item.summary,
            item.status,
            item.relatedNumber,
            item.actorName
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search))
        )
      : items;

    filtered.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return {
      data: paged,
      meta: {
        page,
        pageSize,
        total: filtered.length
      }
    };
  }

  private async getMachine(id: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      select: {
        id: true,
        serviceReminderIntervalDays: true
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    return machine;
  }

  private async ensureMachineExists(id: string) {
    await this.getMachine(id);
  }

  private async ensureTicketBelongsToMachine(ticketId: string, machineId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        machineId: true
      }
    });

    if (!ticket || ticket.machineId !== machineId) {
      throw new NotFoundException("Ticket not found for this machine.");
    }
  }

  private async ensureServiceReportExists(serviceReportId: string) {
    const report = await this.prisma.serviceReport.findUnique({
      where: { id: serviceReportId },
      select: { id: true }
    });

    if (!report) {
      throw new NotFoundException("Service report not found.");
    }
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }
  }

  private parseActivityType(value: string | undefined) {
    const activityType = value?.trim().toUpperCase() || MachineActivityType.CORRECTIVE_SERVICE;

    if (!Object.values(MachineActivityType).includes(activityType as MachineActivityType)) {
      throw new BadRequestException("activityType must be CORRECTIVE_SERVICE, MACHINE_MAINTENANCE, COMPONENT_REPLACEMENT, INSPECTION_DIAGNOSIS, UPGRADE, or OTHER.");
    }

    return activityType as MachineActivityType;
  }

  private activityTypeLabel(value: MachineActivityType) {
    switch (value) {
      case MachineActivityType.MACHINE_MAINTENANCE:
        return "Machine maintenance";
      case MachineActivityType.COMPONENT_REPLACEMENT:
        return "Component replacement";
      case MachineActivityType.INSPECTION_DIAGNOSIS:
        return "Inspection / diagnosis";
      case MachineActivityType.UPGRADE:
        return "Upgrade";
      case MachineActivityType.OTHER:
        return "Other";
      case MachineActivityType.CORRECTIVE_SERVICE:
      default:
        return "Corrective service";
    }
  }

  private parseTimelineType(value: string | undefined) {
    if (!value?.trim()) return undefined;

    const type = value.trim().toUpperCase();
    if (type === "MACHINE_LOG" || type === "TICKET" || this.isActivityTimelineType(type)) {
      return type;
    }

    throw new BadRequestException("type must be MACHINE_LOG, TICKET, or a valid machine activity type.");
  }

  private isActivityTimelineType(value: string | undefined): value is MachineActivityType {
    return Object.values(MachineActivityType).includes(value as MachineActivityType);
  }

  private buildDateFilter(dateFrom?: Date, dateTo?: Date) {
    if (!dateFrom && !dateTo) return undefined;

    const filter: Prisma.DateTimeFilter = {};
    if (dateFrom) filter.gte = dateFrom;
    if (dateTo) filter.lte = dateTo;
    return filter;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("Pagination values must be positive integers.");
    }

    return Math.min(parsed, 100);
  }

  private parseRequiredDate(value: string | undefined, fieldName: string) {
    if (!value) {
      throw new BadRequestException(`${fieldName} is required.`);
    }
    return this.parseDate(value, fieldName);
  }

  private parseOptionalDate(value: string | undefined, fieldName: string) {
    if (!value) return undefined;
    return this.parseDate(value, fieldName);
  }

  private parseNullableDate(value: string | null | undefined, fieldName: string) {
    if (value === null) return null;
    if (value === undefined) return undefined;
    return this.parseDate(value, fieldName);
  }

  private parseDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }
    return date;
  }

  private requiredString(value: string | undefined, message: string) {
    const cleaned = value?.trim();
    if (!cleaned) {
      throw new BadRequestException(message);
    }
    return cleaned;
  }

  private cleanOptionalString(value: string | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
