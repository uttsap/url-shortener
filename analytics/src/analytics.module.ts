import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CoreModule } from '../../common/common.module';
import { HttpLoggerMiddleware } from '../../common/middleware/http.logger.middleware';
import { analyticsConfig } from './config/analytics.config';
import { AnalyticsController } from './http/controllers/analytics.controller';
import { AnalyticsProvidersModule } from './providers/provider.module';

@Module({
  imports: [CoreModule, AnalyticsProvidersModule.forRoot(analyticsConfig)],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
