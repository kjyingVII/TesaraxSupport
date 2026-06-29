import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import {
  AcknowledgementResponse,
  AttachmentRelatedType,
  Prisma,
  ServiceResolutionStatus,
  TaskStatus,
  TicketCommentVisibility,
  TicketPriority,
  TicketStatus
} from "@prisma/client";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { ReadStream } from "fs";
import { AcceptAcknowledgementDto } from "../acknowledgements/dto/accept-acknowledgement.dto";
import { FollowUpAcknowledgementDto } from "../acknowledgements/dto/follow-up-acknowledgement.dto";
import { AuditService } from "../audit/audit.service";
import { AttachmentsService } from "../attachments/attachments.service";
import { AuthService } from "../auth/auth.service";
import { parseOptionalEmail } from "../common/email";
import { parseOptionalPhoneNumber, parseRequiredPhoneNumber } from "../common/phone-number";
import { CreateMachineLogDto } from "../machine-logs/dto/create-machine-log.dto";
import { MachineLogsService } from "../machine-logs/machine-logs.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { CreatePublicTicketCommentDto } from "./dto/create-public-ticket-comment.dto";
import { CreatePublicTicketDto } from "./dto/create-public-ticket.dto";
import { RequestMachineAccessDto } from "./dto/request-machine-access.dto";

type MachineAccessPayload = {
  typ: "machine_access";
  machineId: string;
  publicId: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail?: string;
  exp: number;
};

type PublicRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class PublicRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly attachmentsService: AttachmentsService,
    private readonly authService: AuthService,
    private readonly machineLogsService: MachineLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService
  ) {}

  async getMachineAccessBranding(publicId: string) {
    const machine = await this.prisma.machine.findUnique({
      where: { publicId },
      select: {
        publicId: true,
        supportCompanyName: true,
        isActive: true,
        supportCompanyLogoAttachment: {
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            createdAt: true
          }
        },
        customer: {
          select: {
            isActive: true
          }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    return {
      data: {
        publicId: machine.publicId,
        isActive: machine.isActive && machine.customer.isActive,
        supportCompanyName: machine.supportCompanyName,
        supportCompanyLogoAttachment: machine.supportCompanyLogoAttachment
      }
    };
  }

  async getRequestMachine(publicId: string, authorization?: string) {
    await this.verifyMachineAccess(publicId, authorization);
    const machine = await this.prisma.machine.findUnique({
      where: { publicId },
      select: {
        publicId: true,
        machineName: true,
        model: true,
        serialNumber: true,
        location: true,
        isActive: true,
        customer: {
          select: {
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    const settings = await this.settingsService.getCurrentSettings();

    return {
      data: {
        publicId: machine.publicId,
        machineName: machine.machineName,
        model: machine.model,
        serialNumber: machine.serialNumber,
        location: machine.location,
        customerName: machine.customer.name,
        isActive: machine.isActive && machine.customer.isActive,
        requestAttachmentMaxFileMb: settings.requestAttachmentMaxFileMb,
        requestAttachmentMaxTotalMb: settings.requestAttachmentMaxTotalMb
      }
    };
  }

  async requestMachineAccess(publicId: string, dto: RequestMachineAccessDto, context: PublicRequestContext = {}) {
    const machine = await this.prisma.machine.findUnique({
      where: { publicId },
      select: {
        id: true,
        publicId: true,
        machineName: true,
        model: true,
        serialNumber: true,
        location: true,
        supportCompanyName: true,
        supportCompanyLogoAttachment: {
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            createdAt: true
          }
        },
        machineAccessPasswordHash: true,
        isActive: true,
        customer: {
          select: {
            name: true,
            isActive: true
          }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    if (!machine.isActive || !machine.customer.isActive) {
      throw new BadRequestException("Machine is not active for support requests.");
    }

    if (!machine.machineAccessPasswordHash) {
      throw new BadRequestException("Machine access password has not been set. Please contact the service administrator.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const requesterPhone = parseRequiredPhoneNumber(dto.requesterPhone, "Requester phone");
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Requester email");
    const password = this.requiredString(dto.password, "Machine password is required.");

    if (!this.authService.verifyUserPassword(password, machine.machineAccessPasswordHash)) {
      throw new UnauthorizedException("Invalid machine password.");
    }

    const token = this.signMachineAccessToken({
      typ: "machine_access",
      machineId: machine.id,
      publicId: machine.publicId,
      requesterName,
      requesterPhone,
      requesterEmail,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4
    });

    await this.auditService.write({
      actorRequesterName: requesterName,
      action: "PUBLIC_MACHINE_ACCESS_GRANTED",
      entityType: "Machine",
      entityId: machine.id,
      afterData: {
        publicId: machine.publicId,
        requesterName,
        requesterPhone,
        requesterEmail,
        otpRequired: false
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      data: {
        accessToken: token,
        expiresInSeconds: 60 * 60 * 4,
        otpRequired: false,
        otpPlannedChannels: ["WHATSAPP", "SMS"],
        requester: {
          name: requesterName,
          phone: requesterPhone,
          email: requesterEmail ?? null
        },
        machine: this.publicMachineSummary(machine)
      }
    };
  }

  async getMachinePortal(publicId: string, authorization?: string, context: PublicRequestContext = {}) {
    const access = await this.verifyMachineAccess(publicId, authorization);

    const machine = await this.prisma.machine.findUnique({
      where: { publicId },
      select: {
        id: true,
        publicId: true,
        machineName: true,
        model: true,
        serialNumber: true,
        location: true,
        supportCompanyName: true,
        supportCompanyLogoAttachment: {
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            createdAt: true
          }
        },
        isActive: true,
        serviceReminderIntervalDays: true,
        lastServiceAt: true,
        nextServiceDueAt: true,
        customer: {
          select: {
            name: true,
            isActive: true
          }
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            issueTitle: true,
            issueCategory: true,
            priority: true,
            status: true,
            requesterName: true,
            createdAt: true,
            updatedAt: true,
            closedAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 25
        },
        logs: {
          select: {
            id: true,
            activityType: true,
            workDate: true,
            workEndAt: true,
            title: true,
            workSummary: true,
            partsUsed: true,
            upgradeVersion: true,
            upgradeDescription: true,
            requesterConfirmedName: true,
            requesterAcknowledgementRequired: true,
            createdAt: true
          },
          orderBy: { workDate: "desc" },
          take: 25
        },
        tasks: {
          where: {
            status: {
              in: [TaskStatus.PENDING, TaskStatus.SCHEDULED, TaskStatus.IN_PROGRESS, TaskStatus.WAITING_COMPONENT, TaskStatus.WAITING_CUSTOMER]
            }
          },
          select: {
            id: true,
            title: true,
            taskType: true,
            scheduledStartAt: true,
            scheduledEndAt: true,
            status: true,
            priority: true,
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                issueTitle: true
              }
            },
            assignments: {
              select: {
                technician: {
                  select: {
                    name: true
                  }
                }
              },
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: { scheduledStartAt: "asc" },
          take: 10
        },
        documents: {
          where: {
            relatedType: AttachmentRelatedType.MACHINE_DOCUMENT
          },
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    const closedStatuses = new Set<TicketStatus>([TicketStatus.RESOLVED, TicketStatus.CLOSED]);

    await this.auditService.write({
      actorRequesterName: access.requesterName,
      action: "PUBLIC_MACHINE_PORTAL_VIEWED",
      entityType: "Machine",
      entityId: machine.id,
      afterData: {
        publicId: machine.publicId,
        requesterName: access.requesterName,
        requesterPhone: access.requesterPhone,
        requesterEmail: access.requesterEmail,
        activeTicketCount: machine.tickets.filter((ticket) => !closedStatuses.has(ticket.status)).length,
        closedTicketCount: machine.tickets.filter((ticket) => closedStatuses.has(ticket.status)).length
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    const settings = await this.settingsService.getCurrentSettings();

    return {
      data: {
        machine: {
          ...this.publicMachineSummary(machine),
          serviceReminderIntervalDays: machine.serviceReminderIntervalDays,
          lastServiceAt: machine.lastServiceAt,
          nextServiceDueAt: machine.nextServiceDueAt,
          isActive: machine.isActive && machine.customer.isActive
        },
        tickets: {
          active: machine.tickets.filter((ticket) => !closedStatuses.has(ticket.status)),
          closed: machine.tickets.filter((ticket) => closedStatuses.has(ticket.status))
        },
        logs: machine.logs,
        tasks: machine.tasks,
        documents: machine.documents,
        requestAttachmentMaxFileMb: settings.requestAttachmentMaxFileMb,
        requestAttachmentMaxTotalMb: settings.requestAttachmentMaxTotalMb
      }
    };
  }

  async createMachineLog(
    publicId: string,
    dto: CreateMachineLogDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);

    const log = await this.machineLogsService.createLog(access.machineId, {
      activityType: dto.activityType,
      workDate: dto.workDate,
      workEndAt: dto.workEndAt,
      title: dto.title,
      workSummary: dto.workSummary,
      partsUsed: dto.partsUsed,
      upgradeVersion: dto.upgradeVersion,
      upgradeDescription: dto.upgradeDescription,
      nextServiceDueOverrideAt: dto.nextServiceDueOverrideAt,
      requesterConfirmedName: this.cleanOptionalString(dto.requesterConfirmedName) ?? access.requesterName,
      requesterContactPhone: parseOptionalPhoneNumber(dto.requesterContactPhone, "Contact number") ?? access.requesterPhone,
      requesterContactEmail: parseOptionalEmail(dto.requesterContactEmail, "Contact email") ?? access.requesterEmail,
      requesterAcknowledgementRequired: false,
      requesterConfirmedAt: dto.requesterConfirmedAt,
      loggedByRequesterName: this.cleanOptionalString(dto.loggedByRequesterName) ?? access.requesterName,
      attachments: dto.attachments
    });

    await this.auditService.write({
      actorRequesterName: access.requesterName,
      action: "PUBLIC_MACHINE_LOG_CREATED",
      entityType: "MachineLog",
      entityId: log.data.id,
      afterData: {
        publicId,
        machineId: access.machineId,
        activityType: log.data.activityType,
        requesterName: access.requesterName,
        requesterPhone: access.requesterPhone,
        requesterEmail: access.requesterEmail
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return log;
  }

  async getMachineLog(publicId: string, logId: string, authorization?: string, context: PublicRequestContext = {}) {
    const access = await this.verifyMachineAccess(publicId, authorization);

    const log = await this.prisma.machineLog.findFirst({
      where: {
        id: logId,
        machineId: access.machineId,
        machine: {
          publicId
        }
      },
      select: {
        id: true,
        activityType: true,
        workDate: true,
        workEndAt: true,
        title: true,
        workSummary: true,
        partsUsed: true,
        upgradeVersion: true,
        upgradeDescription: true,
        nextServiceDueOverrideAt: true,
        requesterConfirmedName: true,
        requesterContactPhone: true,
        requesterContactEmail: true,
        requesterAcknowledgementRequired: true,
        requesterConfirmedAt: true,
        loggedByRequesterName: true,
        createdAt: true,
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            issueTitle: true,
            status: true
          }
        },
        serviceReport: {
          select: {
            id: true,
            diagnosis: true,
            actionTaken: true,
            resolutionStatus: true
          }
        },
        attachments: {
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            uploadedByRequesterName: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" }
        },
        acknowledgement: {
          select: {
            id: true,
            response: true,
            requesterName: true,
            requesterPhone: true,
            requesterEmail: true,
            requesterComment: true,
            acknowledgedAt: true,
            tokenExpiresAt: true,
            signatureAttachment: {
              select: {
                id: true,
                originalFileName: true,
                contentType: true,
                fileSizeBytes: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!log) {
      throw new NotFoundException("Machine log not found.");
    }

    await this.auditService.write({
      actorRequesterName: access.requesterName,
      action: "PUBLIC_MACHINE_LOG_VIEWED",
      entityType: "MachineLog",
      entityId: log.id,
      afterData: {
        publicId,
        machineId: access.machineId,
        activityType: log.activityType,
        requesterName: access.requesterName,
        requesterPhone: access.requesterPhone,
        requesterEmail: access.requesterEmail
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { data: log };
  }

  async acceptMachineLogAcknowledgement(
    publicId: string,
    logId: string,
    dto: AcceptAcknowledgementDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const log = await this.prisma.machineLog.findFirst({
      where: {
        id: logId,
        machineId: access.machineId,
        machine: {
          publicId
        }
      },
      include: {
        acknowledgement: true
      }
    });

    if (!log) {
      throw new NotFoundException("Machine log not found.");
    }

    if (log.acknowledgement?.response) {
      throw new BadRequestException("Machine log acknowledgement has already been submitted.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const requesterPhone = parseRequiredPhoneNumber(dto.requesterPhone, "Contact number");
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Email");
    const signatureDataUrl = this.cleanOptionalString(dto.signatureDataUrl);

    if (!signatureDataUrl) {
      throw new BadRequestException("Signature is required.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const acknowledgement = log.acknowledgement ?? await tx.acknowledgement.create({
        data: {
          machineLogId: log.id,
          acknowledgementTokenHash: this.hashAcknowledgementToken(randomBytes(32).toString("base64url")),
          tokenExpiresAt: this.addDays(new Date(), 14)
        }
      });

      const signatureAttachment = await this.attachmentsService.saveAcknowledgementSignature(
        acknowledgement.id,
        signatureDataUrl,
        requesterName,
        tx
      );

      return tx.acknowledgement.update({
        where: { id: acknowledgement.id },
        data: {
          response: AcknowledgementResponse.ACCEPTED,
          requesterName,
          requesterPhone,
          requesterEmail,
          requesterComment: this.cleanOptionalString(dto.comment),
          signatureAttachmentId: signatureAttachment.id,
          acknowledgedAt: new Date()
        },
        include: {
          signatureAttachment: {
            select: {
              id: true,
              originalFileName: true,
              contentType: true,
              fileSizeBytes: true,
              createdAt: true
            }
          }
        }
      });
    });

    await this.auditService.write({
      actorRequesterName: requesterName,
      action: "PUBLIC_MACHINE_LOG_ACKNOWLEDGEMENT_ACCEPTED",
      entityType: "MachineLog",
      entityId: log.id,
      afterData: {
        publicId,
        machineId: access.machineId,
        activityType: log.activityType,
        acknowledgementId: result.id,
        requesterName,
        requesterPhone,
        requesterEmail
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { data: result };
  }

  async createTicket(publicId: string, dto: CreatePublicTicketDto, authorization?: string) {
    await this.verifyMachineAccess(publicId, authorization);
    const machine = await this.prisma.machine.findUnique({
      where: { publicId },
      select: {
        id: true,
        isActive: true,
        customer: {
          select: {
            isActive: true
          }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    if (!machine.isActive || !machine.customer.isActive) {
      throw new BadRequestException("Machine is not active for support requests.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const issueTitle = this.requiredString(dto.issueTitle, "Issue title is required.");
    const issueDescription = this.requiredString(dto.issueDescription, "Issue description is required.");
    const issueCategory = this.requiredString(dto.issueCategory, "Issue category is required.");
    const priority = this.parsePriority(dto.priority);
    const requesterPhone = parseOptionalPhoneNumber(dto.requesterPhone, "Requester phone");
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Requester email");

    if (!requesterPhone && !requesterEmail) {
      throw new BadRequestException("Requester phone or email is required.");
    }

    const preparedAttachments = await this.attachmentsService.prepareTicketAttachments(dto.attachments);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const ticketNumber = await this.generateTicketNumber(tx);

      const created = await tx.ticket.create({
        data: {
          ticketNumber,
          machineId: machine.id,
          requesterName,
          requesterCompany: this.cleanOptionalString(dto.requesterCompany),
          requesterDepartment: this.cleanOptionalString(dto.requesterDepartment),
          requesterPhone,
          requesterEmail,
          issueTitle,
          issueDescription,
          issueCategory,
          priority,
          status: TicketStatus.NEW,
          createdFromPublicQr: true
        }
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: created.id,
          fromStatus: null,
          toStatus: TicketStatus.NEW,
          changedByRequesterName: requesterName,
          comment: "Ticket created from public QR request."
        }
      });

      return created;
    });

    await this.attachmentsService.saveTicketAttachments(ticket.id, preparedAttachments, {
      uploadedByRequesterName: requesterName
    });

    await this.notificationsService.logTicketCreated(ticket.id);

    return {
      data: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        attachmentCount: preparedAttachments.length
      }
    };
  }

  async getMachineTicket(publicId: string, ticketId: string, authorization?: string, context: PublicRequestContext = {}) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        machineId: true,
        requesterName: true,
        requesterCompany: true,
        requesterDepartment: true,
        requesterPhone: true,
        requesterEmail: true,
        issueTitle: true,
        issueDescription: true,
        issueCategory: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        assignedTechnician: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignments: {
          where: {
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
        },
        machine: {
          select: {
            id: true,
            publicId: true,
        machineName: true,
        model: true,
        serialNumber: true,
        location: true,
        supportCompanyName: true,
        supportCompanyLogoAttachment: {
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            createdAt: true
          }
        },
        customer: {
          select: {
                name: true
              }
            }
          }
        },
        comments: {
          where: {
            visibility: TicketCommentVisibility.REQUESTER_VISIBLE
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
              select: {
                id: true,
                originalFileName: true,
                contentType: true,
                fileSizeBytes: true,
                uploadedByRequesterName: true,
                createdAt: true,
                relatedType: true
              },
              orderBy: { createdAt: "desc" }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            changedByRequesterName: true,
            comment: true,
            createdAt: true,
            changedByUser: {
              select: {
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        },
        attachments: {
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            uploadedByRequesterName: true,
            createdAt: true,
            relatedType: true
          },
          orderBy: { createdAt: "desc" }
        },
        acknowledgements: {
          select: {
            id: true,
            serviceReportId: true,
            response: true,
            requesterName: true,
            requesterPhone: true,
            requesterEmail: true,
            requesterComment: true,
            acknowledgedAt: true,
            tokenExpiresAt: true,
            signatureAttachment: {
              select: {
                id: true,
                originalFileName: true,
                contentType: true,
                fileSizeBytes: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        serviceReports: {
          select: {
            id: true,
            diagnosis: true,
            actionTaken: true,
            partsUsed: true,
            recommendations: true,
            technicianRemarks: true,
            resolutionStatus: true,
            serviceStartAt: true,
            serviceEndAt: true,
            createdAt: true,
            acknowledgement: {
              select: {
                id: true,
                serviceReportId: true,
                response: true,
                requesterName: true,
                requesterPhone: true,
                requesterEmail: true,
                requesterComment: true,
                acknowledgedAt: true,
                tokenExpiresAt: true,
                signatureAttachment: {
                  select: {
                    id: true,
                    originalFileName: true,
                    contentType: true,
                    fileSizeBytes: true,
                    createdAt: true
                  }
                }
              }
            },
            technician: {
              select: {
                name: true,
                email: true
              }
            },
            attachments: {
              select: {
                id: true,
                originalFileName: true,
                contentType: true,
                fileSizeBytes: true,
                createdAt: true,
                relatedType: true
              },
              orderBy: { createdAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    if (ticket.machine.publicId !== publicId || ticket.machineId !== access.machineId) {
      throw new UnauthorizedException("Ticket does not belong to this machine access session.");
    }

    await this.auditService.write({
      actorRequesterName: access.requesterName,
      action: "PUBLIC_TICKET_VIEWED",
      entityType: "Ticket",
      entityId: ticket.id,
      afterData: {
        publicId,
        ticketNumber: ticket.ticketNumber,
        requesterName: access.requesterName,
        requesterPhone: access.requesterPhone,
        requesterEmail: access.requesterEmail
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    const settings = await this.settingsService.getCurrentSettings();
    const { acknowledgements, ...ticketData } = ticket;

    return {
      data: {
        ...ticketData,
        acknowledgement: acknowledgements[0] ?? null,
        machine: this.publicMachineSummary(ticket.machine),
        requestAttachmentMaxFileMb: settings.requestAttachmentMaxFileMb,
        requestAttachmentMaxTotalMb: settings.requestAttachmentMaxTotalMb
      }
    };
  }

  async acceptMachineTicketAcknowledgement(
    publicId: string,
    ticketId: string,
    dto: AcceptAcknowledgementDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const acknowledgement = await this.getMachineTicketAcknowledgement(publicId, ticketId, access.machineId);

    return this.acceptMachineAcknowledgement(publicId, ticketId, acknowledgement, dto, context);
  }

  async acceptMachineServiceReportAcknowledgement(
    publicId: string,
    ticketId: string,
    serviceReportId: string,
    dto: AcceptAcknowledgementDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const acknowledgement = await this.getMachineServiceReportAcknowledgement(publicId, ticketId, serviceReportId, access.machineId);

    return this.acceptMachineAcknowledgement(publicId, ticketId, acknowledgement, dto, context);
  }

  private async acceptMachineAcknowledgement(
    publicId: string,
    ticketId: string,
    acknowledgement: Awaited<ReturnType<PublicRequestsService["getMachineTicketAcknowledgement"]>>,
    dto: AcceptAcknowledgementDto,
    context: PublicRequestContext
  ) {
    if (!acknowledgement.ticket) {
      throw new NotFoundException("Ticket acknowledgement not found.");
    }

    const ticket = acknowledgement.ticket;

    if (ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
      throw new BadRequestException("Ticket is not pending acknowledgement.");
    }

    if (acknowledgement.response) {
      throw new BadRequestException("Service report acknowledgement has already been submitted.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const requesterPhone = parseRequiredPhoneNumber(dto.requesterPhone, "Contact number");
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Email");
    const signatureDataUrl = this.cleanOptionalString(dto.signatureDataUrl);

    if (!signatureDataUrl) {
      throw new BadRequestException("Signature is required.");
    }

    const nextStatus = acknowledgement.serviceReport?.resolutionStatus === ServiceResolutionStatus.RESOLVED
      ? TicketStatus.CLOSED
      : TicketStatus.FOLLOW_UP_REQUIRED;

    const result = await this.prisma.$transaction(async (tx) => {
      const signatureAttachment = await this.attachmentsService.saveAcknowledgementSignature(
        acknowledgement.id,
        signatureDataUrl,
        requesterName,
        tx
      );

      const updatedAcknowledgement = await tx.acknowledgement.update({
        where: { id: acknowledgement.id },
        data: {
          response: AcknowledgementResponse.ACCEPTED,
          requesterName,
          requesterPhone,
          requesterEmail,
          requesterComment: this.cleanOptionalString(dto.comment),
          signatureAttachmentId: signatureAttachment.id,
          acknowledgedAt: new Date()
        }
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: nextStatus,
          closedAt: nextStatus === TicketStatus.CLOSED ? new Date() : null
        }
      });

      await tx.ticketStatusHistory.create({
          data: {
            ticketId,
            fromStatus: ticket.status,
            toStatus: nextStatus,
            changedByRequesterName: requesterName,
          comment: nextStatus === TicketStatus.CLOSED
            ? "Requester accepted resolved service report and signed acknowledgement from machine ticket page."
            : "Requester acknowledged service report; follow-up action is required."
        }
      });

      return updatedAcknowledgement;
    });

    await this.auditService.write({
      actorRequesterName: requesterName,
      action: "PUBLIC_TICKET_ACKNOWLEDGEMENT_ACCEPTED",
      entityType: "Ticket",
      entityId: ticketId,
      afterData: {
        publicId,
        ticketNumber: ticket.ticketNumber,
        acknowledgementId: acknowledgement.id,
        serviceReportId: acknowledgement.serviceReportId,
        resolutionStatus: acknowledgement.serviceReport?.resolutionStatus,
        ticketStatus: nextStatus,
        requesterName,
        requesterPhone,
        requesterEmail
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { data: result };
  }

  async requestMachineTicketAcknowledgementFollowUp(
    publicId: string,
    ticketId: string,
    dto: FollowUpAcknowledgementDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const acknowledgement = await this.getMachineTicketAcknowledgement(publicId, ticketId, access.machineId);

    return this.requestMachineAcknowledgementFollowUp(publicId, ticketId, acknowledgement, dto, context);
  }

  async requestMachineServiceReportAcknowledgementFollowUp(
    publicId: string,
    ticketId: string,
    serviceReportId: string,
    dto: FollowUpAcknowledgementDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const acknowledgement = await this.getMachineServiceReportAcknowledgement(publicId, ticketId, serviceReportId, access.machineId);

    return this.requestMachineAcknowledgementFollowUp(publicId, ticketId, acknowledgement, dto, context);
  }

  private async requestMachineAcknowledgementFollowUp(
    publicId: string,
    ticketId: string,
    acknowledgement: Awaited<ReturnType<PublicRequestsService["getMachineTicketAcknowledgement"]>>,
    dto: FollowUpAcknowledgementDto,
    context: PublicRequestContext
  ) {
    if (!acknowledgement.ticket) {
      throw new NotFoundException("Ticket acknowledgement not found.");
    }

    const ticket = acknowledgement.ticket;

    if (ticket.status !== TicketStatus.PENDING_ACKNOWLEDGEMENT) {
      throw new BadRequestException("Ticket is not pending acknowledgement.");
    }

    if (acknowledgement.response) {
      throw new BadRequestException("Service report acknowledgement has already been submitted.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const requesterPhone = parseRequiredPhoneNumber(dto.requesterPhone, "Contact number");
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Email");
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
        where: { id: ticketId },
        data: { status: TicketStatus.FOLLOW_UP_REQUIRED }
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId,
          fromStatus: ticket.status,
          toStatus: TicketStatus.FOLLOW_UP_REQUIRED,
          changedByRequesterName: requesterName,
          comment
        }
      });

      return updatedAcknowledgement;
    });

    await this.auditService.write({
      actorRequesterName: requesterName,
      action: "PUBLIC_TICKET_ACKNOWLEDGEMENT_FOLLOW_UP_REQUESTED",
      entityType: "Ticket",
      entityId: ticketId,
      afterData: {
        publicId,
        ticketNumber: ticket.ticketNumber,
        acknowledgementId: acknowledgement.id,
        serviceReportId: acknowledgement.serviceReportId,
        resolutionStatus: acknowledgement.serviceReport?.resolutionStatus,
        requesterName,
        requesterPhone,
        requesterEmail
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return { data: result };
  }

  async createMachineTicketComment(
    publicId: string,
    ticketId: string,
    dto: CreatePublicTicketCommentDto,
    authorization?: string,
    context: PublicRequestContext = {}
  ) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        machineId: true,
        machine: {
          select: {
            publicId: true
          }
        }
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    if (ticket.machine.publicId !== publicId || ticket.machineId !== access.machineId) {
      throw new UnauthorizedException("Ticket does not belong to this machine access session.");
    }

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const commentText = this.requiredString(dto.comment, "Comment is required.");
    const requesterPhone = parseOptionalPhoneNumber(dto.requesterPhone, "Contact number") ?? access.requesterPhone;
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Email") ?? access.requesterEmail;
    const preparedAttachments = await this.attachmentsService.prepareTicketAttachments(dto.attachments);

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        comment: commentText,
        visibility: TicketCommentVisibility.REQUESTER_VISIBLE,
        createdByRequesterName: requesterName
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
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            uploadedByRequesterName: true,
            createdAt: true,
            relatedType: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    const attachments = await this.attachmentsService.saveTicketCommentAttachments(comment.id, preparedAttachments, {
      uploadedByRequesterName: requesterName
    });

    await this.auditService.write({
      actorRequesterName: requesterName,
      action: "PUBLIC_TICKET_COMMENT_CREATED",
      entityType: "Ticket",
      entityId: ticket.id,
      afterData: {
        publicId,
        ticketNumber: ticket.ticketNumber,
        requesterName,
        requesterPhone,
        requesterEmail,
        attachmentCount: attachments.length
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      data: {
        ...comment,
        attachments
      }
    };
  }

  async getMachineTicketAttachmentDownload(publicId: string, ticketId: string, attachmentId: string, authorization?: string) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        ticketId: true,
        serviceReportId: true,
        acknowledgementId: true,
        originalFileName: true,
        contentType: true,
        fileSizeBytes: true,
        signatureFor: {
          select: {
            ticketId: true,
            ticket: {
              select: {
                machineId: true,
                machine: {
                  select: {
                    publicId: true
                  }
                }
              }
            }
          }
        },
        serviceReport: {
          select: {
            ticketId: true,
            ticket: {
              select: {
                machineId: true,
                machine: {
                  select: {
                    publicId: true
                  }
                }
              }
            }
          }
        },
        ticket: {
          select: {
            id: true,
            machineId: true,
            machine: {
              select: {
                publicId: true
              }
            }
          }
        },
        ticketComment: {
          select: {
            ticketId: true,
            ticket: {
              select: {
                machineId: true,
                machine: {
                  select: {
                    publicId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    const owningTicketId = attachment.ticketId ?? attachment.serviceReport?.ticketId ?? attachment.ticketComment?.ticketId ?? attachment.signatureFor?.ticketId;
    const owningMachineId =
      attachment.ticket?.machineId ??
      attachment.serviceReport?.ticket.machineId ??
      attachment.ticketComment?.ticket.machineId ??
      attachment.signatureFor?.ticket?.machineId;
    const owningPublicId =
      attachment.ticket?.machine.publicId ??
      attachment.serviceReport?.ticket.machine.publicId ??
      attachment.ticketComment?.ticket.machine.publicId ??
      attachment.signatureFor?.ticket?.machine.publicId;

    if (owningTicketId !== ticketId || owningMachineId !== access.machineId || owningPublicId !== publicId) {
      throw new UnauthorizedException("Attachment does not belong to this machine ticket.");
    }

    return this.attachmentsService.getDownload(attachmentId) as Promise<{
      attachment: {
        contentType: string;
        fileSizeBytes: number;
        originalFileName: string;
      };
      stream: ReadStream;
    }>;
  }

  async getMachineDocumentDownload(publicId: string, attachmentId: string, authorization?: string) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        relatedType: true,
        machineId: true,
        originalFileName: true,
        contentType: true,
        fileSizeBytes: true,
        machine: {
          select: {
            publicId: true
          }
        }
      }
    });

    if (!attachment || attachment.relatedType !== AttachmentRelatedType.MACHINE_DOCUMENT) {
      throw new NotFoundException("Machine document not found.");
    }

    if (attachment.machineId !== access.machineId || attachment.machine?.publicId !== publicId) {
      throw new UnauthorizedException("Document does not belong to this machine access session.");
    }

    return this.attachmentsService.getDownload(attachmentId) as Promise<{
      attachment: {
        contentType: string;
        fileSizeBytes: number;
        originalFileName: string;
      };
      stream: ReadStream;
    }>;
  }

  async getMachineSupportCompanyLogoDownload(publicId: string, attachmentId: string, authorization?: string) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        relatedType: true,
        machineId: true,
        originalFileName: true,
        contentType: true,
        fileSizeBytes: true,
        machine: {
          select: {
            publicId: true,
            supportCompanyLogoAttachmentId: true
          }
        }
      }
    });

    if (!attachment || attachment.relatedType !== AttachmentRelatedType.MACHINE_SUPPORT_LOGO) {
      throw new NotFoundException("Support company logo not found.");
    }

    if (
      attachment.machineId !== access.machineId
      || attachment.machine?.publicId !== publicId
      || attachment.machine.supportCompanyLogoAttachmentId !== attachment.id
    ) {
      throw new UnauthorizedException("Logo does not belong to this machine access session.");
    }

    return this.attachmentsService.getDownload(attachmentId) as Promise<{
      attachment: {
        contentType: string;
        fileSizeBytes: number;
        originalFileName: string;
      };
      stream: ReadStream;
    }>;
  }

  async getPublicMachineSupportCompanyLogoDownload(publicId: string, attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        relatedType: true,
        machineId: true,
        originalFileName: true,
        contentType: true,
        fileSizeBytes: true,
        machine: {
          select: {
            publicId: true,
            isActive: true,
            supportCompanyLogoAttachmentId: true,
            customer: {
              select: {
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!attachment || attachment.relatedType !== AttachmentRelatedType.MACHINE_SUPPORT_LOGO) {
      throw new NotFoundException("Support company logo not found.");
    }

    if (
      attachment.machine?.publicId !== publicId
      || attachment.machine.supportCompanyLogoAttachmentId !== attachment.id
      || !attachment.machine.isActive
      || !attachment.machine.customer.isActive
    ) {
      throw new UnauthorizedException("Logo does not belong to this active machine.");
    }

    return this.attachmentsService.getDownload(attachmentId) as Promise<{
      attachment: {
        contentType: string;
        fileSizeBytes: number;
        originalFileName: string;
      };
      stream: ReadStream;
    }>;
  }

  async getMachineLogAttachmentDownload(publicId: string, logId: string, attachmentId: string, authorization?: string) {
    const access = await this.verifyMachineAccess(publicId, authorization);
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        machineLogId: true,
        acknowledgementId: true,
        originalFileName: true,
        contentType: true,
        fileSizeBytes: true,
        machineLog: {
          select: {
            id: true,
            machineId: true,
            machine: {
              select: {
                publicId: true
              }
            }
          }
        },
        signatureFor: {
          select: {
            machineLogId: true,
            machineLog: {
              select: {
                id: true,
                machineId: true,
                machine: {
                  select: {
                    publicId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    const owningLogId = attachment.machineLogId ?? attachment.signatureFor?.machineLogId;
    const owningMachineId = attachment.machineLog?.machineId ?? attachment.signatureFor?.machineLog?.machineId;
    const owningPublicId = attachment.machineLog?.machine.publicId ?? attachment.signatureFor?.machineLog?.machine.publicId;

    if (owningLogId !== logId || owningMachineId !== access.machineId || owningPublicId !== publicId) {
      throw new UnauthorizedException("Attachment does not belong to this machine log.");
    }

    return this.attachmentsService.getDownload(attachmentId) as Promise<{
      attachment: {
        contentType: string;
        fileSizeBytes: number;
        originalFileName: string;
      };
      stream: ReadStream;
    }>;
  }

  async listTicketComments(ticketId: string, dto: CreatePublicTicketCommentDto) {
    await this.ensureRequesterCanAccessTicket(ticketId, dto);

    const comments = await this.prisma.ticketComment.findMany({
      where: {
        ticketId,
        visibility: TicketCommentVisibility.REQUESTER_VISIBLE
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
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            uploadedByRequesterName: true,
            createdAt: true,
            relatedType: true
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return { data: comments };
  }

  async createTicketComment(ticketId: string, dto: CreatePublicTicketCommentDto) {
    await this.ensureRequesterCanAccessTicket(ticketId, dto);

    const requesterName = this.requiredString(dto.requesterName, "Requester name is required.");
    const commentText = this.requiredString(dto.comment, "Comment is required.");
    const preparedAttachments = await this.attachmentsService.prepareTicketAttachments(dto.attachments);

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        comment: commentText,
        visibility: TicketCommentVisibility.REQUESTER_VISIBLE,
        createdByRequesterName: requesterName
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
          select: {
            id: true,
            originalFileName: true,
            contentType: true,
            fileSizeBytes: true,
            uploadedByRequesterName: true,
            createdAt: true,
            relatedType: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    const attachments = await this.attachmentsService.saveTicketCommentAttachments(comment.id, preparedAttachments, {
      uploadedByRequesterName: requesterName
    });

    return {
      data: {
        ...comment,
        attachments
      }
    };
  }

  private async generateTicketNumber(tx: Prisma.TransactionClient) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `TCK-${year}${month}-`;

    const count = await tx.ticket.count({
      where: {
        ticketNumber: {
          startsWith: prefix
        }
      }
    });

    return `${prefix}${String(count + 1).padStart(4, "0")}`;
  }

  private async ensureRequesterCanAccessTicket(ticketId: string, dto: CreatePublicTicketCommentDto) {
    const requesterPhone = parseOptionalPhoneNumber(dto.requesterPhone, "Requester phone");
    const requesterEmail = parseOptionalEmail(dto.requesterEmail, "Requester email");

    if (!requesterPhone && !requesterEmail) {
      throw new BadRequestException("Requester phone or email is required.");
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        requesterPhone: true,
        requesterEmail: true
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found.");
    }

    const phoneMatches = requesterPhone && ticket.requesterPhone === requesterPhone;
    const emailMatches = requesterEmail && ticket.requesterEmail?.toLowerCase() === requesterEmail;

    if (!phoneMatches && !emailMatches) {
      throw new BadRequestException("Requester contact does not match this ticket.");
    }
  }

  private async getMachineTicketAcknowledgement(publicId: string, ticketId: string, machineId: string) {
    const acknowledgement = await this.prisma.acknowledgement.findFirst({
      where: {
        ticketId,
        response: null
      },
      include: {
        serviceReport: {
          select: {
            id: true,
            resolutionStatus: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            machineId: true,
            machine: {
              select: {
                publicId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!acknowledgement) {
      throw new NotFoundException("Acknowledgement not found.");
    }

    if (!acknowledgement.ticket) {
      throw new NotFoundException("Ticket acknowledgement not found.");
    }

    if (acknowledgement.ticket.machineId !== machineId || acknowledgement.ticket.machine.publicId !== publicId || acknowledgement.ticket.id !== ticketId) {
      throw new UnauthorizedException("Acknowledgement does not belong to this machine ticket.");
    }

    return acknowledgement;
  }

  private async getMachineServiceReportAcknowledgement(publicId: string, ticketId: string, serviceReportId: string, machineId: string) {
    const acknowledgement = await this.prisma.acknowledgement.findUnique({
      where: { serviceReportId },
      include: {
        serviceReport: {
          select: {
            id: true,
            resolutionStatus: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            machineId: true,
            machine: {
              select: {
                publicId: true
              }
            }
          }
        }
      }
    });

    if (!acknowledgement) {
      throw new NotFoundException("Service report acknowledgement not found.");
    }

    if (!acknowledgement.ticket) {
      throw new NotFoundException("Ticket acknowledgement not found.");
    }

    if (
      acknowledgement.ticket.machineId !== machineId ||
      acknowledgement.ticket.machine.publicId !== publicId ||
      acknowledgement.ticket.id !== ticketId ||
      acknowledgement.serviceReportId !== serviceReportId
    ) {
      throw new UnauthorizedException("Acknowledgement does not belong to this machine ticket service report.");
    }

    return acknowledgement;
  }

  private parsePriority(value: string | undefined) {
    const priority = value?.trim().toUpperCase();

    if (!priority) {
      throw new BadRequestException("Priority is required.");
    }

    if (!Object.values(TicketPriority).includes(priority as TicketPriority)) {
      throw new BadRequestException("Priority must be LOW, NORMAL, URGENT, or MACHINE_DOWN.");
    }

    return priority as TicketPriority;
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

  private hashAcknowledgementToken(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private publicMachineSummary(machine: {
    publicId: string;
    machineName: string;
    model: string;
    serialNumber: string;
    location: string;
    supportCompanyName: string | null;
    supportCompanyLogoAttachment: {
      id: string;
      originalFileName: string;
      contentType: string;
      fileSizeBytes: number;
      createdAt: Date;
    } | null;
    customer: { name: string };
  }) {
    return {
      publicId: machine.publicId,
      machineName: machine.machineName,
      model: machine.model,
      serialNumber: machine.serialNumber,
      location: machine.location,
      supportCompanyName: machine.supportCompanyName,
      supportCompanyLogoAttachment: machine.supportCompanyLogoAttachment,
      customerName: machine.customer.name
    };
  }

  private async verifyMachineAccess(publicId: string, authorization?: string) {
    const payload = this.verifyMachineAccessToken(authorization);
    if (payload.publicId !== publicId) {
      throw new UnauthorizedException("Machine access token does not match this machine.");
    }

    const machine = await this.prisma.machine.findUnique({
      where: { publicId },
      select: {
        id: true,
        isActive: true,
        customer: {
          select: {
            isActive: true
          }
        }
      }
    });

    if (!machine) {
      throw new NotFoundException("Machine not found.");
    }

    if (machine.id !== payload.machineId || !machine.isActive || !machine.customer.isActive) {
      throw new UnauthorizedException("Machine access is no longer valid.");
    }

    return payload;
  }

  private signMachineAccessToken(payload: MachineAccessPayload) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = this.createMachineAccessSignature(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  private verifyMachineAccessToken(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing machine access token.");
    }

    const token = authorization.slice("Bearer ".length);
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) {
      throw new UnauthorizedException("Invalid machine access token.");
    }

    const expectedSignature = this.createMachineAccessSignature(`${header}.${body}`);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Invalid machine access token signature.");
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MachineAccessPayload;
    if (payload.typ !== "machine_access" || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Machine access session has expired.");
    }

    return payload;
  }

  private createMachineAccessSignature(value: string) {
    return createHmac("sha256", process.env.PUBLIC_MACHINE_ACCESS_SECRET ?? process.env.JWT_ACCESS_SECRET ?? "local-dev-machine-access-secret")
      .update(value)
      .digest("base64url");
  }
}
