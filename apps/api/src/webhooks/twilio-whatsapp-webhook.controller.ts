import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../auth/auth.decorators";
import { TwilioWhatsappWebhookService } from "./twilio-whatsapp-webhook.service";

@Public()
@Controller("webhooks/twilio/whatsapp")
export class TwilioWhatsappWebhookController {
  constructor(private readonly twilioWhatsappWebhookService: TwilioWhatsappWebhookService) {}

  @Post("status")
  receiveStatus(@Body() body: Record<string, string | undefined>) {
    return this.twilioWhatsappWebhookService.handleStatusCallback({
      MessageSid: body.MessageSid,
      MessageStatus: body.MessageStatus,
      SmsStatus: body.SmsStatus,
      To: body.To,
      From: body.From,
      ErrorCode: body.ErrorCode,
      ErrorMessage: body.ErrorMessage,
      body
    });
  }
}
