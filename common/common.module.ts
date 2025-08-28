import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'lib/logger/logger.module';
import { PostgresModule } from 'lib/postgres/postgres.module';
import { baseConfig } from './config/base.config';
import { BaseConfigModule } from './config/base.config.module';

@Global()
@Module({
  imports: [LoggerModule, PostgresModule, BaseConfigModule.forRoot(baseConfig)],
  exports: [LoggerModule, PostgresModule, BaseConfigModule]
})
export class CoreModule {}
