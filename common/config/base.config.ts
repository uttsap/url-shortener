import { INestApplication, INestMicroservice } from '@nestjs/common';
import { getCurrentStage } from '../../lib/env';
import { AppLogger } from '../../lib/logger/logger.service';
import { PostgresConnectionOptions } from '../../lib/postgres/contracts';
import { PostgresClient } from '../../lib/postgres/postgres.client';
import { BaseConfig } from './contracts';
import { databaseConfigFields, hasRequiredProperties } from '../utils';

export const baseConfig: BaseConfig = {
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      readOnlyHost: process.env.POSTGRES_READ_ONLY_HOST,
      ssl: false
    }
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    tls: process.env.REDIS_TLS !== 'false'
  },
  environment: getCurrentStage(),
};

export const getPostgresConnectionConfig = async (
  config: Readonly<Partial<BaseConfig>>
): Promise<PostgresConnectionOptions | undefined> => {
  if (config.environment === 'dev') {
    return {
      ...config.database?.postgres,
      ssl: false
    };
  }
  // Implement scerets manager to get database credentials
  return config.database?.postgres;
};

export const onBoot = async <T extends Partial<BaseConfig>>(
  config: Readonly<T>,
  app: INestApplication  | INestMicroservice,
): Promise<void> => {
  await app.get(AppLogger).initialize();

  const dbConnectionOptions = await getPostgresConnectionConfig(config);
  if (!dbConnectionOptions || !hasRequiredProperties(dbConnectionOptions, databaseConfigFields)) {
    throw new Error('Missing required database configuration.')
  }
  await app.get(PostgresClient).connect(dbConnectionOptions);
};

export const shutdown = async (app: INestApplication) => {
  await app.get(PostgresClient).disconnect();
};