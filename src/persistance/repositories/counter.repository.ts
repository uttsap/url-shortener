import { Injectable } from '@nestjs/common';
import { WriteQueryRunner } from 'lib/postgres/postgres.query.runner';
import { Counter } from 'src/models/counter';
import { Repository } from '../../../lib/postgres/repository';

@Injectable()
export class CounterRepository extends Repository {
  public async incrementCounter(
    shardId: number,
    transaction: WriteQueryRunner = this.db
  ): Promise<Counter> {
    const result = await transaction.write<Counter>(
      `UPDATE url_shortener.counters SET value = value + 1 WHERE shard_id = $1 RETURNING *`,
      [shardId]
    );
    this.assertExactlyOneResult(result);
    return result[0];
  }
}
