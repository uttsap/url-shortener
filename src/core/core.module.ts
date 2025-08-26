import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'lib/logger/logger.module';
import { PostgresModule } from 'lib/postgres/postgres.module';

@Global()
@Module({
  imports: [LoggerModule, PostgresModule],
  exports: [LoggerModule, PostgresModule]
})
export class CoreModule {}
