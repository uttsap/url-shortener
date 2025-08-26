import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './exceptions/global-exception-filter';
import { config, onBoot } from './config/app.config';

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
bootstrap();
