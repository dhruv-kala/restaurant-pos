import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME,
  environment: process.env.NODE_ENV,
  port: Number(process.env.PORT),
  apiPrefix: process.env.API_PREFIX,
  corsOrigins: process.env.CORS_ORIGINS,
}));
