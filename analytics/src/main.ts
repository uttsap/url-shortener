import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { onBoot } from '../../common/config/base.config';
import { GlobalExceptionFilter } from '../../common/exceptions/global-exception-filter';
import { AnalyticsModule } from './analytics.module';
import { analyticsConfig } from './config/analytics.config';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);

  // intitalize logger and connect database
  await onBoot(analyticsConfig, app);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [analyticsConfig.natsEndpoint] },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      stopAtFirstError: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.startAllMicroservices(); // start nats microservices

  await app.listen(analyticsConfig.analyticsPort || 3001);
}

bootstrap().catch(console.error);
