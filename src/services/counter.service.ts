import { Injectable } from '@nestjs/common';
import { CounterRepository } from 'src/persistance/repositories/counter.repository';

@Injectable()
export class CounterService {
  constructor(private readonly counterRepository: CounterRepository) {}

  public async increment(): Promise<bigint> {
    const shardId = Math.floor(Math.random() * 4) + 1; // pick random shard
    const counter = await this.counterRepository.incrementCounter(shardId);
    const value = BigInt(counter.value);
    // Combine shard + counter → global unique number
    // shift shard id into high bits
    return (BigInt(shardId) << BigInt(48)) | value;
  }
}
