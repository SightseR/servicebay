import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { static as expressStatic } from 'express';
import * as path from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  // The API only ever sits behind nginx/Traefik (never exposed directly), so trust the
  // X-Forwarded-* headers they set — otherwise rate limiting would see every client as the proxy's IP.
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.use(helmet());
  app.use(cookieParser());
  // Uploaded files (company logo). Public by design — a logo is not sensitive — but served
  // with headers that stop anything in it from executing if opened directly.
  app.use('/uploads', expressStatic(path.resolve(config.get<string>('UPLOADS_DIR') ?? 'uploads'), {
    index: false,
    dotfiles: 'deny',
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  }));
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN')?.split(','), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`ServiceBay API listening on :${port}/api/v1`);
}
void bootstrap();
