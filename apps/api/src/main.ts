import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { readEnv } from "./config/env";

async function bootstrap() {
  const env = readEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(env.port);
}

void bootstrap();
