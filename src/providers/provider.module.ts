import { DynamicModule, Module } from '@nestjs/common';
import { GlideCacheService } from 'lib/cache/glide.cache.service';
import { AppConfigModule } from 'src/config/config.module';
import { AppConfig } from 'src/config/contracts';
import { NatsModule } from 'src/nats/nats.module';
import { CounterRepository } from 'src/persistance/repositories/counter.repository';
import { UrlRepository } from 'src/persistance/repositories/url.repository';
import { RateLimiterModule } from 'src/rate-limiter/throttle.module';
import { AliasService } from 'src/services/alias.service';
import { AnalyticsPublisher } from 'src/services/analytics.publisher';
import { CounterService } from 'src/services/counter.service';
import { UrlService } from 'src/services/url.service';

@Module({})
export class ProvidersModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ProvidersModule,
      imports: [
        AppConfigModule.forRoot(config), // provide APP_CONFIG dynamically
        NatsModule.forRootAsync(config),
        RateLimiterModule.forRootAsync(config)
      ],
      providers: [
        CounterRepository,
        CounterService,
        AliasService,
        UrlRepository,
        AnalyticsPublisher,
        GlideCacheService,
        UrlService
      ],
      exports: [
        CounterRepository,
        CounterService,
        AliasService,
        UrlRepository,
        UrlService,
        AnalyticsPublisher,
        GlideCacheService,
        AppConfigModule // export config for other modules
      ]
    };
  }
}
