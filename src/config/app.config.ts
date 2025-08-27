import { INestApplication } from '@nestjs/common';
import { getCurrentStage } from 'lib/env';
import { AppLogger } from 'lib/logger/logger.service';
import { PostgresConnectionOptions } from 'lib/postgres/contracts';
import { PostgresClient } from 'lib/postgres/postgres.client';
import { AppConfig } from './contracts';

export const config: AppConfig = {
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
  shortUrlExpiryTime: parseInt(process.env.SHORT_URL_EXPIRY_TIME || '3600') // defaults to 1 hour
};

export const getPostgresConnectionConfig = async (
  appConfig: Readonly<AppConfig>
): Promise<PostgresConnectionOptions> => {
  if (appConfig.environment === 'dev') {
    return {
      ...appConfig.database.postgres,
      ssl: false
    };
  }
  // Implement scerets manager to get database credentials
  return appConfig.database.postgres;
};

export const onBoot = async (appConfig: Readonly<AppConfig>, app: INestApplication) => {
  await app.get(AppLogger).initialize();

  const dbConnectionOptions = await getPostgresConnectionConfig(appConfig);
  await app.get(PostgresClient).connect(dbConnectionOptions);
};

export const shutdown = async (app: INestApplication) => {
  await app.get(PostgresClient).disconnect();
};
