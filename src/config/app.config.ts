import { AppLogger } from 'lib/logger/logger.service';
import { AppConfig } from './contracts';
import { INestApplication } from '@nestjs/common';
import { PostgresClient } from 'lib/postgres/postgres.client';
import { getCurrentStage } from 'lib/env';
import { PostgresConnectionOptions } from 'lib/postgres/contracts';

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
  environment: getCurrentStage()
};

export const onBoot = async (appConfig: Readonly<AppConfig>, app: INestApplication) => {
  await app.get(AppLogger).initialize();

  const dbConnectionOptions = await getPostgresConnectionConfig(appConfig);
  await app.get(PostgresClient).connect(dbConnectionOptions);
};

export const shutdown = async (app: INestApplication) => {
  await app.get(PostgresClient).disconnect();
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
