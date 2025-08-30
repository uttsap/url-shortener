import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'lib/logger/logger.module';
import { PostgresModule } from 'lib/postgres/postgres.module';
import { onBoot } from '../../common/config/base.config';
import { config } from '../config/app.config';
import { CounterRepository } from '../persistance/repositories/counter.repository';
import { AliasService } from './alias.service';
import { CounterService } from './counter.service';

describe('AliasService', () => {
  let service: AliasService;
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PostgresModule, LoggerModule],
      providers: [AliasService, CounterService, CounterRepository]
    }).compile();

    app = module.createNestApplication();
    await onBoot(config, app);
    await app.init();

    service = module.get<AliasService>(AliasService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('generate', () => {
    it('should generate an alias using counter and base62 encoding', async () => {
      // Mock Math.random to return a predictable value for shardId
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // This will result in shardId = 1

      // Act
      const result = await service.generate();

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should generate different aliases for different calls', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3); // shardId = 2

      // Act
      const result1 = await service.generate();
      const result2 = await service.generate();
      const result3 = await service.generate();

      // Assert
      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).not.toBe(result3);

      Math.random = originalRandom;
    });

    it('should generate aliases across different shards', async () => {
      const aliases = [];
      const shardIds = [1, 2, 3, 4];

      for (const shardId of shardIds) {
        const originalRandom = Math.random;
        Math.random = jest.fn().mockReturnValue((shardId - 1) * 0.25); // Map to correct shard

        const alias = await service.generate();
        aliases.push(alias);

        Math.random = originalRandom;
      }

      // Assert
      expect(aliases.length).toBe(4);

      // All aliases should be different
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(4);
    });

    it('should generate valid base62 encoded aliases', async () => {
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // shardId = 1

      // Act
      const result = await service.generate();

      // Assert
      // Base62 alphabet: 0-9, A-Z, a-z
      const base62Regex = /^[0-9A-Za-z]+$/;
      expect(result).toMatch(base62Regex);
      expect(result.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('should handle concurrent alias generation', async () => {
      const promises = [];

      // Create multiple concurrent alias generations
      for (let i = 0; i < 10; i++) {
        const originalRandom = Math.random;
        Math.random = jest.fn().mockReturnValue((i % 4) * 0.25); // Distribute across shards
        promises.push(service.generate());
        Math.random = originalRandom;
      }

      // Act
      const results = await Promise.all(promises);

      // Assert
      expect(results.length).toBe(10);

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(10);

      // All results should be valid base62 strings
      const base62Regex = /^[0-9A-Za-z]+$/;
      results.forEach((alias) => {
        expect(alias).toMatch(base62Regex);
        expect(alias.length).toBeGreaterThan(0);
      });
    });
  });
});
