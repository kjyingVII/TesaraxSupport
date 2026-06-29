import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TicketCommentVisibility, TicketPriority, TicketStatus, UserRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AttachmentsService } from "../attachments/attachments.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { CreateTicketCommentDto } from "./dto/create-ticket-comment.dto";
import { UpdateTicketAssignmentsDto } from "./dto/update-ticket-assignments.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

type ListTicketsInput = {
  status?: string;
  priority?: string;
  customerId?: string;
  machineId?: string;
  assignedTechnicianId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly attachmentsService: AttachmentsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService
  ) {}

  async list(input: ListTicketsInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 20);
    const where: Prisma.TicketWhereInput = {};

    if (input.status?.trim()) {
      where.status = this.parseStatus(input.status);
    }

    if (input.priority?.trim()) {
      where.priority = this.parsePriority(input.priority);
    }

    if (input.customerId?.trim()) {
      where.machine = { customerId: input.customerId.trim() };
    }

    if (input.machineId?.trim()) {
      where.machineId = input.machineId.trim();
    }

    if (input.assignedTechnicianId?.trim()) {
      const assignedTechnicianId = input.assignedTechnicianId.trim();
      where.OR = [
        { assignedTechnicianId },
        {
          assignments: {
            some: {
              assignedToUserId: assignedTechnicianId,
              isActive: true
            }
          }
        }
      ];
    }

    if (input.dateFrom || input.dateTo) {
      where.createdAt = {};
      if (input.dateFrom) where.createdAt.gte = this.parseDate(input.dateFrom, "dateFrom");
      if (input.dateTo) where.createdAt.lte = this.parseDate(input.dateTo, "dateTo");
    }

    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { requesterName: { contains: search, mode: "insensitive" } },
        { requesterCompany: { contains: search, mode: "insensitive" } },
        { issueTitle: { contains: search, mode: "insensitive" } },
        { machine: { machineName: { contains: search, mode: "insensitive" } } },
        { machine: { serialNumber: { contains: search, mode: "insensitive" } } }
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          machine: {
            include: {
              customer: true
            }
          },
          assignedTechnician: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          assignments: {
            where: { isActive: true },
            include: {
              assignedToUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
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
            orderBy: [
              { isLead: "desc" },
              { createdAt: "asc" }
            ]
          },
          _count: {
            select: {
              attachments: true,
              comments: true,
              serviceReports: true,
              statusHistory: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.ticket.count({ where })
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
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        machine: {
          include: {
            customer: true
          }
        },
        assignedTechnician: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignments: {
          where: { isActive: true },
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
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
          orderBy: [
            { isLead: "desc" },
            { createdAt: "asc" }
          ]
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
        },
        comments: {
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
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
          },
          orderBy: { createdAt: "desc" }
        },
        statusHistory: {
          orderBy: { createdAt: "desc" }
        },
        serviceReports: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
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
            },
            acknowledgement: {
              include: {
                signatureAttachment: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        acknowledgements: {
          include: {
            signatureAttachment: true
          },
          orderBy: { createdAt: "desc" }
        },
        machineLogs: {
          orderBy: { workDate: "desc" }
        },
        tasks: {
          include: {
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
                }
              },
              orderBy: {
                createdAt: "asc"
              }
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            scheduledStartAt: "asc"
          }
        }
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    const { acknowledgements, ...ticketData } = ticket;

    return {
      data: {
        ...ticketData,
        acknowledgement: acknowledgements[0] ?? null
      }
    };
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, actorUserId?: string) {
    const current = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedTechnicianId: true,
        closedAt: true
      }
    });

    if (!current) {
      throw new NotFoundException("Ticket not found.");
    }

    const nextStatus = this.parseStatus(dto.status);
    await this.ensureAllowedTransition(current.status, nextStatus);

    if (dto.changedByUserId) {
      await this.ensureUserExists(dto.changedByUserId);
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data: {
          status: nextStatus,
          closedAt: nextStatus === TicketStatus.CLOSED ? new Date() : null
        }
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: current.status,
          toStatus: nextStatus,
          changedByUserId: this.cleanOptionalString(dto.changedByUserId),
          changedByRequesterName: this.cleanOptionalString(dto.changedByRequesterName),
          comment: this.cleanOptionalString(dto.comment)
        }
      });

      return updated;
    });

    await this.auditService.write({
      actorUserId,
      action: "UPDATE_TICKET_STATUS",
      entityType: "Ticket",
      entityId: id,
      beforeData: current,
      afterData: {
        id: ticket.id,
        status: ticket.status,
        assignedTechnicianId: ticket.assignedTechnicianId,
        closedAt: ticket.closedAt
      }
    });

    await this.notificationsService.logTicketStatusChanged(id, current.status, ticket.status);

    return { data: ticket };
  }

  async assign(id: string, dto: AssignTicketDto) {
    const assignedTechnicianIds = dto.assignedTechnicianIds?.length
      ? dto.assignedTechnicianIds
      : dto.assignedTechnicianId
        ? [dto.assignedTechnicianId]
        : [];

    return this.updateAssignments(id, {
      assignedTechnicianIds,
      leadTechnicianId: dto.leadTechnicianId ?? dto.assignedTechnicianId,
      assignedByUserId: dto.assignedByUserId,
      comment: dto.comment
    });
  }

  async updateAssignments(id: string, dto: UpdateTicketAssignmentsDto, actorUserId?: string) {
    const current = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedTechnicianId: true,
        assignments: {
          where: { isActive: true },
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: [
            { isLead: "desc" },
            { createdAt: "asc" }
          ]
        }
      }
    });

    if (!current) {
      throw new NotFoundException("Ticket not found.");
    }

    const assignedTechnicianIds = this.uniqueStrings(dto.assignedTechnicianIds ?? []);
    const leadTechnicianId = this.cleanOptionalString(dto.leadTechnicianId);
    const assignedByUserId = this.cleanOptionalString(dto.assignedByUserId) ?? actorUserId;

    if (assignedTechnicianIds.length === 0 && leadTechnicianId) {
      throw new BadRequestException("Lead technician must be included in assigned technicians.");
    }

    if (leadTechnicianId && !assignedTechnicianIds.includes(leadTechnicianId)) {
      throw new BadRequestException("Lead technician must be included in assigned technicians.");
    }

    for (const technicianId of assignedTechnicianIds) {
      await this.ensureTechnicianExists(technicianId);
    }

    if (assignedByUserId) {
      await this.ensureUserExists(assignedByUserId);
    }

    const currentIds = current.assignments.map((assignment) => assignment.assignedToUserId);
    const removeIds = currentIds.filter((technicianId) => !assignedTechnicianIds.includes(technicianId));
    const addIds = assignedTechnicianIds.filter((technicianId) => !currentIds.includes(technicianId));
    const nextLeadTechnicianId = assignedTechnicianIds.length > 0
      ? leadTechnicianId ?? current.assignedTechnicianId ?? assignedTechnicianIds[0]
      : null;
    const shouldSetAssignedStatus = current.status === TicketStatus.NEW && assignedTechnicianIds.length > 0;

    const ticket = await this.prisma.$transaction(async (tx) => {
      if (removeIds.length > 0) {
        await tx.ticketAssignment.updateMany({
          where: {
            ticketId: id,
            assignedToUserId: { in: removeIds },
            isActive: true
          },
          data: {
            isActive: false,
            isLead: false,
            unassignedAt: new Date(),
            unassignedByUserId: assignedByUserId
          }
        });
      }

      if (addIds.length > 0) {
        await tx.ticketAssignment.createMany({
          data: addIds.map((technicianId) => ({
            ticketId: id,
            assignedToUserId: technicianId,
            assignedByUserId: assignedByUserId ?? technicianId,
            isLead: technicianId === nextLeadTechnicianId,
            comment: this.cleanOptionalString(dto.comment)
          }))
        });
      }

      await tx.ticketAssignment.updateMany({
        where: {
          ticketId: id,
          isActive: true,
          assignedToUserId: { in: assignedTechnicianIds }
        },
        data: { isLead: false }
      });

      if (nextLeadTechnicianId) {
        await tx.ticketAssignment.updateMany({
          where: {
            ticketId: id,
            isActive: true,
            assignedToUserId: nextLeadTechnicianId
          },
          data: { isLead: true }
        });
      }

      const updated = await tx.ticket.update({
        where: { id },
        data: {
          assignedTechnicianId: nextLeadTechnicianId,
          status: shouldSetAssignedStatus ? TicketStatus.ASSIGNED : current.status
        }
      });

      if (shouldSetAssignedStatus) {
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: id,
            fromStatus: current.status,
            toStatus: TicketStatus.ASSIGNED,
            changedByUserId: assignedByUserId ?? nextLeadTechnicianId,
            comment: "Ticket assigned."
          }
        });
      }

      return updated;
    });

    const updatedAssignments = await this.prisma.ticketAssignment.findMany({
      where: {
        ticketId: id,
        isActive: true
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { isLead: "desc" },
        { createdAt: "asc" }
      ]
    });

    await this.auditService.write({
      actorUserId,
      action: "ASSIGN_TICKET",
      entityType: "Ticket",
      entityId: id,
      beforeData: {
        assignedTechnicianId: current.assignedTechnicianId,
        assignments: current.assignments.map((assignment) => ({
          assignedToUserId: assignment.assignedToUserId,
          isLead: assignment.isLead,
          assignedToUser: assignment.assignedToUser
        }))
      },
      afterData: {
        assignedTechnicianId: ticket.assignedTechnicianId,
        assignments: updatedAssignments.map((assignment) => ({
          assignedToUserId: assignment.assignedToUserId,
          isLead: assignment.isLead,
          assignedToUser: assignment.assignedToUser
        })),
        comment: this.cleanOptionalString(dto.comment)
      }
    });

    return { data: ticket };
  }

  async listTechnicians() {
    const technicians = await this.prisma.user.findMany({
      where: {
        role: { in: [UserRole.SUPERVISOR, UserRole.TECHNICIAN] },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      },
      orderBy: { name: "asc" }
    });

    return { data: technicians };
  }

  async createComment(id: string, dto: CreateTicketCommentDto, actorUserId?: string) {
    await this.ensureTicketExists(id);
    if (actorUserId) await this.ensureUserExists(actorUserId);

    const commentText = this.requiredString(dto.comment, "Comment is required.");
    const visibility = this.parseCommentVisibility(dto.visibility);
    const preparedAttachments = await this.attachmentsService.prepareTicketAttachments(dto.attachments);

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId: id,
        comment: commentText,
        visibility,
        createdByUserId: actorUserId
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
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

    const attachments = await this.attachmentsService.saveTicketCommentAttachments(comment.id, preparedAttachments, {
      uploadedByUserId: actorUserId
    });

    await this.auditService.write({
      actorUserId,
      action: "CREATE_TICKET_COMMENT",
      entityType: "Ticket",
      entityId: id,
      afterData: {
        comment,
        attachmentCount: attachments.length
      }
    });

    return {
      data: {
        ...comment,
        attachments
      }
    };
  }

  private async ensureAllowedTransition(current: TicketStatus, next: TicketStatus) {
    return;
  }

  private async ensureTicketExists(id: string) {
    await this.getTicketStatus(id);
  }

  private async getTicketStatus(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    return ticket;
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

  private async ensureTechnicianExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        isActive: true
      }
    });

    const assignableRoles: UserRole[] = [UserRole.SUPERVISOR, UserRole.TECHNICIAN];
    if (!user || !assignableRoles.includes(user.role) || !user.isActive) {
      throw new NotFoundException("Active technician or supervisor not found.");
    }
  }

  private parseStatus(value: string | undefined) {
    const status = value?.trim().toUpperCase();

    if (!status || !Object.values(TicketStatus).includes(status as TicketStatus)) {
      throw new BadRequestException("Invalid ticket status.");
    }

    return status as TicketStatus;
  }

  private parsePriority(value: string | undefined) {
    const priority = value?.trim().toUpperCase();

    if (!priority || !Object.values(TicketPriority).includes(priority as TicketPriority)) {
      throw new BadRequestException("Invalid ticket priority.");
    }

    return priority as TicketPriority;
  }

  private parseCommentVisibility(value: string | undefined) {
    if (!value?.trim()) return TicketCommentVisibility.INTERNAL;

    const visibility = value.trim().toUpperCase();
    if (!Object.values(TicketCommentVisibility).includes(visibility as TicketCommentVisibility)) {
      throw new BadRequestException("Comment visibility must be INTERNAL or REQUESTER_VISIBLE.");
    }

    return visibility as TicketCommentVisibility;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("Pagination values must be positive integers.");
    }

    return Math.min(parsed, 100);
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

  private uniqueStrings(values: string[]) {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  }
}
