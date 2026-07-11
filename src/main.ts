import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3001;

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
      );
    });

    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
}

void bootstrap();
