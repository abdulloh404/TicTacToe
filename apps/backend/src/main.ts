import { json, urlencoded } from 'express';
import { AppModule } from './app/app.module';
import { Logger, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('query parser', 'extended');

  // main.ts (NestJS)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const API_PREFIX = 'v1';
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'public/(.*)', method: RequestMethod.GET }],
  });

  const port = process.env.BACKEND_PORT ?? '';
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${API_PREFIX}`
  );
}

bootstrap();
