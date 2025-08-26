import type { PoolClient, QueryResultRow } from 'pg';
import type { ModelConstructor } from '../../src/models/BaseModel.js';
import { Injectable } from '@nestjs/common';

export interface ReleasableQueryRunner {
  release(): void;
}

export interface ReadQueryRunner {
  read<ResultType>(query: string, params?: unknown[]): Promise<ResultType[]>;
  read<ResultType>(
    model: ModelConstructor<ResultType>,
    query: string,
    params?: unknown[]
  ): Promise<ResultType[]>;
  read<ResultType>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]>;
}

export interface WriteQueryRunner extends ReadQueryRunner {
  write<ResultType>(query: string, params?: unknown[]): Promise<ResultType[]>;
  write<ResultType>(
    model: ModelConstructor<ResultType>,
    query: string,
    params?: unknown[]
  ): Promise<ResultType[]>;
  write<ResultType>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]>;
}

export type OnConflictClause =
  | { action: 'DO_NOTHING' }
  | {
      action: 'DO_UPDATE';
      conflictColumns: string[];
      updateColumns?: string[]; // optional: default to all
    };

export interface BulkQueryBuilderParams<T> {
  tableName: string;
  columns: Array<keyof T>;
  rows: T[];
  returning?: string[]; // optional: default to "*"
  onConflict?: OnConflictClause;
}

export interface BulkQueryBuilderResult {
  sql: string;
  values: unknown[];
}

@Injectable()
export abstract class PostgresQueryRunner implements ReleasableQueryRunner {
  constructor(private readonly client: PoolClient) {}

  public release() {
    this.client.release();
  }

  public async query<ResultType extends QueryResultRow>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]> {
    const { query, model, parameters } = this.getOverloadedQueryParameters(
      queryOrModel,
      queryOrParams,
      params
    );

    const result = await this.client.query<ResultType>(query, parameters);

    // If no model has been passed, return the raw record result.
    if (!model) {
      return result.rows;
    }

    return result.rows.map((row) => new model(row));
  }

  protected getOverloadedQueryParameters<T>(
    queryOrModel: string | T,
    queryOrParams: string | unknown[] | undefined,
    parameters: unknown[] | undefined
  ): { query: string; model: T | undefined; parameters: unknown[] | undefined } {
    // If the first parameter is not the query string, the second needs to be a string.
    if (typeof queryOrModel !== 'string') {
      if (typeof queryOrParams !== 'string') {
        throw new Error('Either first or second parameter needs to be a query string');
      }
      return { query: queryOrParams, model: queryOrModel, parameters };
    }

    // If the first one is a query string, make sure that the second one is an array
    if (typeof queryOrParams === 'string') {
      throw new Error('Second parameter needs to be an array of parameters');
    }

    return { query: queryOrModel, model: undefined, parameters: queryOrParams };
  }
}

@Injectable()
export class PostgresReadQueryRunner
  extends PostgresQueryRunner
  implements ReadQueryRunner
{
  public async read<ResultType extends QueryResultRow>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]> {
    return this.query(queryOrModel, queryOrParams, params);
  }
}

@Injectable()
export class PostgresWriteQueryRunner
  extends PostgresReadQueryRunner
  implements WriteQueryRunner
{
  public async write<ResultType extends QueryResultRow>(
    queryOrModel: string | ModelConstructor<ResultType>,
    queryOrParams?: string | unknown[],
    params?: unknown[]
  ): Promise<ResultType[]> {
    return this.query(queryOrModel, queryOrParams, params);
  }
}
export type QueryRunner = WriteQueryRunner | ReadQueryRunner;
export type AnyReleasableQueryRunner = QueryRunner & Partial<ReleasableQueryRunner>;
