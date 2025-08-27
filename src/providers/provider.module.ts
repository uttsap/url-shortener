import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { AppConfig } from 'src/config/contracts';
import { CounterRepository } from 'src/persistance/repositories/counter.repository';
import { UrlRepository } from 'src/persistance/repositories/url.repository';
import { AliasService } from 'src/services/alias.service';
import { CounterService } from 'src/services/counter.service';
import { UrlService } from 'src/services/url.service';

@Module({})
export class ProvidersModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ProvidersModule,
      imports: [ConfigModule.forRoot(config)], // provide APP_CONFIG dynamically
      providers: [
        CounterRepository,
        CounterService,
        AliasService,
        UrlRepository,
        UrlService
      ],
      exports: [
        CounterRepository,
        CounterService,
        AliasService,
        UrlRepository,
        UrlService,
        ConfigModule // export config for other modules
      ]
    };
  }
}
