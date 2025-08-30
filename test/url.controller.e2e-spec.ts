// Mock the GlideCacheService module to avoid open handle issues
jest.mock('../lib/cache/glide.cache.service', () => ({
  GlideCacheService: jest.fn().mockImplementation(() => ({
    setCache: jest.fn().mockResolvedValue({ success: true }),
    getCache: jest.fn().mockResolvedValue({ success: false, data: null }),
    delCache: jest.fn().mockResolvedValue({ success: true }),
    flushAll: jest.fn().mockResolvedValue({ success: true }),
    destroy: jest.fn().mockResolvedValue(undefined)
  }))
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { onBoot } from '../common/config/base.config';
import { GlideCacheService } from '../lib/cache/glide.cache.service';
import { LoggerModule } from '../lib/logger/logger.module';
import { PostgresModule } from '../lib/postgres/postgres.module';
import { config } from '../src/config/app.config';
import { UrlController } from '../src/http/controllers/url.controller';
import { NatsModule } from '../src/nats/nats.module';
import { CounterRepository } from '../src/persistance/repositories/counter.repository';
import { UrlRepository } from '../src/persistance/repositories/url.repository';
import { AliasService } from '../src/services/alias.service';
import { AnalyticsPublisher } from '../src/services/analytics.publisher';
import { CounterService } from '../src/services/counter.service';
import { UrlService } from '../src/services/url.service';

describe('UrlController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PostgresModule, LoggerModule, NatsModule.forRootAsync(config)],
      controllers: [UrlController],
      providers: [
        UrlService,
        AliasService,
        CounterService,
        UrlRepository,
        CounterRepository,
        AnalyticsPublisher,
        GlideCacheService,
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
      })
    );

    await onBoot(config, app);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /shorten', () => {
    it('should create a short URL without custom alias', async () => {
      // Arrange
      const createShortUrlDto = {
        url: 'https://example.com/very-long-url-that-needs-shortening'
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('url', createShortUrlDto.url);
      expect(response.body).toHaveProperty('alias');
      expect(response.body).toHaveProperty('expiryTime');
      expect(typeof response.body.alias).toBe('string');
      expect(response.body.alias.length).toBeGreaterThan(0);
    });

    it('should create a short URL with custom alias', async () => {
      // Arrange
      const createShortUrlDto = {
        url: 'https://example.com/another-long-url',
        alias: `custom-alias-${Date.now()}` // Make it unique
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('url', createShortUrlDto.url);
      expect(response.body).toHaveProperty('alias', createShortUrlDto.alias);
      expect(response.body).toHaveProperty('expiryTime');
    });

    it('should return 400 for invalid URL', async () => {
      // Arrange
      const createShortUrlDto = {
        url: 'not-a-valid-url'
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(400);
    });

    it('should return 400 for missing URL', async () => {
      // Arrange
      const createShortUrlDto = {
        alias: 'test-alias'
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(400);
    });

    it('should return 400 for empty URL', async () => {
      // Arrange
      const createShortUrlDto = {
        url: ''
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(400);
    });

    it('should handle URLs with whitespace', async () => {
      // Arrange
      const createShortUrlDto = {
        url: '  https://example.com/trimmed-url  '
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('url', 'https://example.com/trimmed-url');
    });

    it('should handle custom alias with whitespace', async () => {
      // Arrange
      const createShortUrlDto = {
        url: 'https://example.com/test',
        alias: `  trimmed-alias-${Date.now()}  ` // Make it unique
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty(
        'alias',
        'trimmed-alias-' + createShortUrlDto.alias.split('-')[2].trim()
      );
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
      const responses = await Promise.all(
        requests.map((req) =>
          request(app.getHttpServer()).post('/shorten').send(req).expect(201)
        )
      );

      // Assert
      expect(responses.length).toBe(3);

      // All URLs should have different aliases
      const aliases = responses.map((r) => r.body.alias);
      const uniqueAliases = new Set(aliases);
      expect(uniqueAliases.size).toBe(3);
    });

    it('should handle duplicate aliases gracefully', async () => {
      // Arrange
      const createShortUrlDto = {
        url: 'https://example.com/first-url',
        alias: `duplicate-alias-${Date.now()}` // Make it unique
      };

      // Create first URL
      await request(app.getHttpServer())
        .post('/shorten')
        .send(createShortUrlDto)
        .expect(201);

      // Try to create second URL with same alias
      const secondUrlDto = {
        url: 'https://example.com/second-url',
        alias: createShortUrlDto.alias // Use the same alias
      };

      // Act & Assert - should fail due to duplicate alias
      await request(app.getHttpServer()).post('/shorten').send(secondUrlDto).expect(500); // Database constraint violation
    });
  });
});
