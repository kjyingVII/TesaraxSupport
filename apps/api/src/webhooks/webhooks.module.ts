import { Module } from "@nestjs/common";
import { MetaWhatsappWebhookController } from "./meta-whatsapp-webhook.controller";
import { MetaWhatsappWebhookService } from "./meta-whatsapp-webhook.service";
import { TwilioWhatsappWebhookController } from "./twilio-whatsapp-webhook.controller";
import { TwilioWhatsappWebhookService } from "./twilio-whatsapp-webhook.service";

@Module({
  controllers: [MetaWhatsappWebhookController, TwilioWhatsappWebhookController],
  providers: [MetaWhatsappWebhookService, TwilioWhatsappWebhookService]
})
export class WebhooksModule {}
