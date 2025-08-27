import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AppConfig } from './contracts';

@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    const configProvider: Provider = {
      provide: 'APP_CONFIG',
      useValue: config
    };

    return {
      module: ConfigModule,
      providers: [configProvider],
      exports: [configProvider]
    };
  }
}
