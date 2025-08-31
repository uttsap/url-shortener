import { Injectable } from '@nestjs/common';
import { PostgresClient } from '../../../../lib/postgres/postgres.client';
import {
  AnalyticsQueryDto,
  AnalyticsStatsResponse,
} from '../../http/requests/analytics-query.request';
import { Click, CreateClickParams } from '../../models/click.model';

@Injectable()
export class ClickRepository {
  constructor(private readonly postgresClient: PostgresClient) {}

  async createClick(data: CreateClickParams): Promise<Click> {
    const query = `
      INSERT INTO url_shortener.clicks (url_alias, user_agent, ip, referrer, latency, error)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, url_alias as alias, timestamp, user_agent as "userAgent", ip, referrer, latency, error
    `;

    const values = [data.alias, data.userAgent, data.ip, data.referrer, data.latency, data.error];

    const result = await this.postgresClient.write<Click>(query, values);
    return result[0];
  }

  async findClicks(queryDto: AnalyticsQueryDto): Promise<Click[]> {
    let query = `
      SELECT id, url_alias as alias, timestamp, user_agent as "userAgent", ip, referrer, latency, error
      FROM url_shortener.clicks
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramCount = 0;

    if (queryDto.alias) {
      paramCount++;
      query += ` AND url_alias = $${paramCount}`;
      values.push(queryDto.alias);
    }

    if (queryDto.startDate) {
      paramCount++;
      query += ` AND timestamp >= $${paramCount}`;
      values.push(queryDto.startDate);
    }

    if (queryDto.endDate) {
      paramCount++;
      query += ` AND timestamp <= $${paramCount}`;
      values.push(queryDto.endDate);
    }

    query += ` ORDER BY timestamp DESC`;

    if (queryDto.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(queryDto.limit);
    }

    if (queryDto.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(queryDto.offset);
    }

    const result = await this.postgresClient.read<Click>(query, values);
    return result;
  }

  async getAnalyticsStats(queryDto: AnalyticsQueryDto): Promise<AnalyticsStatsResponse> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (queryDto.alias) {
      paramCount++;
      whereClause += ` AND url_alias = $${paramCount}`;
      values.push(queryDto.alias);
    }

    if (queryDto.startDate) {
      paramCount++;
      whereClause += ` AND timestamp >= $${paramCount}`;
      values.push(queryDto.startDate);
    }

    if (queryDto.endDate) {
      paramCount++;
      whereClause += ` AND timestamp <= $${paramCount}`;
      values.push(queryDto.endDate);
    }

    // Get basic stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip) as unique_ips,
        AVG(latency) as avg_latency,
        CASE 
          WHEN COUNT(*) = 0 THEN 0.0
          ELSE COUNT(CASE WHEN error IS NOT NULL THEN 1 END)::float / COUNT(*)::float
        END as error_rate
      FROM url_shortener.clicks
      ${whereClause}
    `;

    // Get clicks by hour
    const clicksByHourQuery = `
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as count
      FROM url_shortener.clicks
      ${whereClause}
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
      LIMIT 24
    `;

    // Get top referrers
    const topReferrersQuery = `
      SELECT 
        COALESCE(referrer, 'Direct') as referrer,
        COUNT(*) as count
      FROM url_shortener.clicks
      ${whereClause}
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT 10
    `;

    const [statsResult, clicksByHourResult, topReferrersResult] = await Promise.all([
      this.postgresClient.read(statsQuery, values),
      this.postgresClient.read(clicksByHourQuery, values),
      this.postgresClient.read(topReferrersQuery, values),
    ]);

    return {
      totalClicks: parseInt(statsResult[0].total_clicks as string),
      uniqueIps: parseInt(statsResult[0].unique_ips as string),
      avgLatency: parseFloat(statsResult[0].avg_latency as string) || 0,
      errorRate: parseFloat(statsResult[0].error_rate as string) || 0,
      clicksByHour: clicksByHourResult.map((row) => ({
        hour: row.hour as string,
        count: parseInt(row.count as string),
      })),
      topReferrers: topReferrersResult.map((row) => ({
        referrer: row.referrer as string,
        count: parseInt(row.count as string),
      })),
    };
  }

  async getClicksByUrlAlias(urlAlias: string): Promise<Click[]> {
    const query = `
      SELECT id, url_alias as alias, timestamp, user_agent as "userAgent", ip, referrer, latency, error
      FROM url_shortener.clicks
      WHERE url_alias = $1
      ORDER BY timestamp DESC
    `;

    const result = await this.postgresClient.read<Click>(query, [urlAlias]);
    return result;
  }
}
