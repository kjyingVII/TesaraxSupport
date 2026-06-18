import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser("json", { limit: "150mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "150mb" });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_APP_URL ?? "http://localhost:3000",
    credentials: true
  });
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
