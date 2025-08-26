import type { PoolConfig } from 'pg';

export type PostgresConnectionOptions = PoolConfig & {
  readOnlyHost?: string;
  ssl:
    | false
    | {
        rejectUnauthorized: false;
        ca: string;
      };
};
