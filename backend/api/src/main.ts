import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { parseCorsOrigins } from './common/utils/parse-cors-origins.util';
import type { EnvironmentVariables } from './config/environment.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  const appName = configService.get('APP_NAME', { infer: true });
  const apiPrefix = configService.get('API_PREFIX', { infer: true });
  const corsOrigins = parseCorsOrigins(configService.get('CORS_ORIGINS', { infer: true }));

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('ServeIQ Restaurant POS SaaS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = configService.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
