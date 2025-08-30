import { DynamicModule, Module } from '@nestjs/common';
import { AppConfigModule } from 'src/config/config.module';
import { AppConfig } from 'src/config/contracts';
import { NatsModule } from 'src/nats/nats.module';
import { CounterRepository } from 'src/persistance/repositories/counter.repository';
import { UrlRepository } from 'src/persistance/repositories/url.repository';
import { AliasService } from 'src/services/alias.service';
import { AnalyticsPublisher } from 'src/services/analytics.publisher';
import { CounterService } from 'src/services/counter.service';
import { UrlService } from 'src/services/url.service';

@Module({})
export class ProvidersModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ProvidersModule,
      imports: [AppConfigModule.forRoot(config), NatsModule.forRootAsync(config)], // provide APP_CONFIG dynamically
      providers: [
        CounterRepository,
        CounterService,
        AliasService,
        UrlRepository,
        AnalyticsPublisher,
        UrlService
      ],
      exports: [
        CounterRepository,
        CounterService,
        AliasService,
        UrlRepository,
        UrlService,
        AnalyticsPublisher,
        AppConfigModule // export config for other modules
      ]
    };
  }
}
