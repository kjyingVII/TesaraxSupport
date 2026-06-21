import { createHmac, timingSafeEqual } from "crypto";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { NotificationStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type MetaWebhookEntry = {
  changes?: Array<{
    field?: string;
    value?: {
      messaging_product?: string;
      metadata?: unknown;
      statuses?: Array<{
        id?: string;
        status?: string;
        timestamp?: string;
        recipient_id?: string;
        errors?: Array<{
          code?: number;
          title?: string;
          message?: string;
          error_data?: {
            details?: string;
          };
        }>;
      }>;
      messages?: Array<{
        id?: string;
        from?: string;
        timestamp?: string;
        type?: string;
        text?: {
          body?: string;
        };
      }>;
    };
  }>;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: MetaWebhookEntry[];
};

@Injectable()
export class MetaWhatsappWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  verifySubscription(mode?: string, token?: string, challenge?: string) {
    const verifyToken = this.cleanOptionalString(process.env.WHATSAPP_META_WEBHOOK_VERIFY_TOKEN);

    if (!verifyToken) {
      throw new ForbiddenException("WhatsApp webhook verify token is not configured.");
    }

    if (mode !== "subscribe" || token !== verifyToken || !challenge) {
      throw new ForbiddenException("WhatsApp webhook verification failed.");
    }

    return challenge;
  }

  verifySignature(rawBody: Buffer | undefined, signature: string | string[] | undefined) {
    const appSecret = this.cleanOptionalString(process.env.WHATSAPP_META_APP_SECRET);
    if (!appSecret) return;

    const receivedSignature = Array.isArray(signature) ? signature[0] : signature;
    if (!rawBody || !receivedSignature?.startsWith("sha256=")) {
      throw new UnauthorizedException("WhatsApp webhook signature is missing.");
    }

    const expectedSignature = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new UnauthorizedException("WhatsApp webhook signature is invalid.");
    }
  }

  async handleCallback(payload: MetaWebhookPayload) {
    const events = this.extractEvents(payload);

    if (!events.length) {
      await this.prisma.whatsAppWebhookEvent.create({
        data: {
          eventType: "unknown",
          payload: payload as Prisma.InputJsonValue
        }
      });

      return { received: true, events: 0 };
    }

    for (const event of events) {
      await this.prisma.whatsAppWebhookEvent.create({
        data: {
          eventType: event.eventType,
          providerMessageId: event.providerMessageId,
          senderPhone: event.senderPhone,
          status: event.status,
          payload: event.payload as Prisma.InputJsonValue
        }
      });

      if (event.eventType === "status" && event.providerMessageId) {
        await this.updateNotificationStatus(event.providerMessageId, event.status, event.errorMessage);
      }
    }

    return { received: true, events: events.length };
  }

  private extractEvents(payload: MetaWebhookPayload) {
    const events: Array<{
      eventType: string;
      providerMessageId?: string;
      senderPhone?: string;
      status?: string;
      errorMessage?: string;
      payload: unknown;
    }> = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        for (const status of value?.statuses ?? []) {
          events.push({
            eventType: "status",
            providerMessageId: status.id,
            senderPhone: status.recipient_id,
            status: status.status,
            errorMessage: this.formatStatusError(status.errors),
            payload: status
          });
        }

        for (const message of value?.messages ?? []) {
          events.push({
            eventType: "message",
            providerMessageId: message.id,
            senderPhone: message.from,
            status: message.type,
            payload: message
          });
        }
      }
    }

    return events;
  }

  private async updateNotificationStatus(providerMessageId: string, status: string | undefined, errorMessage: string | undefined) {
    if (status === "failed") {
      await this.prisma.notificationLog.updateMany({
        where: { providerMessageId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: errorMessage ?? "Meta reported WhatsApp delivery failed."
        }
      });
      return;
    }

    if (["sent", "delivered", "read"].includes(status ?? "")) {
      await this.prisma.notificationLog.updateMany({
        where: { providerMessageId, status: { not: NotificationStatus.FAILED } },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date()
        }
      });
    }
  }

  private formatStatusError(errors: Array<{ title?: string; message?: string; error_data?: { details?: string } }> | undefined) {
    const error = errors?.[0];
    if (!error) return undefined;

    return [
      error.title,
      error.message,
      error.error_data?.details
    ].filter(Boolean).join(" - ");
  }

  private cleanOptionalString(value: string | null | undefined) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : undefined;
  }
}
