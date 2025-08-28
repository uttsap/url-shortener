# Analytics Microservice Integration Guide

## Overview

This analytics microservice can be integrated with your main URL shortener application in several ways:

## 1. Standalone HTTP Service

Run the analytics microservice as a separate service and communicate via HTTP API.

### Setup
```bash
cd analytics
npm install
cp .env.example .env
# Configure your environment variables
npm run start:dev
```

### Integration in Main Application

```typescript
// In your main URL shortener service
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UrlService {
  private readonly analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3001';

  async redirectUrl(alias: string, req: Request) {
    const startTime = Date.now();
    
    try {
      // Your redirect logic here
      const originalUrl = await this.getOriginalUrl(alias);
      
      // Record analytics asynchronously
      this.recordClick(alias, req, Date.now() - startTime);
      
      return originalUrl;
    } catch (error) {
      // Record error analytics
      this.recordClick(alias, req, Date.now() - startTime, error.message);
      throw error;
    }
  }

  private async recordClick(alias: string, req: Request, latency: number, error?: string) {
    try {
      await axios.post(`${this.analyticsUrl}/api/v1/analytics/clicks`, {
        url_alias: alias,
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        referrer: req.headers.referer,
        latency,
        error
      });
    } catch (err) {
      // Handle analytics recording error (don't let it affect main flow)
      console.error('Failed to record analytics:', err.message);
    }
  }
}
```

## 2. Direct Module Integration

Import the analytics module directly into your main application.

```typescript
// app.module.ts in your main application
import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/src/modules/analytics.module';

@Module({
  imports: [
    // Your other modules
    AnalyticsModule
  ],
  // ...
})
export class AppModule {}
```

```typescript
// In your service
import { Injectable } from '@nestjs/common';
import { AnalyticsService } from './analytics/src/services/analytics.service';

@Injectable()
export class UrlService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async redirectUrl(alias: string, req: Request) {
    const startTime = Date.now();
    
    try {
      const originalUrl = await this.getOriginalUrl(alias);
      
      // Record analytics directly
      await this.analyticsService.createClick({
        url_alias: alias,
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        referrer: req.headers.referer,
        latency: Date.now() - startTime
      });
      
      return originalUrl;
    } catch (error) {
      await this.analyticsService.createClick({
        url_alias: alias,
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        referrer: req.headers.referer,
        latency: Date.now() - startTime,
        error: error.message
      });
      throw error;
    }
  }
}
```

## 3. Event-Driven Integration (Recommended for High Traffic)

Use message queues for asynchronous analytics processing.

```typescript
// In your main application
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UrlService {
  constructor(private eventEmitter: EventEmitter2) {}

  async redirectUrl(alias: string, req: Request) {
    const startTime = Date.now();
    
    try {
      const originalUrl = await this.getOriginalUrl(alias);
      
      // Emit event for analytics
      this.eventEmitter.emit('url.clicked', {
        url_alias: alias,
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        referrer: req.headers.referer,
        latency: Date.now() - startTime,
        timestamp: new Date()
      });
      
      return originalUrl;
    } catch (error) {
      this.eventEmitter.emit('url.clicked', {
        url_alias: alias,
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        referrer: req.headers.referer,
        latency: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }
}
```

## 4. Analytics Dashboard Integration

Create endpoints in your main application that proxy to the analytics service:

```typescript
// analytics-proxy.controller.ts in your main app
import { Controller, Get, Query, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics/src/services/analytics.service';

@Controller('dashboard/analytics')
export class AnalyticsDashboardController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stats')
  async getStats(@Query() query: any) {
    return this.analyticsService.getAnalyticsStats(query);
  }

  @Get('metrics/:urlAlias')
  async getMetrics(@Param('urlAlias') urlAlias: string) {
    return this.analyticsService.getClickMetrics(urlAlias);
  }

  @Get('trends/:urlAlias')
  async getTrends(@Param('urlAlias') urlAlias: string, @Query('days') days?: number) {
    return this.analyticsService.getHourlyClickTrends(urlAlias, days);
  }
}
```

## Environment Configuration

Add these to your main application's environment:

```env
# Analytics Service Configuration
ANALYTICS_SERVICE_URL=http://localhost:3001
ANALYTICS_ENABLED=true
ANALYTICS_ASYNC=true

# Database (if using direct integration)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=url_shortener
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
```

## Performance Considerations

### For High Traffic Applications:

1. **Use Asynchronous Recording**: Don't let analytics slow down URL redirects
2. **Batch Processing**: Consider batching analytics events
3. **Caching**: Cache frequently accessed analytics data
4. **Separate Database**: Use read replicas for analytics queries

```typescript
// Example: Batch processing
@Injectable()
export class AnalyticsBatchProcessor {
  private clickQueue: any[] = [];
  private readonly batchSize = 100;
  private readonly flushInterval = 5000; // 5 seconds

  constructor(private analyticsService: AnalyticsService) {
    setInterval(() => this.flushQueue(), this.flushInterval);
  }

  addClick(clickData: any) {
    this.clickQueue.push(clickData);
    
    if (this.clickQueue.length >= this.batchSize) {
      this.flushQueue();
    }
  }

  private async flushQueue() {
    if (this.clickQueue.length === 0) return;
    
    const batch = this.clickQueue.splice(0, this.batchSize);
    
    try {
      await Promise.all(
        batch.map(click => this.analyticsService.createClick(click))
      );
    } catch (error) {
      console.error('Failed to process analytics batch:', error);
      // Consider adding to dead letter queue for retry
    }
  }
}
```

## Testing Integration

```typescript
// Test the analytics integration
import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics/src/services/analytics.service';

describe('Analytics Integration', () => {
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AnalyticsService, /* other dependencies */],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should record click analytics', async () => {
    const clickData = {
      url_alias: 'test123',
      user_agent: 'Mozilla/5.0...',
      ip: '127.0.0.1',
      referrer: 'https://google.com',
      latency: 150
    };

    const result = await analyticsService.createClick(clickData);
    
    expect(result).toBeDefined();
    expect(result.url_alias).toBe('test123');
  });
});
```

## Monitoring and Health Checks

The analytics service provides a health check endpoint:

```bash
curl http://localhost:3001/api/v1/analytics/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "analytics"
}
```

Include this in your main application's health checks for comprehensive monitoring. 