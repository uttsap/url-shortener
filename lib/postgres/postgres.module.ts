import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'lib/logger/logger.module';
import { PostgresClient } from './postgres.client';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [PostgresClient],
  exports: [PostgresClient]
})
export class PostgresModule {}
