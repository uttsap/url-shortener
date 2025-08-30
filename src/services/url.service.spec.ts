import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from 'lib/logger/logger.module';
import { PostgresClient } from 'lib/postgres/postgres.client';
import { PostgresModule } from 'lib/postgres/postgres.module';
import { onBoot } from '../../common/config/base.config';
import { cleanDatabase } from '../../test/utils/test-utils';
import { config } from '../config/app.config';
import { CreateShortUrlRequest } from '../http/requests/create-shorturl.request';
import { NatsModule } from '../nats/nats.module';
import { CounterRepository } from '../persistance/repositories/counter.repository';
import { UrlRepository } from '../persistance/repositories/url.repository';
import { AliasService } from './alias.service';
import { AnalyticsPublisher } from './analytics.publisher';
import { CounterService } from './counter.service';
import { UrlService } from './url.service';

describe('UrlService', () => {
  let service: UrlService;
  let app: INestApplication;
  let postgresClient: PostgresClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PostgresModule, LoggerModule, NatsModule.forRootAsync(config)],
      providers: [
        UrlService,
        AliasService,
        CounterService,
        UrlRepository,
        CounterRepository,
        AnalyticsPublisher,
        {
          provide: 'APP_CONFIG',
          useValue: config
        },
        {
          provide: 'ANALYTICS_SERVICE',
          useValue: {
            emit: jest.fn()
          }
        }
      ]
    }).compile();

    app = module.createNestApplication();
    await onBoot(config, app);
    await app.init();

    service = module.get<UrlService>(UrlService);
    postgresClient = module.get<PostgresClient>(PostgresClient);
    await cleanDatabase(postgresClient);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('createShortUrl', () => {
    it('should create short URL with generated alias when no alias provided', async () => {
      // Arrange
      const createShortUrlRequest: CreateShortUrlRequest = {
        url: 'https://example.com/very-long-url'
      };

      // Mock Math.random to return a predictable value for shardId
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // This will result in shardId = 1

      // Act
      const result = await service.createShortUrl(createShortUrlRequest);

      // Assert
      expect(result).toHaveProperty('url', createShortUrlRequest.url);
      expect(result).toHaveProperty('alias');
      expect(result).toHaveProperty('expiryTime');
      expect(typeof result.alias).toBe('string');
      expect(result.alias?.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('should create short URL with provided alias', async () => {
      // Arrange
      const createShortUrlRequest: CreateShortUrlRequest = {
        url: 'https://example.com/another-long-url',
        alias: `custom-alias-${Date.now()}` // Make it unique
      };

      // Act
      const result = await service.createShortUrl(createShortUrlRequest);

      // Assert
      expect(result).toHaveProperty('url', createShortUrlRequest.url);
      expect(result).toHaveProperty('alias', createShortUrlRequest.alias);
      expect(result).toHaveProperty('expiryTime');
    });

    it('should set correct expiry time based on config', async () => {
      // Arrange
      const createShortUrlRequest: CreateShortUrlRequest = {
        url: 'https://example.com/test-url'
      };

      const startTime = Date.now();

      // Act
      const result = await service.createShortUrl(createShortUrlRequest);

      // Assert
      expect(result).toHaveProperty('expiryTime');
      const expiryTime = new Date(result.expiryTime);
      const expectedExpiryTime = startTime + config.shortUrlExpiryTime * 1000;

      // Allow for small timing differences (within 1 second)
      expect(Math.abs(expiryTime.getTime() - expectedExpiryTime)).toBeLessThan(1000);
    });

    it('should return only required fields in response', async () => {
      // Arrange
      const createShortUrlRequest: CreateShortUrlRequest = {
        url: 'https://example.com/test-url'
      };

      // Act
      const result = await service.createShortUrl(createShortUrlRequest);

      // Assert
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('alias');
      expect(result).toHaveProperty('expiryTime');
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('clickCount');
    });

    it('should create multiple URLs with different aliases', async () => {
      // Arrange
      const timestamp = Date.now();
      const requests = [
        { url: 'https://example.com/url1', alias: `alias1-${timestamp}` },
        { url: 'https://example.com/url2', alias: `alias2-${timestamp}` },
        { url: 'https://example.com/url3' } // No alias, should generate one
      ];

      // Act
      const results = await Promise.all(
        requests.map((req) => service.createShortUrl(req as CreateShortUrlRequest))
      );

      // Assert
      expect(results.length).toBe(3);

      // All URLs should have different aliases
      const aliases = results.map((r) => r.alias);
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(3);
    });

    it('should handle URLs with special characters', async () => {
      // Arrange
      const createShortUrlRequest: CreateShortUrlRequest = {
        url: 'https://example.com/url-with-special-chars?param=value&another=123',
        alias: `special-chars-${Date.now()}`
      };

      // Act
      const result = await service.createShortUrl(createShortUrlRequest);

      // Assert
      expect(result).toHaveProperty('url', createShortUrlRequest.url);
      expect(result).toHaveProperty('alias', createShortUrlRequest.alias);
    });

    it('should handle very long URLs', async () => {
      // Arrange
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      const createShortUrlRequest: CreateShortUrlRequest = {
        url: longUrl,
        alias: `long-url-${Date.now()}`
      };

      // Act
      const result = await service.createShortUrl(createShortUrlRequest);

      // Assert
      expect(result).toHaveProperty('url', longUrl);
      expect(result).toHaveProperty('alias', createShortUrlRequest.alias);
    });
  });
});
