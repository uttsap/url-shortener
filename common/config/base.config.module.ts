import { DynamicModule, Module, Provider } from '@nestjs/common';
import { BaseConfig } from './contracts';

@Module({})
export class BaseConfigModule {
  static forRoot(config: BaseConfig): DynamicModule {
    const baseConfigProvider: Provider = {
      provide: 'BASE_CONFIG',
      useValue: config
    };

    return {
      module: BaseConfigModule,
      providers: [baseConfigProvider],
      exports: [baseConfigProvider]
    };
  }
}
