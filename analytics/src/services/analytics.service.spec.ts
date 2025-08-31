import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { onBoot } from '../../../common/config/base.config';
import { LoggerModule } from '../../../lib/logger/logger.module';
import { PostgresClient } from '../../../lib/postgres/postgres.client';
import { PostgresModule } from '../../../lib/postgres/postgres.module';
import { TestDbUtils } from '../../test/utils/test-db.utils';
import { analyticsConfig } from '../config/analytics.config';
import { AnalyticsQueryDto } from '../http/requests/analytics-query.request';
import { CreateClickRequest } from '../http/requests/create-click.request';
import { ClickRepository } from '../persistance/repositories/click.repository';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let postgresClient: PostgresClient;
  let testDbUtils: TestDbUtils;
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PostgresModule, LoggerModule],
      providers: [
        AnalyticsService,
        ClickRepository,
        {
          provide: 'APP_CONFIG',
          useValue: analyticsConfig,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await onBoot(analyticsConfig, app);
    await app.init();

    service = module.get<AnalyticsService>(AnalyticsService);
    postgresClient = module.get<PostgresClient>(PostgresClient);
    testDbUtils = new TestDbUtils(postgresClient);

    // Clean database before each test
    await testDbUtils.cleanDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('createClick', () => {
    it('should create a click with all required fields', async () => {
      // Arrange
      const createClickRequest: CreateClickRequest = {
        alias: 'test-alias',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip: '192.168.1.1',
        referrer: 'https://google.com',
        latency: 150,
        error: undefined,
      };

      // Act
      const result = await service.createClick(createClickRequest);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('alias', createClickRequest.alias);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('userAgent', createClickRequest.userAgent);
      expect(result).toHaveProperty('ip', createClickRequest.ip);
      expect(result).toHaveProperty('referrer', createClickRequest.referrer);
      expect(result).toHaveProperty('latency', createClickRequest.latency?.toString());
      expect(result).toHaveProperty('error', createClickRequest.error || null);

      // Verify it was actually saved to database
      const clickCount = await testDbUtils.getClickCount();
      expect(clickCount).toBe(1);
    });

    it('should create a click with minimal required fields', async () => {
      // Arrange
      const createClickRequest: CreateClickRequest = {
        alias: 'minimal-alias',
      };

      // Act
      const result = await service.createClick(createClickRequest);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('alias', createClickRequest.alias);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('userAgent', null);
      expect(result).toHaveProperty('ip', null);
      expect(result).toHaveProperty('referrer', null);
      expect(result).toHaveProperty('latency', null);
      expect(result).toHaveProperty('error', null);

      // Verify it was actually saved to database
      const clickCount = await testDbUtils.getClickCount();
      expect(clickCount).toBe(1);
    });

    it('should create a click with error information', async () => {
      // Arrange
      const createClickRequest: CreateClickRequest = {
        alias: 'error-alias',
        userAgent: 'Test Browser',
        ip: '10.0.0.1',
        error: 'Connection timeout',
      };

      // Act
      const result = await service.createClick(createClickRequest);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('alias', createClickRequest.alias);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('userAgent', createClickRequest.userAgent);
      expect(result).toHaveProperty('ip', createClickRequest.ip);
      expect(result).toHaveProperty('error', createClickRequest.error);

      // Verify it was actually saved to database
      const clickCount = await testDbUtils.getClickCount();
      expect(clickCount).toBe(1);
    });

    it('should create multiple clicks for the same alias', async () => {
      // Arrange
      const alias = 'multi-click-alias';
      const clicks = [
        { alias, userAgent: 'Browser 1', ip: '192.168.1.1' },
        { alias, userAgent: 'Browser 2', ip: '192.168.1.2' },
        { alias, userAgent: 'Browser 3', ip: '192.168.1.3' },
      ];

      // Act
      const results = await Promise.all(
        clicks.map((click) => service.createClick(click as CreateClickRequest))
      );

      // Assert
      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result).toHaveProperty('alias', alias);
        expect(result).toHaveProperty('userAgent', clicks[index].userAgent);
        expect(result).toHaveProperty('ip', clicks[index].ip);
      });

      // Verify all were saved to database
      const clickCount = await testDbUtils.getClickCount();
      expect(clickCount).toBe(3);
    });
  });

  describe('getClicks', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return clicks with no filters', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {};

      // Act
      const result = await service.getClicks(queryDto);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((click) => {
        expect(click).toHaveProperty('id');
        expect(click).toHaveProperty('alias');
        expect(click).toHaveProperty('timestamp');
      });
    });

    it('should return clicks with userAlias filter', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        alias: 'test-alias-1',
      };

      // Act
      const result = await service.getClicks(queryDto);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // We seeded 2 clicks for test-alias-1
      result.forEach((click) => {
        expect(click).toHaveProperty('alias', 'test-alias-1');
      });
    });

    it('should return clicks with date range filters', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T12:00:00Z',
      };

      // Act
      const result = await service.getClicks(queryDto);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        result.forEach((click) => {
          const timestamp = new Date(click.timestamp);
          expect(timestamp.getTime()).toBeGreaterThanOrEqual(
            new Date('2024-01-01T10:00:00Z').getTime()
          );
          expect(timestamp.getTime()).toBeLessThanOrEqual(
            new Date('2024-01-01T12:00:00Z').getTime()
          );
        });
      }
    });

    it('should return clicks with pagination', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        limit: 2,
        offset: 0,
      };

      // Act
      const result = await service.getClicks(queryDto);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for non-existent alias', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        alias: 'non-existent-alias',
      };

      // Act
      const result = await service.getClicks(queryDto);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getAnalyticsStats', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return analytics stats with no filters', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {};

      // Act
      const result = await service.getAnalyticsStats(queryDto);

      // Assert
      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('uniqueIps');
      expect(result).toHaveProperty('avgLatency');
      expect(result).toHaveProperty('errorRate');
      expect(result).toHaveProperty('clicksByHour');
      expect(result).toHaveProperty('topReferrers');
      expect(Array.isArray(result.clicksByHour)).toBe(true);
      expect(Array.isArray(result.topReferrers)).toBe(true);
      expect(result.totalClicks).toBe(6); // We seeded 6 clicks
      expect(result.uniqueIps).toBe(6); // All IPs are unique
    });

    it('should return analytics stats with userAlias filter', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        alias: 'test-alias-1',
      };

      // Act
      const result = await service.getAnalyticsStats(queryDto);

      // Assert
      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('uniqueIps');
      expect(result).toHaveProperty('avgLatency');
      expect(result).toHaveProperty('errorRate');
      expect(result).toHaveProperty('clicksByHour');
      expect(result).toHaveProperty('topReferrers');
      expect(result.totalClicks).toBe(2); // We seeded 2 clicks for test-alias-1
      expect(result.uniqueIps).toBe(2); // Both IPs are unique
    });

    it('should return analytics stats with date range filters', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T12:00:00Z',
      };

      // Act
      const result = await service.getAnalyticsStats(queryDto);

      // Assert
      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('uniqueIps');
      expect(result).toHaveProperty('avgLatency');
      expect(result).toHaveProperty('errorRate');
      expect(result).toHaveProperty('clicksByHour');
      expect(result).toHaveProperty('topReferrers');
      expect(result.totalClicks).toBeGreaterThan(0); // Should have some clicks in the time range
    });

    it('should return correct error rate for clicks with errors', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {
        alias: 'error-alias',
      };

      // Act
      const result = await service.getAnalyticsStats(queryDto);

      // Assert
      expect(result).toHaveProperty('errorRate');
      expect(result.errorRate).toBe(1.0); // Both clicks for error-alias have errors
      expect(result.totalClicks).toBe(2);
    });
  });

  describe('getClicksByUrlAlias', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return clicks for a specific URL alias', async () => {
      // Arrange
      const urlAlias = 'test-alias-1';

      // Act
      const result = await service.getClicksByUrlAlias(urlAlias);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // We seeded 2 clicks for test-alias-1
      result.forEach((click) => {
        expect(click).toHaveProperty('alias', urlAlias);
      });
    });

    it('should return empty array for non-existent URL alias', async () => {
      // Arrange
      const urlAlias = 'non-existent-alias';

      // Act
      const result = await service.getClicksByUrlAlias(urlAlias);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return clicks ordered by timestamp descending', async () => {
      // Arrange
      const urlAlias = 'test-alias-1';

      // Act
      const result = await service.getClicksByUrlAlias(urlAlias);

      // Assert
      expect(result.length).toBe(2);
      const firstTimestamp = new Date(result[0].timestamp);
      const secondTimestamp = new Date(result[1].timestamp);
      expect(firstTimestamp.getTime()).toBeGreaterThanOrEqual(secondTimestamp.getTime());
    });
  });

  describe('getTopReferrers', () => {
    beforeEach(async () => {
      // Seed sample data
      await testDbUtils.seedSampleData();
    });

    it('should return top referrers with default limit', async () => {
      // Act
      const result = await service.getTopReferrers();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10); // Default limit is 10
      if (result.length > 0) {
        result.forEach((referrer) => {
          expect(referrer).toHaveProperty('referrer');
          expect(referrer).toHaveProperty('count');
          expect(typeof referrer.count).toBe('number');
        });
      }
    });

    it('should return top referrers with custom limit', async () => {
      // Arrange
      const limit = 3;

      // Act
      const result = await service.getTopReferrers(undefined, limit);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it('should return top referrers for specific URL alias', async () => {
      // Arrange
      const urlAlias = 'test-alias-1';

      // Act
      const result = await service.getTopReferrers(urlAlias);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      // Should have referrers for test-alias-1 (google.com and bing.com)
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent URL alias', async () => {
      // Arrange
      const urlAlias = 'non-existent-alias';

      // Act
      const result = await service.getTopReferrers(urlAlias);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle referrers with null values as "Direct"', async () => {
      // Arrange
      const urlAlias = 'test-alias-2'; // This has one click with null referrer

      // Act
      const result = await service.getTopReferrers(urlAlias);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      const directReferrer = result.find((r) => r.referrer === 'Direct');
      expect(directReferrer).toBeDefined();
    });
  });
});
