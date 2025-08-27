import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppLogger } from 'lib/logger/logger.service';
import { PostgresClient } from 'lib/postgres/postgres.client';
import { ReadQueryRunner, WriteQueryRunner } from 'lib/postgres/postgres.query.runner';

@Injectable()
export abstract class Repository {
  constructor(
    protected readonly db: PostgresClient,
    protected logger: AppLogger
  ) {}

  public inReadTransaction<T>(callback: (client: ReadQueryRunner) => Promise<T>) {
    return this.db.inReadTransaction(callback);
  }

  public inWriteTransaction<T>(callback: (client: WriteQueryRunner) => Promise<T>) {
    return this.db.inWriteTransaction(callback);
  }

  public async create<T>(
    query: string,
    values: unknown[],
    db: WriteQueryRunner = this.db
  ): Promise<T> {
    const result = await db.write<T>(query, values);
    this.assertExactlyOneResult(result);
    return result[0];
  }

  public async find<T>(query: string, values: unknown[], db: ReadQueryRunner = this.db) {
    return db.read<T>(query, values);
  }

  public async findOneOrFail<T>(
    query: string,
    values: unknown[],
    db: ReadQueryRunner = this.db
  ): Promise<T> {
    const result = await db.read<T>(query, values);
    this.assertExactlyOneResult(result);
    return result[0];
  }

  protected assertExists<T>(
    result?: T,
    error: Error = new NotFoundException('Not Found')
  ): asserts result is NonNullable<T> {
    if (!result) {
      this.logger.warn('Expected result to exist');
      throw error;
    }
  }

  protected assertExactlyOneResult<T>(
    result: T[],
    error: Error = new NotFoundException('Not Found')
  ): asserts result is [T] {
    if (result.length !== 1 || !result[0]) {
      this.logger.warn(`Expected exactly one result, got ${result.length}`, {
        stack: error.stack
      });
      throw error;
    }
  }

  protected assertOneOrNoneResults<T>(
    result: T[],
    error: Error = new BadRequestException('Too many results')
  ): asserts result is [] | [T] {
    if (result.length > 1) {
      this.logger.warn(`Expected at most one result, got ${result.length}`);
      throw error;
    }
  }

  protected assertOneOrMoreResult<T extends NonNullable<unknown>>(
    result: Array<NonNullable<T>> | [unknown],
    error: Error = new NotFoundException('Not Found')
  ): asserts result is [T] {
    if (result.length < 1 || !result[0]) {
      this.logger.warn(`Expected at least one or more result, got ${result.length}`, {
        stack: error.stack
      });
      throw error;
    }
  }
}
