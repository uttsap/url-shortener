# URL Shortener Analytics Microservice

A NestJS-based microservice for handling analytics data for the URL shortener application.

## Features

- **Click Tracking**: Record and store click analytics for shortened URLs
- **Analytics Dashboard**: Get detailed statistics and metrics
- **Time-based Analytics**: View hourly, daily, weekly, and monthly trends
- **Referrer Analysis**: Track traffic sources and referrers
- **Real-time Metrics**: Get instant click counts and performance data

## API Endpoints

### Core Analytics
- `POST /api/v1/analytics/clicks` - Record a new click
- `GET /api/v1/analytics/clicks` - Get click data with filters
- `GET /api/v1/analytics/clicks/:urlAlias` - Get clicks for specific URL
- `GET /api/v1/analytics/stats` - Get aggregated statistics

### Metrics
- `GET /api/v1/analytics/metrics` - Get click metrics (total, today, week, month)
- `GET /api/v1/analytics/metrics/:urlAlias` - Get metrics for specific URL

### Trends
- `GET /api/v1/analytics/trends/hourly` - Get hourly click trends
- `GET /api/v1/analytics/trends/hourly/:urlAlias` - Get hourly trends for specific URL

### Referrers
- `GET /api/v1/analytics/referrers` - Get top referrers
- `GET /api/v1/analytics/referrers/:urlAlias` - Get referrers for specific URL

### Health Check
- `GET /api/v1/analytics/health` - Service health check

## Installation

1. Navigate to the analytics directory:
   ```bash
   cd analytics
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Ensure the database is running and migrations are applied

## Running the Service

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANALYTICS_PORT` | Port for the analytics service | `3001` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | Database name | `url_shortener` |
| `DATABASE_USER` | Database user | `postgres` |
| `DATABASE_PASSWORD` | Database password | |
| `NODE_ENV` | Environment stage | `development` |
| `CORS_ORIGIN` | CORS origin | `*` |

## Architecture

The analytics microservice follows a clean architecture pattern:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data processing
- **Repositories**: Data access layer
- **Models**: Data structures and interfaces
- **DTOs**: Data transfer objects for API validation

## Database Schema

The service uses the `clicks` table in the `url_shortener` schema:

```sql
CREATE TABLE url_shortener.clicks (
    id BIGSERIAL PRIMARY KEY,
    url_alias TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_agent TEXT,
    ip INET,
    referrer TEXT,
    latency BIGINT,
    error TEXT
);
```

## Usage Examples

### Record a Click
```bash
curl -X POST http://localhost:3001/api/v1/analytics/clicks \
  -H "Content-Type: application/json" \
  -d '{
    "url_alias": "abc123",
    "user_agent": "Mozilla/5.0...",
    "ip": "192.168.1.1",
    "referrer": "https://google.com",
    "latency": 150
  }'
```

### Get Analytics Stats
```bash
curl "http://localhost:3001/api/v1/analytics/stats?url_alias=abc123&start_date=2024-01-01"
```

### Get Click Metrics
```bash
curl "http://localhost:3001/api/v1/analytics/metrics/abc123"
```

## Integration

This microservice is designed to work with the main URL shortener application. It can be used as:

1. **Standalone Service**: Run independently and communicate via HTTP API
2. **Library Integration**: Import modules directly in other NestJS applications
3. **Event-Driven**: Integrate with message queues for real-time analytics

## Development

### Code Structure
```
src/
├── controllers/          # API controllers
├── services/            # Business logic
├── repositories/        # Data access
├── models/             # Data models
├── dto/                # Data transfer objects
├── modules/            # NestJS modules
├── config/             # Configuration
└── main.ts             # Application bootstrap
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting
```bash
npm run lint
``` 