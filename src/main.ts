import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { onBoot } from 'common/config/base.config';
import { GlobalExceptionFilter } from '../common/exceptions/global-exception-filter';
import { AppModule } from './app.module';
import { config } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // intitalize logger and connect database
  await onBoot(config, app);

  // setup validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      stopAtFirstError: true
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(3000);
}
bootstrap().catch(console.error);
