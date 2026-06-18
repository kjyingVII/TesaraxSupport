import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AcknowledgementResponse, Prisma, ServiceResolutionStatus, TicketStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { AttachmentsService } from "../attachments/attachments.service";
import { PrismaService } from "../prisma/prisma.service";
import { AcceptAcknowledgementDto } from "./dto/accept-acknowledgement.dto";
import { FollowUpAcknowledgementDto } from "./dto/follow-up-acknowledgement.dto";
import { SubmitAcknowledgementDto } from "./dto/submit-acknowledgement.dto";

@Injectable()
export class AcknowledgementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly attachmentsService: AttachmentsService
  ) {}

  async submitForAcknowledgement(ticketId: string, dto: SubmitAcknowledgementDto, actorUserId?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        serviceReports: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    if (ticket.serviceReports.length === 0) {
      throw new BadRequestException("Ticket requires a service report before acknowledgement.");
    }

    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
      throw new BadRequestException("Ticket must be RESOLVED or PENDING_ACKNOWLEDGEMENT before creating an acknowledgement link.");
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(rawToken);
    const tokenExpiresAt = dto.tokenExpiresAt
      ? this.parseDate(dto.tokenExpiresAt, "tokenExpiresAt")
      : this.addDays(new Date(), 14);
    const submittedByUserId = this.cleanOptionalString(dto.submittedByUserId) ?? actorUserId;

    if (submittedByUserId) {
      await this.ensureUserExists(submittedByUserId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const latestReport = ticket.serviceReports[0];
      const acknowledgement = await tx.acknowledgement.upsert({
        where: { serviceReportId: latestReport.id },
        update: {
          acknowledgementTokenHash: tokenHash,
          tokenExpiresAt,
          response: null,
          requesterName: null,
          requesterPhone: null,
          requesterEmail: null,
          requesterComment: null,
          signatureAttachmentId: null,
          acknowledgedAt: null
        },
        create: {
          ticketId,
          serviceReportId: latestReport.id,
          acknowledgementTokenHash: tokenHash,
          tokenExpiresAt
        }
      });

      if (ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { status: TicketStatus.PENDING_ACKNOWLEDGEMENT }
        });

        await tx.ticketStatusHistory.create({
          data: {
            ticketId,
            fromStatus: ticket.status,
            toStatus: TicketStatus.PENDING_ACKNOWLEDGEMENT,
            changedByUserId: submittedByUserId,
            comment: "Ticket submitted for requester acknowledgement."
          }
        });
      }

      return acknowledgement;
    });

    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:13000";
    const acknowledgementUrl = `${webAppUrl.replace(/\/$/, "")}/acknowledgement/${rawToken}`;

    await this.auditService.write({
      actorUserId,
      action: ticket.status === TicketStatus.PENDING_ACKNOWLEDGEMENT
        ? "REGENERATE_ACKNOWLEDGEMENT_LINK"
        : "SUBMIT_FOR_ACKNOWLEDGEMENT",
      entityType: "Ticket",
      entityId: ticketId,
      beforeData: {
        id: ticket.id,
        status: ticket.status,
        acknowledgementId: result.id
      },
      afterData: {
        id: ticket.id,
        status: TicketStatus.PENDING_ACKNOWLEDGEMENT,
        acknowledgementId: result.id,
        tokenExpiresAt,
        linkRegenerated: ticket.status === TicketStatus.PENDING_ACKNOWLEDGEMENT
      }
    });

    return {
      data: {
        ticketId,
        acknowledgementId: result.id,
        status: TicketStatus.PENDING_ACKNOWLEDGEMENT,
        tokenExpiresAt,
        acknowledgementUrl
      }
    };
  }

  async createServiceReportAcknowledgementLink(serviceReportId: string, dto: SubmitAcknowledgementDto, actorUserId?: string) {
    const serviceReport = await this.prisma.serviceReport.findUnique({
      where: { id: serviceReportId },
      include: {
        ticket: true,
        acknowledgement: true
      }
    });

    if (!serviceReport) {
      throw new NotFoundException("Service report not found.");
    }

    if (serviceReport.acknowledgement?.response) {
      throw new BadRequestException("Service report has already been acknowledged.");
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(rawToken);
    const tokenExpiresAt = dto.tokenExpiresAt
      ? this.parseDate(dto.tokenExpiresAt, "tokenExpiresAt")
      : this.addDays(new Date(), 14);
    const submittedByUserId = this.cleanOptionalString(dto.submittedByUserId) ?? actorUserId;

    if (submittedByUserId) {
      await this.ensureUserExists(submittedByUserId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const acknowledgement = await tx.acknowledgement.upsert({
        where: { serviceReportId },
        update: {
          acknowledgementTokenHash: tokenHash,
          tokenExpiresAt,
          response: null,
          requesterName: null,
          requesterPhone: null,
          requesterEmail: null,
          requesterComment: null,
          signatureAttachmentId: null,
          acknowledgedAt: null
        },
        create: {
          ticketId: serviceReport.ticketId,
          serviceReportId,
          acknowledgementTokenHash: tokenHash,
          tokenExpiresAt
        }
      });

      if (serviceReport.ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
        await tx.ticket.update({
          where: { id: serviceReport.ticketId },
          data: {
            status: TicketStatus.PENDING_ACKNOWLEDGEMENT,
            closedAt: null
          }
        });

        await tx.ticketStatusHistory.create({
          data: {
            ticketId: serviceReport.ticketId,
            fromStatus: serviceReport.ticket.status,
            toStatus: TicketStatus.PENDING_ACKNOWLEDGEMENT,
            changedByUserId: submittedByUserId,
            comment: "Service report direct acknowledgement link generated."
          }
        });
      }

      return acknowledgement;
    });

    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:13000";
    const acknowledgementUrl = `${webAppUrl.replace(/\/$/, "")}/acknowledgement/${rawToken}`;

    await this.auditService.write({
      actorUserId,
      action: serviceReport.acknowledgement ? "REGENERATE_SERVICE_REPORT_ACKNOWLEDGEMENT_LINK" : "CREATE_SERVICE_REPORT_ACKNOWLEDGEMENT_LINK",
      entityType: "ServiceReport",
      entityId: serviceReportId,
      beforeData: {
        ticketId: serviceReport.ticketId,
        ticketStatus: serviceReport.ticket.status,
        acknowledgementId: serviceReport.acknowledgement?.id
      },
      afterData: {
        ticketId: serviceReport.ticketId,
        ticketStatus: TicketStatus.PENDING_ACKNOWLEDGEMENT,
        acknowledgementId: result.id,
        tokenExpiresAt
      }
    });

    return {
      data: {
        ticketId: serviceReport.ticketId,
        serviceReportId,
        acknowledgementId: result.id,
        status: TicketStatus.PENDING_ACKNOWLEDGEMENT,
        tokenExpiresAt,
        acknowledgementUrl
      }
    };
  }

  async getPublicAcknowledgement(token: string) {
    const acknowledgement = await this.getValidAcknowledgement(token);

    return {
      data: {
        id: acknowledgement.id,
        tokenExpiresAt: acknowledgement.tokenExpiresAt,
        response: acknowledgement.response,
        acknowledgedAt: acknowledgement.acknowledgedAt,
        requesterPhone: acknowledgement.requesterPhone,
        requesterEmail: acknowledgement.requesterEmail,
        serviceReport: acknowledgement.serviceReport,
        ticket: acknowledgement.ticket
      }
    };
  }

  async accept(token: string, dto: AcceptAcknowledgementDto) {
    const acknowledgement = await this.getValidAcknowledgement(token);

    if (acknowledgement.ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
      throw new BadRequestException("Ticket is not pending acknowledgement.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const requesterPhone = this.requiredString(dto.requesterPhone, "Contact number is required.");
    const requesterEmail = this.cleanOptionalString(dto.requesterEmail);
    const signatureDataUrl = this.cleanOptionalString(dto.signatureDataUrl);
    const providedSignatureAttachmentId = this.cleanOptionalString(dto.signatureAttachmentId);

    if (!signatureDataUrl && !providedSignatureAttachmentId) {
      throw new BadRequestException("Signature is required.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let signatureAttachmentId = providedSignatureAttachmentId;

      if (signatureAttachmentId) {
        await this.ensureAttachmentExists(signatureAttachmentId);
      }

      if (!signatureAttachmentId && signatureDataUrl) {
        const attachment = await this.attachmentsService.saveAcknowledgementSignature(
          acknowledgement.id,
          signatureDataUrl,
          requesterName,
          tx
        );
        signatureAttachmentId = attachment.id;
      }

      const updatedAcknowledgement = await tx.acknowledgement.update({
        where: { id: acknowledgement.id },
        data: {
          response: AcknowledgementResponse.ACCEPTED,
          requesterName,
          requesterPhone,
          requesterEmail,
          requesterComment: this.cleanOptionalString(dto.comment),
          signatureAttachmentId,
          acknowledgedAt: new Date()
        }
      });

      const nextStatus = acknowledgement.serviceReport?.resolutionStatus === ServiceResolutionStatus.RESOLVED
        ? TicketStatus.CLOSED
        : TicketStatus.FOLLOW_UP_REQUIRED;

      await tx.ticket.update({
        where: { id: acknowledgement.ticketId },
        data: {
          status: nextStatus,
          closedAt: nextStatus === TicketStatus.CLOSED ? new Date() : null
        }
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: acknowledgement.ticketId,
          fromStatus: acknowledgement.ticket.status,
          toStatus: nextStatus,
          changedByRequesterName: requesterName,
          comment: nextStatus === TicketStatus.CLOSED
            ? "Requester accepted resolved service report and signed acknowledgement."
            : "Requester acknowledged service report; follow-up action is required."
        }
      });

      return updatedAcknowledgement;
    });

    return { data: result };
  }

  async requestFollowUp(token: string, dto: FollowUpAcknowledgementDto) {
    const acknowledgement = await this.getValidAcknowledgement(token);

    if (acknowledgement.ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
      throw new BadRequestException("Ticket is not pending acknowledgement.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const requesterPhone = this.requiredString(dto.requesterPhone, "Contact number is required.");
    const requesterEmail = this.cleanOptionalString(dto.requesterEmail);
    const comment = this.requiredString(dto.comment, "Follow-up comment is required.");

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAcknowledgement = await tx.acknowledgement.update({
        where: { id: acknowledgement.id },
        data: {
          response: AcknowledgementResponse.FOLLOW_UP_REQUESTED,
          requesterName,
          requesterPhone,
          requesterEmail,
          requesterComment: comment,
          acknowledgedAt: new Date()
        }
      });

      await tx.ticket.update({
        where: { id: acknowledgement.ticketId },
        data: { status: TicketStatus.FOLLOW_UP_REQUIRED }
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: acknowledgement.ticketId,
          fromStatus: TicketStatus.PENDING_ACKNOWLEDGEMENT,
          toStatus: TicketStatus.FOLLOW_UP_REQUIRED,
          changedByRequesterName: requesterName,
          comment
        }
      });

      return updatedAcknowledgement;
    });

    return { data: result };
  }

  private async getValidAcknowledgement(token: string) {
    const tokenHash = this.hashToken(token);
    const acknowledgement = await this.prisma.acknowledgement.findFirst({
      where: { acknowledgementTokenHash: tokenHash },
      include: {
        ticket: {
          include: {
            machine: {
              include: {
                customer: true
              }
            },
            serviceReports: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                technician: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                attachments: true
              }
            },
            attachments: true
          }
        },
        serviceReport: {
          include: {
            technician: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            attachments: true
          }
        }
      }
    });

    if (!acknowledgement) {
      throw new NotFoundException("Acknowledgement not found.");
    }

    if (acknowledgement.tokenExpiresAt < new Date()) {
      throw new BadRequestException("Acknowledgement link has expired.");
    }

    return acknowledgement;
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

  private async ensureAttachmentExists(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!attachment) {
      throw new NotFoundException("Signature attachment not found.");
    }
  }

  private hashToken(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private parseDate(value: string, fieldName: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }
    return date;
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
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
}
