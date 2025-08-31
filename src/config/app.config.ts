import { baseConfig } from '../../common/config/base.config';
import { AppConfig } from './contracts';

export const config: AppConfig = {
  ...baseConfig,
  shortUrlExpiryTime: parseInt(process.env.SHORT_URL_EXPIRY_TIME || '3600'), // defaults to 1 hour,
  natsEndpoint: process.env.NATS_ENDPOINT || 'nats://localhost:4222',
  rateLimiter: {
    ttl: parseInt(process.env.RATE_LIMITER_TTL || '60'),
    limit: parseInt(process.env.RATE_LIMITER_LIMIT || '10'),
    blockDuration: parseInt(process.env.RATE_LIMITER_BLOCK_DURATION || '30')
  }
};
