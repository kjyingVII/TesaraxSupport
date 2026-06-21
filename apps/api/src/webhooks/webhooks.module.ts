import { Module } from "@nestjs/common";
import { MetaWhatsappWebhookController } from "./meta-whatsapp-webhook.controller";
import { MetaWhatsappWebhookService } from "./meta-whatsapp-webhook.service";

@Module({
  controllers: [MetaWhatsappWebhookController],
  providers: [MetaWhatsappWebhookService]
})
export class WebhooksModule {}
