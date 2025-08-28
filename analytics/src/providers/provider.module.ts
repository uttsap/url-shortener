import { DynamicModule, Module } from '@nestjs/common';
import { AnalyticsConfigModule } from '../config/config.module';
import { AnalyticsConfig } from '../config/contracts';
import { ClickRepository } from '../persistance/repositories/click.repository';
import { AnalyticsService } from '../services/analytics.service';

@Module({})
export class AnalyticsProvidersModule {
  static forRoot(config: AnalyticsConfig): DynamicModule {
    return {
      module: AnalyticsProvidersModule,
      imports: [AnalyticsConfigModule.forRoot(config)], // provide APP_CONFIG dynamically
      providers: [ClickRepository, AnalyticsService],
      exports: [
        ClickRepository,
        AnalyticsService,
        AnalyticsConfigModule, // export config for other modules
      ],
    };
  }
}
