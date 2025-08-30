import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AnalyticsPayload } from 'common/contracts/analytics.payload';

@Injectable()
export class AnalyticsPublisher {
  constructor(@Inject('ANALYTICS_SERVICE') private readonly client: ClientProxy) {}

  async publish(payload: AnalyticsPayload) {
    this.client.emit('analytics.click', payload);
  }
}
