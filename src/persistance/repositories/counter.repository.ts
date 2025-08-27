import { Injectable } from '@nestjs/common';
import { WriteQueryRunner } from 'lib/postgres/postgres.query.runner';
import { Counter } from 'src/models/counter';
import { Repository } from './repository';

@Injectable()
export class CounterRepository extends Repository {
  async incrementCounter(
    shardId: number,
    transaction?: WriteQueryRunner
  ): Promise<Counter> {
    return this.create<Counter>(
      `UPDATE url_shortener.counters SET value = value + 1 WHERE shard_id = $1 RETURNING *`,
      [shardId],
      transaction
    );
  }
}
