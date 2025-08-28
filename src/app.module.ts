import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpLoggerMiddleware } from '../common/middleware/http.logger.middleware';
import { CoreModule } from '../common/common.module';
import { config } from './config/app.config';
import { AppController } from './http/controllers/app.controller';
import { UrlController } from './http/controllers/url.controller';
import { ProvidersModule } from './providers/provider.module';

@Module({
  imports: [CoreModule, ProvidersModule.forRoot(config)],
  controllers: [AppController, UrlController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
