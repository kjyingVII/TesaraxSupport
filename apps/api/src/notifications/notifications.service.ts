import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationStatus, Prisma, TicketStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ListNotificationLogsInput = {
  channel?: string;
  status?: string;
  relatedType?: string;
  search?: string;
  page?: string;
  pageSize?: string;
};

type NotificationRecipient = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type WhatsAppLogInput = {
  relatedType: string;
  relatedId: string;
  recipient: NotificationRecipient;
  subject: string;
  message: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListNotificationLogsInput) {
    const page = this.parsePositiveInteger(input.page, 1);
    const pageSize = this.parsePositiveInteger(input.pageSize, 50);
    const where: Prisma.NotificationLogWhereInput = {};

    if (input.channel?.trim()) where.channel = this.parseChannel(input.channel);
    if (input.status?.trim()) where.status = this.parseStatus(input.status);
    if (input.relatedType?.trim()) where.relatedType = input.relatedType.trim();
    if (input.search?.trim()) {
      const search = input.search.trim();
      where.OR = [
        { recipientName: { contains: search, mode: "insensitive" } },
        { recipientPhone: { contains: search, mode: "insensitive" } },
        { recipientEmail: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { messageSummary: { contains: search, mode: "insensitive" } },
        { relatedId: { contains: search, mode: "insensitive" } }
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.notificationLog.count({ where })
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

  async logTicketCreated(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        requesterName: true,
        requesterPhone: true,
        requesterEmail: true,
        issueTitle: true,
        priority: true,
        machine: {
          select: {
            machineName: true,
            serialNumber: true,
            location: true,
            customer: {
              select: {
                name: true,
                technicianAssignments: {
                  select: {
                    technician: {
                      select: {
                        id: true,
                        name: true,
                        phone: true
                      }
                    }
                  }
                }
              }
            },
            technicianAssignments: {
              select: {
                technician: {
                  select: {
                    id: true,
                    name: true,
                    phone: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!ticket) return;

    const requesterMessage = [
      `Ticket ${ticket.ticketNumber} has been submitted.`,
      `Machine: ${ticket.machine.machineName} (${ticket.machine.serialNumber})`,
      `Issue: ${ticket.issueTitle}`,
      "Our support team will review and update the ticket status."
    ].join("\n");

    await this.logWhatsapp({
      relatedType: "Ticket",
      relatedId: ticket.id,
      recipient: {
        name: ticket.requesterName,
        phone: ticket.requesterPhone,
        email: ticket.requesterEmail
      },
      subject: `Ticket submitted: ${ticket.ticketNumber}`,
      message: requesterMessage
    });

    const technicianRecipients = this.uniqueRecipients([
      ...ticket.machine.technicianAssignments.map((assignment) => assignment.technician),
      ...ticket.machine.customer.technicianAssignments.map((assignment) => assignment.technician)
    ]);

    await Promise.all(
      technicianRecipients.map((technician) =>
        this.logWhatsapp({
          relatedType: "Ticket",
          relatedId: ticket.id,
          recipient: technician,
          subject: `New ticket: ${ticket.ticketNumber}`,
          message: [
            `New support ticket ${ticket.ticketNumber} was lodged.`,
            `Customer: ${ticket.machine.customer.name}`,
            `Machine: ${ticket.machine.machineName} (${ticket.machine.serialNumber})`,
            `Location: ${ticket.machine.location}`,
            `Priority: ${ticket.priority}`,
            `Issue: ${ticket.issueTitle}`
          ].join("\n")
        })
      )
    );
  }

  async logTicketStatusChanged(ticketId: string, fromStatus: TicketStatus, toStatus: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        requesterName: true,
        requesterPhone: true,
        requesterEmail: true,
        issueTitle: true,
        machine: {
          select: {
            machineName: true,
            serialNumber: true
          }
        }
      }
    });

    if (!ticket) return;

    await this.logWhatsapp({
      relatedType: "Ticket",
      relatedId: ticket.id,
      recipient: {
        name: ticket.requesterName,
        phone: ticket.requesterPhone,
        email: ticket.requesterEmail
      },
      subject: `Ticket status updated: ${ticket.ticketNumber}`,
      message: [
        `Ticket ${ticket.ticketNumber} status has changed from ${fromStatus} to ${toStatus}.`,
        `Machine: ${ticket.machine.machineName} (${ticket.machine.serialNumber})`,
        `Issue: ${ticket.issueTitle}`
      ].join("\n")
    });
  }

  async logServiceReportSubmitted(serviceReportId: string) {
    const serviceReport = await this.prisma.serviceReport.findUnique({
      where: { id: serviceReportId },
      select: {
        id: true,
        resolutionStatus: true,
        technician: {
          select: {
            name: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            requesterName: true,
            requesterPhone: true,
            requesterEmail: true,
            issueTitle: true,
            machine: {
              select: {
                machineName: true,
                serialNumber: true
              }
            }
          }
        }
      }
    });

    if (!serviceReport) return;

    await this.logWhatsapp({
      relatedType: "ServiceReport",
      relatedId: serviceReport.id,
      recipient: {
        name: serviceReport.ticket.requesterName,
        phone: serviceReport.ticket.requesterPhone
      },
      subject: `Service report submitted: ${serviceReport.ticket.ticketNumber}`,
      message: [
        `A service report has been submitted for ticket ${serviceReport.ticket.ticketNumber}.`,
        `Technician: ${serviceReport.technician.name}`,
        `Machine: ${serviceReport.ticket.machine.machineName} (${serviceReport.ticket.machine.serialNumber})`,
        `Result: ${serviceReport.resolutionStatus}`,
        "Please review and acknowledge the service report."
      ].join("\n")
    });
  }

  async logMachineLogCreated(machineLogId: string) {
    const machineLog = await this.prisma.machineLog.findUnique({
      where: { id: machineLogId },
      select: {
        id: true,
        activityType: true,
        workDate: true,
        title: true,
        workSummary: true,
        notifyCustomer: true,
        notifyRecipientName: true,
        notifyRecipientPhone: true,
        notifyRecipientEmail: true,
        notifyMessage: true,
        machine: {
          select: {
            machineName: true,
            serialNumber: true,
            location: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!machineLog?.notifyCustomer) return;

    await this.logWhatsapp({
      relatedType: "MachineLog",
      relatedId: machineLog.id,
      recipient: {
        name: machineLog.notifyRecipientName,
        phone: machineLog.notifyRecipientPhone,
        email: machineLog.notifyRecipientEmail
      },
      subject: `Machine log added: ${machineLog.title}`,
      message: [
        `A machine log has been added for ${machineLog.machine.machineName} (${machineLog.machine.serialNumber}).`,
        `Customer: ${machineLog.machine.customer.name}`,
        `Location: ${machineLog.machine.location}`,
        `Type: ${machineLog.activityType}`,
        `Work time: ${machineLog.workDate.toISOString()}`,
        `Title: ${machineLog.title}`,
        `Summary: ${machineLog.workSummary}`,
        machineLog.notifyMessage ? `Note: ${machineLog.notifyMessage}` : null
      ].filter(Boolean).join("\n")
    });
  }

  private async logWhatsapp(input: WhatsAppLogInput) {
    const recipientPhone = this.cleanOptionalString(input.recipient.phone);

    await this.prisma.notificationLog.create({
      data: {
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        channel: NotificationChannel.WHATSAPP,
        recipientName: this.cleanOptionalString(input.recipient.name),
        recipientEmail: this.cleanOptionalString(input.recipient.email),
        recipientPhone,
        subject: input.subject,
        messageSummary: this.truncate(input.message, 1000),
        status: NotificationStatus.SKIPPED,
        errorMessage: recipientPhone
          ? "WhatsApp provider is not configured yet. Notification was logged only."
          : "Recipient phone number is missing. Notification was not sent."
      }
    });
  }

  private uniqueRecipients(recipients: Array<NotificationRecipient & { id?: string }>) {
    const seen = new Set<string>();
    const unique: NotificationRecipient[] = [];

    for (const recipient of recipients) {
      const key = recipient.id ?? recipient.phone ?? recipient.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(recipient);
    }

    return unique;
  }

  private cleanOptionalString(value: string | null | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }

  private parseChannel(value: string) {
    const channel = value.trim().toUpperCase();
    if (!Object.values(NotificationChannel).includes(channel as NotificationChannel)) {
      throw new BadRequestException("Invalid notification channel.");
    }

    return channel as NotificationChannel;
  }

  private parseStatus(value: string) {
    const status = value.trim().toUpperCase();
    if (!Object.values(NotificationStatus).includes(status as NotificationStatus)) {
      throw new BadRequestException("Invalid notification status.");
    }

    return status as NotificationStatus;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined) return fallback;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException("Pagination values must be positive integers.");
    }

    return Math.min(parsed, 100);
  }

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }
}
