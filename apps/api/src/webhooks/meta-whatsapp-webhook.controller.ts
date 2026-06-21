import { Body, Controller, Get, Headers, Post, Query, Req, Res } from "@nestjs/common";
import { Public } from "../auth/auth.decorators";
import { MetaWhatsappWebhookService } from "./meta-whatsapp-webhook.service";

type RawBodyRequest = {
  rawBody?: Buffer;
};

type TextResponse = {
  status(code: number): TextResponse;
  type(contentType: string): TextResponse;
  send(body: string): void;
};

@Public()
@Controller("webhooks/meta/whatsapp")
export class MetaWhatsappWebhookController {
  constructor(private readonly metaWhatsappWebhookService: MetaWhatsappWebhookService) {}

  @Get()
  verify(
    @Query("hub.mode") mode: string | undefined,
    @Query("hub.verify_token") token: string | undefined,
    @Query("hub.challenge") challenge: string | undefined,
    @Res() response: TextResponse
  ) {
    const verifiedChallenge = this.metaWhatsappWebhookService.verifySubscription(mode, token, challenge);
    response.status(200).type("text/plain").send(verifiedChallenge);
  }

  @Post()
  receive(
    @Body() body: unknown,
    @Headers("x-hub-signature-256") signature: string | string[] | undefined,
    @Req() request: RawBodyRequest
  ) {
    this.metaWhatsappWebhookService.verifySignature(request.rawBody, signature);
    return this.metaWhatsappWebhookService.handleCallback(body as never);
  }
}
