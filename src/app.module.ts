import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpLoggerMiddleware } from 'lib/middleware/http-logger-middleware';
import { config } from './config/app.config';
import { CoreModule } from './core/core.module';
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
