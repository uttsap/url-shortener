import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { onBoot } from '../../common/config/base.config';
import { GlobalExceptionFilter } from '../../common/exceptions/global-exception-filter';
import { AnalyticsModule } from './analytics.module';
import { analyticsConfig } from './config/analytics.config';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);

  // intitalize logger and connect database
  await onBoot(analyticsConfig, app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      stopAtFirstError: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(analyticsConfig.analyticsPort || 3001);
}

bootstrap().catch(console.error);
