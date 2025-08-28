import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AnalyticsConfig } from './contracts';

@Module({})
export class AnalyticsConfigModule {
  static forRoot(config: AnalyticsConfig): DynamicModule {
    const analyticsConfigProvider: Provider = {
      provide: 'ANALYTICS_CONFIG',
      useValue: config,
    };

    return {
      module: AnalyticsConfigModule,
      providers: [analyticsConfigProvider],
      exports: [analyticsConfigProvider],
    };
  }
}
