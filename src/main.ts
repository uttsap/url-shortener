import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config, onBoot } from './config/app.config';
import { GlobalExceptionFilter } from './exceptions/global-exception-filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await onBoot(config, app);
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
