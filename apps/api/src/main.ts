import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is required to verify the LINE webhook X-Line-Signature.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Behind the Railway edge proxy: trust the first hop so req.ip resolves to
  // the real client (X-Forwarded-For) instead of a rotating proxy address.
  // Without this the rate limiter buckets each request separately and never
  // triggers.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Complaint Tracker API running at http://localhost:${port}/api`);
}
bootstrap();
