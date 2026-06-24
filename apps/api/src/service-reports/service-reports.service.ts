import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ServiceResolutionStatus, TicketStatus, UserRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertServiceReportDto } from "./dto/upsert-service-report.dto";

@Injectable()
export class ServiceReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async upsertForTicket(ticketId: string, dto: UpsertServiceReportDto, actorUser: { id: string; role: UserRole }) {
    const currentTicket = await this.ensureTicketExists(ticketId);

    const serviceStaffRoles: UserRole[] = [UserRole.SUPERVISOR, UserRole.TECHNICIAN];
    const technicianId = serviceStaffRoles.includes(actorUser.role)
      ? actorUser.id
      : this.requiredString(dto.technicianId, "Technician is required.");
    await this.ensureTechnicianExists(technicianId);

    const data = {
      technicianId,
      diagnosis: this.requiredString(dto.diagnosis, "Diagnosis is required."),
      actionTaken: this.requiredString(dto.actionTaken, "Action taken is required."),
      partsUsed: this.cleanOptionalString(dto.partsUsed),
      recommendations: this.cleanOptionalString(dto.recommendations),
      technicianRemarks: this.cleanOptionalString(dto.technicianRemarks),
      serviceStartAt: this.parseRequiredDate(dto.serviceStartAt, "serviceStartAt"),
      serviceEndAt: this.parseRequiredDate(dto.serviceEndAt, "serviceEndAt"),
      resolutionStatus: this.parseResolutionStatus(dto.resolutionStatus)
    };

    if (data.serviceEndAt < data.serviceStartAt) {
      throw new BadRequestException("Service end time cannot be before service start time.");
    }

    const shouldMoveToPendingAcknowledgement = currentTicket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT;
    const rawAcknowledgementToken = randomBytes(32).toString("base64url");
    const acknowledgementTokenHash = this.hashToken(rawAcknowledgementToken);
    const tokenExpiresAt = this.addDays(new Date(), 14);

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceReport.create({
        data: {
          ticketId,
          ...data
        },
        include: this.includeDetail()
      });

      await tx.acknowledgement.create({
        data: {
          ticketId,
          serviceReportId: created.id,
          acknowledgementTokenHash,
          tokenExpiresAt
        }
      });

      await tx.serviceReport.update({
        where: { id: created.id },
        data: { submittedForAcknowledgementAt: new Date() }
      });

      if (shouldMoveToPendingAcknowledgement) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: TicketStatus.PENDING_ACKNOWLEDGEMENT,
            closedAt: null
          }
        });

        await tx.ticketStatusHistory.create({
          data: {
            ticketId,
            fromStatus: currentTicket.status,
            toStatus: TicketStatus.PENDING_ACKNOWLEDGEMENT,
            changedByUserId: actorUser.id,
            comment: "Service report submitted and waiting for requester acknowledgement."
          }
        });
      }

      return tx.serviceReport.findUniqueOrThrow({
        where: { id: created.id },
        include: this.includeDetail()
      });
    });

    if (shouldMoveToPendingAcknowledgement) {
      await this.auditService.write({
        actorUserId: actorUser.id,
        action: "UPDATE_TICKET_STATUS",
        entityType: "Ticket",
        entityId: ticketId,
        beforeData: currentTicket,
        afterData: {
          id: ticketId,
          status: TicketStatus.PENDING_ACKNOWLEDGEMENT,
          changedFromServiceReportId: report.id
        }
      });
    }

    await this.auditService.write({
      actorUserId: actorUser.id,
      action: "CREATE_SERVICE_REPORT_ACKNOWLEDGEMENT",
      entityType: "ServiceReport",
      entityId: report.id,
      afterData: {
        ticketId,
        serviceReportId: report.id,
        resolutionStatus: data.resolutionStatus,
        acknowledgementId: report.acknowledgement?.id
      }
    });

    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:13000";
    const acknowledgementUrl = `${webAppUrl.replace(/\/$/, "")}/acknowledgement/${rawAcknowledgementToken}`;

    await this.notificationsService.logServiceReportSubmitted(report.id, acknowledgementUrl);

    return {
      data: {
        ...report,
        acknowledgementUrl
      }
    };
  }

  async getById(id: string) {
    const report = await this.prisma.serviceReport.findUnique({
      where: { id },
      include: this.includeDetail()
    });

    if (!report) {
      throw new NotFoundException("Service report not found.");
    }

    return { data: report };
  }

  private includeDetail() {
    return {
      ticket: {
        include: {
          machine: {
            include: {
              customer: true
            }
          }
        }
      },
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
      acknowledgement: true,
      machineLogs: {
        orderBy: { workDate: "desc" }
      }
    } satisfies Prisma.ServiceReportInclude;
  }

  private async ensureTicketExists(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedTechnicianId: true,
        closedAt: true
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    return ticket;
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

    const serviceStaffRoles: UserRole[] = [UserRole.SUPERVISOR, UserRole.TECHNICIAN];
    if (!user || !serviceStaffRoles.includes(user.role) || !user.isActive) {
      throw new NotFoundException("Active technician or supervisor not found.");
    }
  }

  private parseResolutionStatus(value: string | undefined) {
    const status = value?.trim().toUpperCase();

    if (!status || !Object.values(ServiceResolutionStatus).includes(status as ServiceResolutionStatus)) {
      throw new BadRequestException("resolutionStatus must be RESOLVED, PARTIALLY_RESOLVED, or NOT_RESOLVED.");
    }

    return status as ServiceResolutionStatus;
  }

  private parseRequiredDate(value: string | undefined, fieldName: string) {
    if (!value) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

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

  private hashToken(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
