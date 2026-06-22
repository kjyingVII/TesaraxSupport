import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationStatus, Prisma, TicketStatus } from "@prisma/client";
import { parseRequiredPhoneNumber } from "../common/phone-number";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";

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
  relatedId?: string;
  recipient: NotificationRecipient;
  subject: string;
  message: string;
  template?: WhatsAppTemplateInput;
};

type WhatsAppSendResult = {
  status: NotificationStatus;
  providerMessageId?: string;
  errorMessage?: string;
};

type WhatsAppTemplateInput = {
  eventKey: string;
  parameters: string[];
};

type SendManualWhatsappInput = {
  recipientName?: string;
  recipientPhone?: string;
  subject?: string;
  message?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService
  ) {}

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

    const webhookEventsByProviderMessageId = await this.getWebhookEventsByProviderMessageId(
      items.map((item) => item.providerMessageId).filter(Boolean)
    );

    return {
      data: items.map((item) => ({
        ...item,
        webhookEvents: item.providerMessageId ? webhookEventsByProviderMessageId.get(item.providerMessageId) ?? [] : [],
        latestWebhookEvent: item.providerMessageId ? webhookEventsByProviderMessageId.get(item.providerMessageId)?.[0] ?? null : null
      })),
      meta: {
        page,
        pageSize,
        total
      }
    };
  }

  async sendManualWhatsapp(input: SendManualWhatsappInput) {
    const message = this.cleanOptionalString(input.message);
    if (!message) {
      throw new BadRequestException("Message is required.");
    }

    if (message.length > 1000) {
      throw new BadRequestException("Message must be 1000 characters or less.");
    }

    const recipientPhone = parseRequiredPhoneNumber(input.recipientPhone, "Recipient phone");
    const recipientName = this.cleanOptionalString(input.recipientName);
    const subject = this.cleanOptionalString(input.subject) ?? "Manual WhatsApp test";

    const log = await this.logWhatsapp({
      relatedType: "ManualWhatsappTest",
      recipient: {
        name: recipientName,
        phone: recipientPhone
      },
      subject,
      message
    });

    return {
      data: {
        ...log,
        webhookEvents: [],
        latestWebhookEvent: null
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
        issueDescription: true,
        priority: true,
        machine: {
          select: {
            publicId: true,
            machineName: true,
            supportCompanyName: true,
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
                        email: true,
                        isActive: true,
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
                    email: true,
                    isActive: true,
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

    const signOffName = await this.getMessageSignOffName(ticket.machine.supportCompanyName);
    const newTicketMessage = [
      "New support ticket has been created.",
      "",
      `Ticket: ${ticket.ticketNumber}`,
      `Customer: ${ticket.machine.customer.name}`,
      `Machine: ${ticket.machine.machineName}`,
      "",
      "Requester:",
      `Name: ${ticket.requesterName}`,
      `Contact: ${this.formatContactValue(ticket.requesterPhone, ticket.requesterEmail)}`,
      "",
      "Issue:",
      ticket.issueTitle,
      "",
      "Description:",
      ticket.issueDescription,
      "",
      `Support company: ${signOffName}`,
      "",
      "Thank you.",
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
      message: newTicketMessage,
      template: {
        eventKey: "ticket_created_requester",
        parameters: [
          ticket.ticketNumber,
          ticket.machine.customer.name,
          ticket.machine.machineName,
          ticket.requesterName,
          this.formatContactValue(ticket.requesterPhone, ticket.requesterEmail),
          ticket.issueTitle,
          ticket.issueDescription,
          signOffName
        ]
      }
    });

    const technicianRecipients = this.uniqueRecipients([
      ...ticket.machine.technicianAssignments.map((assignment) => assignment.technician),
      ...ticket.machine.customer.technicianAssignments.map((assignment) => assignment.technician)
    ].filter((technician) => technician.isActive));

    if (!technicianRecipients.length) {
      await this.prisma.notificationLog.create({
        data: {
          relatedType: "Ticket",
          relatedId: ticket.id,
          channel: NotificationChannel.WHATSAPP,
          subject: `New ticket: ${ticket.ticketNumber}`,
          messageSummary: this.truncate([
            `No active machine/customer technicians are assigned for ticket ${ticket.ticketNumber}.`,
            `Customer: ${ticket.machine.customer.name}`,
            `Machine: ${ticket.machine.machineName} (${ticket.machine.serialNumber})`
          ].join("\n"), 1000),
          status: NotificationStatus.SKIPPED,
          errorMessage: "No active machine or customer technician is assigned to receive this ticket notification."
        }
      });
      return;
    }

    await Promise.all(
      technicianRecipients.map((technician) =>
        this.logWhatsapp({
          relatedType: "Ticket",
          relatedId: ticket.id,
          recipient: technician,
          subject: `New ticket: ${ticket.ticketNumber}`,
          message: newTicketMessage,
          template: {
            eventKey: "ticket_created_technician",
            parameters: [
              ticket.ticketNumber,
              ticket.machine.customer.name,
              ticket.machine.machineName,
              ticket.requesterName,
              this.formatContactValue(ticket.requesterPhone, ticket.requesterEmail),
              ticket.issueTitle,
              ticket.issueDescription,
              signOffName
            ]
          }
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
            publicId: true,
            machineName: true,
            serialNumber: true,
            supportCompanyName: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!ticket) return;

    const signOffName = await this.getMessageSignOffName(ticket.machine.supportCompanyName);
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
        `Issue: ${ticket.issueTitle}`,
        "",
        "Thank you.",
        signOffName
      ].join("\n"),
      template: {
        eventKey: "ticket_status_changed",
        parameters: [
          ticket.ticketNumber,
          toStatus,
          ticket.machine.machineName,
          ticket.issueTitle,
          signOffName,
          this.buildMachineAccessUrl(ticket.machine.publicId)
        ]
      }
    });
  }

  async logServiceReportSubmitted(serviceReportId: string, acknowledgementUrl?: string) {
    const serviceReport = await this.prisma.serviceReport.findUnique({
      where: { id: serviceReportId },
      select: {
        id: true,
        diagnosis: true,
        actionTaken: true,
        serviceStartAt: true,
        serviceEndAt: true,
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
                publicId: true,
                machineName: true,
                model: true,
                supportCompanyName: true,
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
        }
      }
    });

    if (!serviceReport) return;

    const signOffName = await this.getMessageSignOffName(serviceReport.ticket.machine.supportCompanyName);
    const message = acknowledgementUrl
      ? this.buildServiceReportAcknowledgementMessage({
          acknowledgementUrl,
          ticketNumber: serviceReport.ticket.ticketNumber,
          customerName: serviceReport.ticket.machine.customer.name,
          machineName: serviceReport.ticket.machine.machineName,
          model: serviceReport.ticket.machine.model,
          serialNumber: serviceReport.ticket.machine.serialNumber,
          location: serviceReport.ticket.machine.location,
          issueTitle: serviceReport.ticket.issueTitle,
          serviceStartAt: serviceReport.serviceStartAt,
          serviceEndAt: serviceReport.serviceEndAt,
          technicianName: serviceReport.technician.name,
          diagnosis: serviceReport.diagnosis,
          actionTaken: serviceReport.actionTaken,
          resolutionStatus: serviceReport.resolutionStatus,
          signOffName
        })
      : [
          `A service report has been submitted for ticket ${serviceReport.ticket.ticketNumber}.`,
          `Technician: ${serviceReport.technician.name}`,
          `Machine: ${serviceReport.ticket.machine.machineName} (${serviceReport.ticket.machine.serialNumber})`,
          `Result: ${serviceReport.resolutionStatus}`,
          "Please review and acknowledge the service report.",
          "",
          "Thank you.",
          signOffName
        ].join("\n");

    await this.logWhatsapp({
      relatedType: "ServiceReport",
      relatedId: serviceReport.id,
      recipient: {
        name: serviceReport.ticket.requesterName,
        phone: serviceReport.ticket.requesterPhone
      },
      subject: `Service report submitted: ${serviceReport.ticket.ticketNumber}`,
      message,
      template: {
        eventKey: "service_report_submitted",
        parameters: [
          serviceReport.ticket.ticketNumber,
          serviceReport.ticket.machine.machineName,
          serviceReport.ticket.machine.serialNumber,
          serviceReport.technician.name,
          serviceReport.resolutionStatus,
          signOffName,
          acknowledgementUrl ?? this.buildMachineAccessUrl(serviceReport.ticket.machine.publicId)
        ]
      }
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
            supportCompanyName: true,
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

    const signOffName = await this.getMessageSignOffName(machineLog.machine.supportCompanyName);

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
        machineLog.notifyMessage ? `Note: ${machineLog.notifyMessage}` : null,
        "",
        "Thank you.",
        signOffName
      ].filter(Boolean).join("\n"),
      template: {
        eventKey: "machine_log_created",
        parameters: [
          machineLog.machine.machineName,
          machineLog.machine.serialNumber,
          machineLog.activityType,
          machineLog.title,
          machineLog.workDate.toISOString()
        ]
      }
    });
  }

  private async logWhatsapp(input: WhatsAppLogInput) {
    const recipientPhone = this.cleanOptionalString(input.recipient.phone);
    const recipientEmail = this.cleanOptionalString(input.recipient.email);
    const recipientName = this.cleanOptionalString(input.recipient.name);
    const messageSummary = this.truncate(input.message, 1000);

    if (!recipientPhone) {
      return this.prisma.notificationLog.create({
        data: {
          relatedType: input.relatedType,
          relatedId: input.relatedId,
          channel: NotificationChannel.WHATSAPP,
          recipientName,
          recipientEmail,
          recipientPhone,
          subject: input.subject,
          messageSummary,
          status: NotificationStatus.SKIPPED,
          errorMessage: "Recipient phone number is missing. Notification was not sent."
        }
      });
    }

    const sendResult = await this.sendWhatsappMessage(recipientPhone, input.message, input.template);

    return this.prisma.notificationLog.create({
      data: {
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        channel: NotificationChannel.WHATSAPP,
        recipientName,
        recipientEmail,
        recipientPhone,
        subject: input.subject,
        messageSummary,
        status: sendResult.status,
        providerMessageId: sendResult.providerMessageId,
        errorMessage: sendResult.errorMessage,
        sentAt: sendResult.status === NotificationStatus.SENT ? new Date() : undefined
      }
    });
  }

  private async sendWhatsappMessage(
    recipientPhone: string,
    message: string,
    template?: WhatsAppTemplateInput
  ): Promise<WhatsAppSendResult> {
    const provider = this.cleanOptionalString(process.env.WHATSAPP_PROVIDER)?.toLowerCase() ?? "log";

    if (provider === "log" || provider === "disabled") {
      return {
        status: NotificationStatus.SKIPPED,
        errorMessage: "WhatsApp provider is not configured. Notification was logged only."
      };
    }

    if (provider === "twilio") {
      return this.sendTwilioWhatsappMessage(recipientPhone, message, template);
    }

    if (provider !== "meta") {
      return {
        status: NotificationStatus.SKIPPED,
        errorMessage: `Unsupported WhatsApp provider: ${provider}.`
      };
    }

    return this.sendMetaWhatsappMessage(recipientPhone, message, template);
  }

  private async sendTwilioWhatsappMessage(
    recipientPhone: string,
    message: string,
    template?: WhatsAppTemplateInput
  ): Promise<WhatsAppSendResult> {
    const accountSid = this.cleanOptionalString(process.env.TWILIO_ACCOUNT_SID);
    const authToken = this.cleanOptionalString(process.env.TWILIO_AUTH_TOKEN);
    const from = this.formatTwilioWhatsappAddress(process.env.TWILIO_WHATSAPP_FROM);
    const messageMode = this.cleanOptionalString(process.env.TWILIO_MESSAGE_MODE)?.toLowerCase() ?? "body";

    if (!accountSid || !authToken || !from) {
      return {
        status: NotificationStatus.SKIPPED,
        errorMessage: "Twilio WhatsApp credentials are missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM."
      };
    }

    const to = this.formatTwilioWhatsappAddress(recipientPhone);
    if (!to) {
      return {
        status: NotificationStatus.FAILED,
        errorMessage: "Recipient phone number must include country code and digits only."
      };
    }

    const body = new URLSearchParams({
      From: from,
      To: to
    });

    if (messageMode === "template") {
      if (!template) {
        return {
          status: NotificationStatus.SKIPPED,
          errorMessage: "Twilio template mode is enabled, but this notification does not provide template data."
        };
      }

      const contentSid = this.getTwilioContentSid(template.eventKey);
      if (!contentSid) {
        return {
          status: NotificationStatus.SKIPPED,
          errorMessage: `Twilio template mode is enabled, but no ContentSid is configured for ${template.eventKey}.`
        };
      }

      body.set("ContentSid", contentSid);
      body.set("ContentVariables", JSON.stringify(this.buildTwilioContentVariables(template.parameters)));
    } else {
      body.set("Body", message);
    }

    const statusCallbackUrl = this.cleanOptionalString(process.env.TWILIO_WHATSAPP_STATUS_CALLBACK_URL);
    if (statusCallbackUrl) body.set("StatusCallback", statusCallbackUrl);

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });

      const payload = await response.json().catch(() => null) as {
        sid?: string;
        message?: string;
        code?: number;
        status?: string;
      } | null;

      if (!response.ok) {
        return {
          status: NotificationStatus.FAILED,
          errorMessage: this.truncate(payload?.message ?? `Twilio API returned HTTP ${response.status}.`, 1000)
        };
      }

      return {
        status: NotificationStatus.SENT,
        providerMessageId: payload?.sid
      };
    } catch (error) {
      return {
        status: NotificationStatus.FAILED,
        errorMessage: this.truncate(error instanceof Error ? error.message : "Unable to send Twilio WhatsApp message.", 1000)
      };
    }
  }

  private async sendMetaWhatsappMessage(
    recipientPhone: string,
    message: string,
    template?: WhatsAppTemplateInput
  ): Promise<WhatsAppSendResult> {
    const accessToken = this.cleanOptionalString(process.env.WHATSAPP_META_ACCESS_TOKEN);
    const phoneNumberId = this.cleanOptionalString(process.env.WHATSAPP_META_PHONE_NUMBER_ID);
    const graphApiVersion = this.cleanOptionalString(process.env.WHATSAPP_META_GRAPH_API_VERSION) ?? "v20.0";
    const messageMode = this.cleanOptionalString(process.env.WHATSAPP_META_MESSAGE_MODE)?.toLowerCase() ?? "text";

    if (!accessToken || !phoneNumberId) {
      return {
        status: NotificationStatus.SKIPPED,
        errorMessage: "Meta WhatsApp credentials are missing. Set WHATSAPP_META_ACCESS_TOKEN and WHATSAPP_META_PHONE_NUMBER_ID."
      };
    }

    const to = this.normalizeWhatsappPhone(recipientPhone);
    if (!to) {
      return {
        status: NotificationStatus.FAILED,
        errorMessage: "Recipient phone number must include country code and digits only."
      };
    }

    try {
      const requestBody = messageMode === "template"
        ? this.buildMetaTemplateBody(to, template)
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: {
              preview_url: false,
              body: message
            }
          };

      if ("errorMessage" in requestBody) {
        return {
          status: NotificationStatus.SKIPPED,
          errorMessage: requestBody.errorMessage
        };
      }

      const response = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const payload = await response.json().catch(() => null) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string; type?: string; code?: number };
      } | null;

      if (!response.ok) {
        const errorMessage = payload?.error?.message ?? `Meta WhatsApp API returned HTTP ${response.status}.`;
        return {
          status: NotificationStatus.FAILED,
          errorMessage: this.truncate(errorMessage, 1000)
        };
      }

      return {
        status: NotificationStatus.SENT,
        providerMessageId: payload?.messages?.[0]?.id
      };
    } catch (error) {
      return {
        status: NotificationStatus.FAILED,
        errorMessage: this.truncate(error instanceof Error ? error.message : "Unable to send WhatsApp message.", 1000)
      };
    }
  }

  private buildMetaTemplateBody(to: string, template?: WhatsAppTemplateInput) {
    if (!template) {
      return {
        errorMessage: "WhatsApp template mode is enabled, but this notification does not provide template data."
      };
    }

    const templateName = this.getMetaTemplateName(template.eventKey);
    if (!templateName) {
      return {
        errorMessage: `WhatsApp template mode is enabled, but no template is configured for ${template.eventKey}.`
      };
    }

    const languageCode = this.cleanOptionalString(process.env.WHATSAPP_META_TEMPLATE_LANGUAGE) ?? "en";

    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: [
          {
            type: "body",
            parameters: template.parameters.map((parameter) => ({
              type: "text",
              text: this.truncate(String(parameter), 1024)
            }))
          }
        ]
      }
    };
  }

  private getMetaTemplateName(eventKey: string) {
    const envKey = `WHATSAPP_META_TEMPLATE_${eventKey.toUpperCase()}`;
    return this.cleanOptionalString(process.env[envKey]) ?? this.defaultTemplateName(eventKey);
  }

  private getTwilioContentSid(eventKey: string) {
    const envKey = `TWILIO_CONTENT_SID_${eventKey.toUpperCase()}`;
    return this.cleanOptionalString(process.env[envKey]);
  }

  private buildTwilioContentVariables(parameters: Array<string | number | boolean | null | undefined>) {
    return parameters.reduce<Record<string, string>>((variables, parameter, index) => {
      variables[String(index + 1)] = this.truncate(String(parameter ?? "-"), 1024);
      return variables;
    }, {});
  }

  private defaultTemplateName(eventKey: string) {
    const templates: Record<string, string> = {
      ticket_created_requester: "new_ticket_notification",
      ticket_created_technician: "new_ticket_notification",
      ticket_status_changed: "ticket_status_change_notification",
      service_report_submitted: "service_report_submitted_notification"
    };

    return templates[eventKey];
  }

  private buildServiceReportAcknowledgementMessage(input: {
    acknowledgementUrl: string;
    ticketNumber: string;
    customerName: string;
    machineName: string;
    model?: string | null;
    serialNumber?: string | null;
    location?: string | null;
    issueTitle: string;
    serviceStartAt?: Date | null;
    serviceEndAt?: Date | null;
    technicianName?: string | null;
    diagnosis?: string | null;
    actionTaken?: string | null;
    resolutionStatus?: string | null;
    signOffName: string;
  }) {
    return [
      "Dear customer,",
      "",
      "A service report has been submitted for your support ticket. Please review the service details and acknowledge the service rendered using the link below.",
      "",
      `Ticket: ${input.ticketNumber}`,
      `Customer: ${input.customerName}`,
      `Machine: ${input.machineName}`,
      `Model: ${input.model || "Not recorded"}`,
      `Serial No.: ${input.serialNumber || "Not recorded"}`,
      `Location: ${input.location || "Not recorded"}`,
      `Issue: ${input.issueTitle}`,
      `Service Time: ${this.formatMessageDateRange(input.serviceStartAt, input.serviceEndAt)}`,
      `Technician: ${input.technicianName || "Not recorded"}`,
      `Result: ${this.formatMessageValue(input.resolutionStatus)}`,
      "",
      "Service Summary:",
      input.actionTaken || input.diagnosis || "Please refer to the service report details in the acknowledgement page.",
      "",
      "Acknowledgement link:",
      input.acknowledgementUrl,
      "",
      "Thank you.",
      input.signOffName
    ].join("\n");
  }

  private formatMessageValue(value?: string | null) {
    return value ? value.replaceAll("_", " ") : "Not recorded";
  }

  private formatMessageDateRange(start?: Date | null, end?: Date | null) {
    if (!start && !end) return "Not recorded";
    if (!end) return this.formatMessageDate(start);
    return `${this.formatMessageDate(start)} to ${this.formatMessageDate(end)}`;
  }

  private formatMessageDate(value?: Date | null) {
    if (!value) return "Not recorded";
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(value);
  }

  private formatContactValue(phone?: string | null, email?: string | null) {
    const parts = [this.cleanOptionalString(phone), this.cleanOptionalString(email)].filter(Boolean);
    return parts.length ? parts.join(" / ") : "Not recorded";
  }

  private buildMachineAccessUrl(publicId: string) {
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    return `${webAppUrl.replace(/\/$/, "")}/m/${publicId}/access`;
  }

  private async getMessageSignOffName(machineSupportCompanyName?: string | null) {
    const supportCompanyName = this.cleanOptionalString(machineSupportCompanyName);
    if (supportCompanyName) return supportCompanyName;

    const settings = await this.settingsService.getCurrentSettings();
    return settings.companyName ?? "Tesarax Support";
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

  private async getWebhookEventsByProviderMessageId(providerMessageIds: Array<string | null>) {
    const uniqueProviderMessageIds = [...new Set(providerMessageIds.filter(Boolean))] as string[];
    const eventsByProviderMessageId = new Map<string, Array<{
      id: string;
      eventType: string;
      providerMessageId: string | null;
      senderPhone: string | null;
      status: string | null;
      receivedAt: Date;
      payload: Prisma.JsonValue;
    }>>();

    if (!uniqueProviderMessageIds.length) return eventsByProviderMessageId;

    const events = await this.prisma.whatsAppWebhookEvent.findMany({
      where: {
        providerMessageId: { in: uniqueProviderMessageIds }
      },
      orderBy: { receivedAt: "desc" },
      take: uniqueProviderMessageIds.length * 10
    });

    for (const event of events) {
      if (!event.providerMessageId) continue;
      const groupedEvents = eventsByProviderMessageId.get(event.providerMessageId) ?? [];
      if (groupedEvents.length < 10) groupedEvents.push(event);
      eventsByProviderMessageId.set(event.providerMessageId, groupedEvents);
    }

    return eventsByProviderMessageId;
  }

  private cleanOptionalString(value: string | null | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }

  private normalizeWhatsappPhone(value: string) {
    const digits = value.replace(/^\+/, "").replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 ? digits : undefined;
  }

  private formatTwilioWhatsappAddress(value: string | null | undefined) {
    const cleaned = this.cleanOptionalString(value);
    if (!cleaned) return undefined;

    const phone = cleaned.replace(/^whatsapp:/i, "");
    const digits = this.normalizeWhatsappPhone(phone);
    return digits ? `whatsapp:+${digits}` : undefined;
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
