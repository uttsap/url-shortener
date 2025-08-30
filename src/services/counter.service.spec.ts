import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'lib/logger/logger.module';
import { PostgresModule } from 'lib/postgres/postgres.module';
import { onBoot } from '../../common/config/base.config';
import { config } from '../config/app.config';
import { CounterRepository } from '../persistance/repositories/counter.repository';
import { CounterService } from './counter.service';

describe('CounterService', () => {
  let service: CounterService;
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PostgresModule, LoggerModule],
      providers: [CounterService, CounterRepository]
    }).compile();

    app = module.createNestApplication();
    await onBoot(config, app);
    await app.init();

    service = module.get<CounterService>(CounterService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('increment', () => {
    it('should increment counter and return combined shard and counter value', async () => {
      // Mock Math.random to return a predictable value for shardId
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // This will result in shardId = 1

      // Act
      const result = await service.increment();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('bigint');
      expect(result).toBeGreaterThan(0n);

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should handle different shard IDs', async () => {
      const testCases = [
        { randomValue: 0.1, expectedShardId: 1 },
        { randomValue: 0.3, expectedShardId: 2 },
        { randomValue: 0.5, expectedShardId: 3 },
        { randomValue: 0.9, expectedShardId: 4 }
      ];

      for (const testCase of testCases) {
        const originalRandom = Math.random;
        Math.random = jest.fn().mockReturnValue(testCase.randomValue);

        // Act
        const result = await service.increment();

        // Assert
        expect(result).toBeDefined();
        expect(typeof result).toBe('bigint');
        expect(result).toBeGreaterThan(0n);

        Math.random = originalRandom;
      }
    });

    it('should generate unique values for multiple calls', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3); // shardId = 2

      // Act
      const result1 = await service.increment();
      const result2 = await service.increment();
      const result3 = await service.increment();

      // Assert
      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).not.toBe(result3);

      Math.random = originalRandom;
    });

    it('should handle concurrent increments on different shards', async () => {
      const promises = [];

      // Create multiple concurrent increments on different shards
      for (let i = 0; i < 10; i++) {
        const originalRandom = Math.random;
        Math.random = jest.fn().mockReturnValue((i % 4) * 0.25); // Distribute across shards 1-4
        promises.push(service.increment());
        Math.random = originalRandom;
      }

      // Act
      const results = await Promise.all(promises);

      // Assert
      expect(results.length).toBe(10);

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);
    });
  });
});
