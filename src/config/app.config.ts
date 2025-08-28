import { baseConfig } from '../../common/config/base.config';
import { AppConfig } from './contracts';

export const config: AppConfig = {
  ...baseConfig,
  shortUrlExpiryTime: parseInt(process.env.SHORT_URL_EXPIRY_TIME || '3600') // defaults to 1 hour
};
