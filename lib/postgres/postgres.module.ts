import { Global, Module } from '@nestjs/common';
import { PostgresClient } from './postgres.client';
import { LoggerModule } from 'lib/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [PostgresClient],
  exports: [PostgresClient],
})
export class PostgresModule {}
