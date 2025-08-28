import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AppConfig } from './contracts';

@Module({})
export class AppConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    const appConfigProvider: Provider = {
      provide: 'APP_CONFIG',
      useValue: config
    };

    return {
      module: AppConfigModule,
      providers: [appConfigProvider],
      exports: [appConfigProvider]
    };
  }
}
