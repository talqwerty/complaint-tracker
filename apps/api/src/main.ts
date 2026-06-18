import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is required to verify the LINE webhook X-Line-Signature.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Behind the Railway edge proxy there are several internal hops, so trusting
  // a fixed number leaves req.ip on a rotating internal address — the rate
  // limiter then buckets every request separately and never triggers. Trust the
  // whole chain so req.ip resolves to the left-most X-Forwarded-For entry (the
  // real client as set by the Railway edge).
  app.set('trust proxy', true);

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
