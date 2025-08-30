import { baseConfig } from '../../../common/config/base.config';
import { AnalyticsConfig } from './contracts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { redis: _redis, ...rest } = baseConfig;

export const analyticsConfig: AnalyticsConfig = {
  ...rest,
  analyticsPort: parseInt(process.env.ANALYTICS_PORT || '3001'),
  natsEndpoint: process.env.NATS_ENDPOINT || 'nats://localhost:4222',
};
