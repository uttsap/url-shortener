import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { AppConfig } from 'src/config/contracts';
import { CounterRepository } from 'src/persistance/repositories/counter.repository';
import { UrlRepository } from 'src/persistance/repositories/url.repository';
import { AliasGeneratorService } from 'src/services/alias.generator.service';
import { CounterIncrementorService } from 'src/services/counter.incrementor.service';
import { UrlService } from 'src/services/url.service';

@Module({})
export class ProvidersModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ProvidersModule,
      imports: [ConfigModule.forRoot(config)], // provide APP_CONFIG dynamically
      providers: [
        CounterRepository,
        CounterIncrementorService,
        AliasGeneratorService,
        UrlRepository,
        UrlService
      ],
      exports: [
        CounterRepository,
        CounterIncrementorService,
        AliasGeneratorService,
        UrlRepository,
        UrlService,
        ConfigModule // export config for other modules
      ]
    };
  }
}
