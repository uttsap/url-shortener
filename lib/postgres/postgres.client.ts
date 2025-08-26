import { Pool, PoolConfig, QueryResultRow } from "pg";
import { AnyReleasableQueryRunner, PostgresReadQueryRunner, PostgresWriteQueryRunner, ReadQueryRunner, WriteQueryRunner } from "./postgres.query.runner";
import { AppLogger } from "lib/logger/logger.service";
import { PostgresConnectionOptions } from "./contracts";
import assert from "assert";
import { ModelConstructor } from "lib/postgres/models/BaseModel";
import { Injectable } from "@nestjs/common";

export enum TransactionIsolationLevel {
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE'
}

type TransactionCallback<QueryRunnerType, R> = (runner: QueryRunnerType) => Promise<R>;

@Injectable()
export class PostgresClient implements WriteQueryRunner, ReadQueryRunner {
  private readOnlyPool?: Pool;

  private writePool?: Pool;

  constructor(private readonly logger: AppLogger) {

  }

  public async connect(config: PostgresConnectionOptions) {
    this.assertIsNotConnected(this.readOnlyPool);
    this.assertIsNotConnected(this.writePool);
    this.validateConfig(config);

    // Overwrite the host property with the readOnlyHost for the readOnlyPool
    const readOnlyConfig = {
      ...config,
      host: config.readOnlyHost
    };

    this.writePool = this.connectPool(config);
    this.readOnlyPool = this.connectPool(readOnlyConfig);

    await this.assertConnected();
  }

  public disconnect() {
    return Promise.all([this.readOnlyPool?.end(), this.writePool?.end()]);
  }

  public async read<ResultType extends QueryResultRow>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]> {
    this.assertIsConnected(this.readOnlyPool);
    const client = await this.readOnlyPool.connect();
    const runner = new PostgresReadQueryRunner(client);
    try {
      return await runner.read<ResultType>(queryOrModel, queryOrParams, params);
    } finally {
      client.release();
    }
  }

  public async write<ResultType extends QueryResultRow>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]> {
    this.assertIsConnected(this.writePool);
    const client = await this.writePool.connect();
    const runner = new PostgresWriteQueryRunner(client);
    try {
      return await runner.write<ResultType>(queryOrModel, queryOrParams, params);
    } finally {
      client.release();
    }
  }

  public async inReadTransaction<T>(callback: (runner: ReadQueryRunner) => Promise<T>) {
    this.assertIsConnected(this.readOnlyPool);
    const client = await this.readOnlyPool.connect();
    const runner = new PostgresReadQueryRunner(client);
    return this.transaction(runner, callback);
  }

  public async inWriteTransaction<T>(
    callback: (client: WriteQueryRunner) => Promise<T>
  ): Promise<T> {
    this.assertIsConnected(this.writePool);
    const client = await this.writePool.connect();
    const runner = new PostgresWriteQueryRunner(client);
    return this.transaction<T, WriteQueryRunner>(runner, callback);
  }
  private async transaction<R, QueryRunnerType extends AnyReleasableQueryRunner>(
    runner: QueryRunnerType,
    isolationLevel: TransactionIsolationLevel,
    callback: TransactionCallback<QueryRunnerType, R>
  ): Promise<R>;
  private async transaction<R, QueryRunnerType extends AnyReleasableQueryRunner>(
    runner: QueryRunnerType,
    callback: TransactionCallback<QueryRunnerType, R>
  ): Promise<R>;
  private async transaction<R, QueryRunnerType extends AnyReleasableQueryRunner>(
    runner: QueryRunnerType,
    callbackOrIsolationLevel:
      | TransactionIsolationLevel
      | TransactionCallback<QueryRunnerType, R>,
    callbackFn?: (runner: QueryRunnerType) => Promise<R>
  ): Promise<R> {
    const [isolationLevel, callback] = this.getOverloadedTransactionParameters(
      callbackOrIsolationLevel,
      callbackFn
    );

    if (!runner.release) {
      throw new Error('Query runner needs to be releasable');
    }

    if (!Object.values(TransactionIsolationLevel).includes(isolationLevel)) {
      throw new Error(`Invalid isolation level: ${isolationLevel}`);
    }

    try {
      this.logger.debug('Beginning transaction');
      await runner.read('BEGIN');
      await runner.read(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      this.logger.debug('Transaction started');
      const result = await callback(runner);
      this.logger.debug('Committing transaction');
      await runner.read('COMMIT');
      this.logger.debug('Transaction committed');
      return result;
    } catch (error) {
      assert(error instanceof Error);
      this.logger.debug('Rolling back transaction', { error: error.message });
      await runner.read('ROLLBACK');
      throw error;
    } finally {
      runner.release();
    }
  }

  private connectPool(connectionOptions: PoolConfig) {
    const pool = new Pool(connectionOptions);
    const host = connectionOptions.host;
    pool.on('error', (error) => {
      this.logger.error('Postgres Pool error', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        host
      });
      throw error;
    });
    pool.on('connect', () => {
      this.logger.debug('Postgres Pool connected', { host });
    });
    pool.on('acquire', () => {
      this.logger.debug('Postgres Client acquired', { host });
    });
    pool.on('release', () => {
      this.logger.debug('Postgres Client released', { host });
    });
    pool.on('remove', () => {
      this.logger.debug('Postgres Pool removed', { host });
    });

    return pool;
  }

  private validateConfig(config: PostgresConnectionOptions) {
    if (!config.host) {
      throw new Error('Postgres host not configured');
    }
    if (!config.readOnlyHost) {
      throw new Error('Postgres readOnlyHost not configured');
    }
    if (!config.database) {
      throw new Error('Postgres database not configured');
    }
    if (!config.user) {
      throw new Error('Postgres user not configured');
    }
    if (!config.password) {
      throw new Error('Postgres password not configured');
    }
    if (!config.ssl) {
      this.logger.warn('Unencrypted connection to Postgres');
    }
  }

  private getOverloadedTransactionParameters<Q, R>(
    callbackOrIsolationLevel: TransactionIsolationLevel | TransactionCallback<Q, R>,
    callback?: TransactionCallback<Q, R>
  ): [TransactionIsolationLevel, TransactionCallback<Q, R>] {
    if (typeof callbackOrIsolationLevel === 'function') {
      return [TransactionIsolationLevel.REPEATABLE_READ, callbackOrIsolationLevel];
    }

    if (callback === undefined) {
      throw new Error('Callback function is required');
    }

    return [callbackOrIsolationLevel, callback];
  }

  private assertIsConnected(pool: Pool | undefined): asserts pool is Pool {
    if (pool === undefined) {
      throw new Error('PostgresClient not initialized');
    }
  }

  private assertIsNotConnected(pool: Pool | undefined): asserts pool is undefined {
    if (pool !== undefined) {
      throw new Error('PostgresClient already connected');
    }
  }

  /** 
   * Throws an error if the pools are not connected by running a test query
   */
  private async assertConnected(): Promise<void> {
    if (!this.writePool) {
      throw new Error('Write pool is not initialized');
    }
    if (!this.readOnlyPool) {
      throw new Error('Read-only pool is not initialized');
    }

    try {
      // Run a lightweight query to ensure writePool is alive
      await this.writePool.query('SELECT 1');
    } catch (err) {
      throw new Error('Write pool is not connected: ' + (err as Error).message);
    }

    try {
      // Run a lightweight query to ensure readOnlyPool is alive
      await this.readOnlyPool.query('SELECT 1');
    } catch (err) {
      throw new Error('Read-only pool is not connected: ' + (err as Error).message);
    }
  }
}
