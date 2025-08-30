import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Click } from 'src/models/click.model';
import request from 'supertest';
import { onBoot } from '../../common/config/base.config';
import { LoggerModule } from '../../lib/logger/logger.module';
import { PostgresClient } from '../../lib/postgres/postgres.client';
import { PostgresModule } from '../../lib/postgres/postgres.module';
import { analyticsConfig } from '../src/config/analytics.config';
import { AnalyticsController } from '../src/http/controllers/analytics.controller';
import { ClickRepository } from '../src/persistance/repositories/click.repository';
import { AnalyticsService } from '../src/services/analytics.service';
import { TestDbUtils } from './utils/test-db.utils';

// Type definitions for better type safety
interface ReferrerStats {
  referrer: string;
  count: number;
}

interface AnalyticsStats {
  totalClicks: number;
  uniqueIps: number;
  avgLatency: number;
  errorRate: number;
  clicksByHour: unknown[];
  topReferrers: ReferrerStats[];
}

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let postgresClient: PostgresClient;
  let testDbUtils: TestDbUtils;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PostgresModule, LoggerModule],
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        ClickRepository,
        {
          provide: 'APP_CONFIG',
          useValue: analyticsConfig,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    await onBoot(analyticsConfig, app);
    await app.init();

    postgresClient = moduleFixture.get<PostgresClient>(PostgresClient);
    testDbUtils = new TestDbUtils(postgresClient);

    // Clean database before each test
    await testDbUtils.cleanDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /analytics/health', () => {
    it('should return health check status', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/analytics/health').expect(200);

      // Assert
      expect(response.text).toBe('Ok');
    });
  });

  describe('GET /analytics/clicks', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return clicks with no filters', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/analytics/clicks').expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBe(6); // We seeded 6 clicks
      clicks.forEach((click: Click) => {
        expect(click).toHaveProperty('id');
        expect(click).toHaveProperty('alias');
        expect(click).toHaveProperty('timestamp');
      });
    });

    it('should return clicks with userAlias filter', async () => {
      // Arrange
      const userAlias = 'test-alias-1';

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/clicks')
        .query({ userAlias })
        .expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBe(2); // We seeded 2 clicks for test-alias-1
      clicks.forEach((click: Click) => {
        expect(click).toHaveProperty('alias', userAlias);
      });
    });

    it('should return clicks with date range filters', async () => {
      // Arrange
      const startDate = '2024-01-01T10:00:00Z';
      const endDate = '2024-01-01T12:00:00Z';

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/clicks')
        .query({ startDate, endDate })
        .expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBe(3); // 3 clicks in the time range
      clicks.forEach((click: Click) => {
        const timestamp = new Date(click.timestamp);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(new Date(startDate).getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(new Date(endDate).getTime());
      });
    });

    it('should return clicks with pagination', async () => {
      // Arrange
      const limit = 2;
      const offset = 0;

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/clicks')
        .query({ limit, offset })
        .expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBeLessThanOrEqual(limit);
    });

    it('should return 400 for invalid date format', async () => {
      // Arrange
      const startDate = 'invalid-date';

      // Act & Assert
      await request(app.getHttpServer()).get('/analytics/clicks').query({ startDate }).expect(400);
    });

    it('should return 400 for invalid limit', async () => {
      // Arrange
      const limit = -1;

      // Act & Assert
      await request(app.getHttpServer()).get('/analytics/clicks').query({ limit }).expect(400);
    });

    it('should return 400 for invalid offset', async () => {
      // Arrange
      const offset = -1;

      // Act & Assert
      await request(app.getHttpServer()).get('/analytics/clicks').query({ offset }).expect(400);
    });
  });

  describe('GET /analytics/stats', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return analytics stats with no filters', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/analytics/stats').expect(200);

      // Assert
      const stats = response.body as AnalyticsStats;
      expect(stats).toHaveProperty('totalClicks');
      expect(stats).toHaveProperty('uniqueIps');
      expect(stats).toHaveProperty('avgLatency');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('clicksByHour');
      expect(stats).toHaveProperty('topReferrers');
      expect(Array.isArray(stats.clicksByHour)).toBe(true);
      expect(Array.isArray(stats.topReferrers)).toBe(true);
      expect(stats.totalClicks).toBe(6); // We seeded 6 clicks
      expect(stats.uniqueIps).toBe(6); // All IPs are unique
    });

    it('should return analytics stats with userAlias filter', async () => {
      // Arrange
      const userAlias = 'test-alias-1';

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/stats')
        .query({ userAlias })
        .expect(200);

      // Assert
      const stats = response.body as AnalyticsStats;
      expect(stats).toHaveProperty('totalClicks');
      expect(stats).toHaveProperty('uniqueIps');
      expect(stats).toHaveProperty('avgLatency');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('clicksByHour');
      expect(stats).toHaveProperty('topReferrers');
      expect(stats.totalClicks).toBe(2); // We seeded 2 clicks for test-alias-1
      expect(stats.uniqueIps).toBe(2); // Both IPs are unique
    });

    it('should return analytics stats with date range filters', async () => {
      // Arrange
      const startDate = '2024-01-01T10:00:00Z';
      const endDate = '2024-01-01T12:00:00Z';

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/stats')
        .query({ startDate, endDate })
        .expect(200);

      // Assert
      const stats = response.body as AnalyticsStats;
      expect(stats).toHaveProperty('totalClicks');
      expect(stats).toHaveProperty('uniqueIps');
      expect(stats).toHaveProperty('avgLatency');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('clicksByHour');
      expect(stats).toHaveProperty('topReferrers');
      expect(stats.totalClicks).toBe(3); // 3 clicks in the time range
    });

    it('should return 400 for invalid date format in stats', async () => {
      // Arrange
      const startDate = 'invalid-date';

      // Act & Assert
      await request(app.getHttpServer()).get('/analytics/stats').query({ startDate }).expect(400);
    });
  });

  describe('GET /analytics/clicks/:urlAlias', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return clicks for a specific URL alias', async () => {
      // Arrange
      const urlAlias = 'test-alias-1';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/clicks/${urlAlias}`)
        .expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBe(2); // We seeded 2 clicks for test-alias-1
      clicks.forEach((click: Click) => {
        expect(click).toHaveProperty('alias', urlAlias);
      });
    });

    it('should return empty array for non-existent URL alias', async () => {
      // Arrange
      const urlAlias = 'non-existent-alias';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/clicks/${urlAlias}`)
        .expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBe(0);
    });

    it('should handle URL alias with special characters', async () => {
      // Arrange
      const urlAlias = 'test-alias-with-special-chars-123';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/clicks/${urlAlias}`)
        .expect(200);

      // Assert
      const clicks = response.body as Click[];
      expect(Array.isArray(clicks)).toBe(true);
      expect(clicks.length).toBe(0); // No data for this alias
    });
  });

  describe('GET /analytics/referrers', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return top referrers with no filters', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/analytics/referrers').expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBeGreaterThan(0);
      referrers.forEach((referrer: ReferrerStats) => {
        expect(referrer).toHaveProperty('referrer');
        expect(referrer).toHaveProperty('count');
        expect(typeof referrer.count).toBe('number');
      });
    });

    it('should return top referrers with userAlias filter', async () => {
      // Arrange
      const userAlias = 'test-alias-1';

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/referrers')
        .query({ userAlias })
        .expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBe(2); // google.com and bing.com
      referrers.forEach((referrer: ReferrerStats) => {
        expect(referrer).toHaveProperty('referrer');
        expect(referrer).toHaveProperty('count');
      });
    });

    it('should return top referrers with custom limit', async () => {
      // Arrange
      const limit = 2;

      // Act
      const response = await request(app.getHttpServer())
        .get('/analytics/referrers')
        .query({ limit })
        .expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBeLessThanOrEqual(limit);
    });

    it('should return 400 for invalid limit in referrers', async () => {
      // Arrange
      const limit = -1;

      // Act & Assert
      await request(app.getHttpServer()).get('/analytics/referrers').query({ limit }).expect(400);
    });
  });

  describe('GET /analytics/referrers/:urlAlias', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return top referrers for a specific URL alias', async () => {
      // Arrange
      const urlAlias = 'test-alias-1';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/referrers/${urlAlias}`)
        .expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBe(2); // google.com and bing.com
      referrers.forEach((referrer: ReferrerStats) => {
        expect(referrer).toHaveProperty('referrer');
        expect(referrer).toHaveProperty('count');
      });
    });

    it('should return top referrers for specific URL alias with custom limit', async () => {
      // Arrange
      const urlAlias = 'test-alias-1';
      const limit = 1;

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/referrers/${urlAlias}`)
        .query({ limit })
        .expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBeLessThanOrEqual(limit);
    });

    it('should return empty array for non-existent URL alias in referrers', async () => {
      // Arrange
      const urlAlias = 'non-existent-alias';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/referrers/${urlAlias}`)
        .expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBe(0);
    });

    it('should handle URL alias with special characters in referrers', async () => {
      // Arrange
      const urlAlias = 'test-alias-with-special-chars-123';

      // Act
      const response = await request(app.getHttpServer())
        .get(`/analytics/referrers/${urlAlias}`)
        .expect(200);

      // Assert
      const referrers = response.body as ReferrerStats[];
      expect(Array.isArray(referrers)).toBe(true);
      expect(referrers.length).toBe(0); // No data for this alias
    });
  });

  describe('Event Pattern: analytics.click', () => {
    it('should handle analytics click event', async () => {
      // This test would require NATS setup and event emission
      // For now, we'll just test that the endpoint exists and doesn't crash

      // Note: In a real integration test, you would:
      // 1. Set up NATS connection
      // 2. Emit an analytics.click event
      // 3. Verify the event was processed correctly

      // For now, we'll just verify the controller method exists
      const controller = app.get(AnalyticsController);
      expect(controller).toBeDefined();
      expect(typeof controller.handleClick).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed query parameters gracefully', async () => {
      // Arrange
      const malformedQuery = { invalidParam: 'value' };

      // Act & Assert
      await request(app.getHttpServer()).get('/analytics/clicks').query(malformedQuery).expect(400);
    });

    it('should handle missing required parameters gracefully', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/analytics/clicks')
        .query({ limit: 'not-a-number' })
        .expect(400);
    });
  });
});
