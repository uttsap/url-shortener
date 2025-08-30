import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppConfigModule } from 'src/config/config.module';
import { AppConfig } from 'src/config/contracts';

@Module({})
export class NatsModule {
  static forRootAsync(config: AppConfig): DynamicModule {
    return {
      module: NatsModule,
      imports: [
        AppConfigModule.forRoot(config),
        ClientsModule.register([
          {
            name: 'ANALYTICS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: [config.natsEndpoint]
            }
          }
        ])
      ],
      exports: [ClientsModule]
    };
  }
}
