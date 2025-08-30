import { PostgresClient } from 'lib/postgres/postgres.client';

export interface TestClickData {
  alias: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  latency?: number;
  error?: string;
  timestamp?: Date;
}

export class TestDbUtils {
  constructor(private readonly postgresClient: PostgresClient) {}

  async seedClicks(clicks: TestClickData[]): Promise<void> {
    if (clicks.length === 0) return;

    const values = clicks
      .map((click, index) => {
        const baseIndex = index * 7;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`;
      })
      .join(', ');

    const query = `
      INSERT INTO url_shortener.clicks (url_alias, user_agent, ip, referrer, latency, error, timestamp)
      VALUES ${values}
    `;

    const flatValues = clicks.flatMap((click) => [
      click.alias,
      click.userAgent || null,
      click.ip || null,
      click.referrer || null,
      click.latency || null,
      click.error || null,
      click.timestamp || new Date(),
    ]);

    await this.postgresClient.write(query, flatValues);
  }

  async seedSampleData(): Promise<void> {
    const sampleClicks: TestClickData[] = [
      {
        alias: 'test-alias-1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip: '192.168.1.1',
        referrer: 'https://google.com',
        latency: 100,
        error: undefined,
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        alias: 'test-alias-1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ip: '192.168.1.2',
        referrer: 'https://bing.com',
        latency: 150,
        error: undefined,
        timestamp: new Date('2024-01-01T11:00:00Z'),
      },
      {
        alias: 'test-alias-2',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ip: '192.168.1.3',
        referrer: 'https://facebook.com',
        latency: 200,
        error: undefined,
        timestamp: new Date('2024-01-01T12:00:00Z'),
      },
      {
        alias: 'test-alias-2',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        ip: '192.168.1.4',
        referrer: undefined,
        latency: 80,
        error: undefined,
        timestamp: new Date('2024-01-01T13:00:00Z'),
      },
      {
        alias: 'error-alias',
        userAgent: 'Test Browser',
        ip: '10.0.0.1',
        referrer: 'https://twitter.com',
        latency: 500,
        error: 'Connection timeout',
        timestamp: new Date('2024-01-01T14:00:00Z'),
      },
      {
        alias: 'error-alias',
        userAgent: 'Test Browser',
        ip: '10.0.0.2',
        referrer: undefined,
        latency: 300,
        error: 'DNS resolution failed',
        timestamp: new Date('2024-01-01T15:00:00Z'),
      },
    ];

    await this.seedClicks(sampleClicks);
  }

  async seedClicksForSpecificAlias(alias: string, count: number = 5): Promise<void> {
    const clicks: TestClickData[] = [];

    for (let i = 0; i < count; i++) {
      clicks.push({
        alias,
        userAgent: `Browser ${i + 1}`,
        ip: `192.168.1.${i + 1}`,
        referrer: i % 2 === 0 ? `https://referrer${i}.com` : undefined,
        latency: 100 + i * 10,
        error: i % 3 === 0 ? `Error ${i}` : undefined,
        timestamp: new Date(`2024-01-01T${10 + i}:00:00Z`),
      });
    }

    await this.seedClicks(clicks);
  }

  async seedClicksWithDateRange(
    alias: string,
    startDate: Date,
    endDate: Date,
    count: number = 10
  ): Promise<void> {
    const clicks: TestClickData[] = [];
    const timeDiff = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startDate.getTime() + (timeDiff * i) / count);
      clicks.push({
        alias,
        userAgent: `Browser ${i + 1}`,
        ip: `192.168.1.${i + 1}`,
        referrer: i % 2 === 0 ? `https://referrer${i}.com` : undefined,
        latency: 100 + i * 10,
        error: i % 3 === 0 ? `Error ${i}` : undefined,
        timestamp,
      });
    }

    await this.seedClicks(clicks);
  }

  async cleanDatabase(): Promise<void> {
    const query = `
      DELETE FROM url_shortener.clicks;
    `;
    await this.postgresClient.write(query);
  }

  async getClickCount(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM url_shortener.clicks';
    const result = await this.postgresClient.read(query);
    return parseInt(result[0].count as string);
  }
}
