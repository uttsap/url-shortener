import { BaseConfig } from 'common/config/contracts';

/**
 * Exports the composition of various configuration interfaces
 * as a single application-wide configuration type.
 */
export type AppConfig = BaseConfig & {
  shortUrlExpiryTime: number; // in seconds
  natsEndpoint: string;
};
