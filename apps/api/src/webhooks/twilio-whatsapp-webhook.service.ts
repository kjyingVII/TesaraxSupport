import { Injectable } from "@nestjs/common";
import { NotificationStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type TwilioWhatsappStatusInput = {
  MessageSid?: string;
  MessageStatus?: string;
  SmsStatus?: string;
  To?: string;
  From?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  body: Record<string, unknown>;
};

@Injectable()
export class TwilioWhatsappWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async handleStatusCallback(input: TwilioWhatsappStatusInput) {
    const providerMessageId = input.MessageSid;
    const status = input.MessageStatus ?? input.SmsStatus ?? null;
    const senderPhone = this.cleanWhatsappAddress(input.To);
    const errorMessage = [input.ErrorCode, input.ErrorMessage].filter(Boolean).join(" - ") || undefined;

    await this.prisma.whatsAppWebhookEvent.create({
      data: {
        provider: "twilio",
        eventType: "status",
        providerMessageId,
        senderPhone,
        status,
        payload: input.body as Prisma.InputJsonValue
      }
    });

    if (providerMessageId) {
      await this.updateNotificationStatus(providerMessageId, status, errorMessage);
    }

    return { received: true };
  }

  private async updateNotificationStatus(providerMessageId: string, status: string | null, errorMessage: string | undefined) {
    if (["failed", "undelivered"].includes(status ?? "")) {
      await this.prisma.notificationLog.updateMany({
        where: { providerMessageId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: errorMessage ?? `Twilio reported WhatsApp ${status}.`
        }
      });
      return;
    }

    if (["queued", "sent", "delivered", "read"].includes(status ?? "")) {
      await this.prisma.notificationLog.updateMany({
        where: { providerMessageId, status: { not: NotificationStatus.FAILED } },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date()
        }
      });
    }
  }

  private cleanWhatsappAddress(value: string | undefined) {
    return value?.replace(/^whatsapp:/i, "") ?? null;
  }
}
