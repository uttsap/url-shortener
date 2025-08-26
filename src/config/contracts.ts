import { EnvironmentStage } from 'lib/env';
import type { PostgresConnectionOptions } from '../../lib/postgres/contracts';

export interface HasEnvironmentConfig {
  environment: EnvironmentStage;
}

export interface HasPostgresDatabaseConnectionConfig {
  database: {
    postgres: PostgresConnectionOptions;
  };
}

export interface HasRedisClientConfig {
  redis: {
    url: string;
    tls: boolean;
  };
}

/**
 * Exports the composition of various configuration interfaces
 * as a single application-wide configuration type.
 */
export type AppConfig = HasPostgresDatabaseConnectionConfig &
  HasRedisClientConfig &
  HasEnvironmentConfig;
