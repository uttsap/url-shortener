import { EnvironmentStage } from 'lib/env';
import { PostgresConnectionOptions } from 'lib/postgres/contracts';


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

export type PostgresConfigKeys = keyof HasPostgresDatabaseConnectionConfig["database"]["postgres"];


/**
 * Exports the composition of various configuration interfaces
 * as a base configuration type.
 */
export type BaseConfig = HasPostgresDatabaseConnectionConfig &
  HasRedisClientConfig &
  HasEnvironmentConfig