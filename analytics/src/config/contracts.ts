import { BaseConfig } from '../../../common/config/contracts';

export interface AnalyticsConfig extends Omit<BaseConfig, 'redis'> {
  analyticsPort: number;
}
