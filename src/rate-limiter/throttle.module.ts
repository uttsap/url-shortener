import { DynamicModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from 'src/config/config.module';
import { AppConfig } from 'src/config/contracts';
import { ThrottlerStorageRedisService } from './throttle.storage.service';

export class RateLimiterModule {
  static forRootAsync(config: AppConfig): DynamicModule {
    return {
      module: RateLimiterModule,
      imports: [
        AppConfigModule.forRoot(config),
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: config.rateLimiter.ttl,
              limit: config.rateLimiter.limit,
              name: 'ip',
              blockDuration: config.rateLimiter.blockDuration
            }
          ],
          storage: new ThrottlerStorageRedisService(config.redis.url, config.redis.tls)
        })
      ],
      exports: [ThrottlerModule]
    };
  }
}
