import { Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationStatus, TicketStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type NotificationRecipient = {
  name?: string | null;
  phone?: string | null;
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

  async logTicketCreated(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        requesterName: true,
        requesterPhone: true,
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
        phone: ticket.requesterPhone
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
        phone: ticket.requesterPhone
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

  private async logWhatsapp(input: WhatsAppLogInput) {
    const recipientPhone = this.cleanOptionalString(input.recipient.phone);

    await this.prisma.notificationLog.create({
      data: {
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        channel: NotificationChannel.WHATSAPP,
        recipientName: this.cleanOptionalString(input.recipient.name),
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

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }
}
