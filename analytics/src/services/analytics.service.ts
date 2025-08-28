import { Injectable } from '@nestjs/common';
import {
  AnalyticsQueryDto,
  AnalyticsStatsResponse,
} from '../http/requests/analytics-query.request';
import { CreateClickRequest } from '../http/requests/create-click.request';
import { Click, CreateClickParams } from '../models/click.model';
import { ClickRepository } from '../persistance/repositories/click.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly clickRepository: ClickRepository) {}

  async createClick(createClickDto: CreateClickRequest): Promise<Click> {
    const clickData: CreateClickParams = {
      userAlias: createClickDto.userAlias,
      userAgent: createClickDto.userAgent,
      ip: createClickDto.ip,
      referrer: createClickDto.referrer,
      latency: createClickDto.latency,
      error: createClickDto.error,
    };

    return this.clickRepository.createClick(clickData);
  }

  async getClicks(queryDto: AnalyticsQueryDto): Promise<Click[]> {
    return this.clickRepository.findClicks(queryDto);
  }

  async getAnalyticsStats(queryDto: AnalyticsQueryDto): Promise<AnalyticsStatsResponse> {
    return this.clickRepository.getAnalyticsStats(queryDto);
  }

  async getClicksByUrlAlias(urlAlias: string): Promise<Click[]> {
    return this.clickRepository.getClicksByUrlAlias(urlAlias);
  }

  async getClickMetrics(urlAlias?: string): Promise<{
    totalClicks: number;
    clicksToday: number;
    clicksThisWeek: number;
    clicksThisMonth: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const queries = [
      { userAlias: urlAlias }, // All time
      { userAlias: urlAlias, startDate: startOfDay.toISOString() }, // Today
      { userAlias: urlAlias, startDate: startOfWeek.toISOString() }, // This week
      { userAlias: urlAlias, startDate: startOfMonth.toISOString() }, // This month
    ];

    const results = await Promise.all(
      queries.map((query) => this.clickRepository.getAnalyticsStats(query))
    );

    return {
      totalClicks: results[0].totalClicks,
      clicksToday: results[1].totalClicks,
      clicksThisWeek: results[2].totalClicks,
      clicksThisMonth: results[3].totalClicks,
    };
  }

  async getHourlyClickTrends(
    urlAlias?: string,
    days: number = 7
  ): Promise<Array<{ hour: string; count: number }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const queryDto: AnalyticsQueryDto = {
      userAlias: urlAlias,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    const stats = await this.clickRepository.getAnalyticsStats(queryDto);
    return stats.clicksByHour;
  }

  async getTopReferrers(
    urlAlias?: string,
    limit: number = 10
  ): Promise<Array<{ referrer: string; count: number }>> {
    const queryDto: AnalyticsQueryDto = { userAlias: urlAlias };
    const stats = await this.clickRepository.getAnalyticsStats(queryDto);
    return stats.topReferrers.slice(0, limit);
  }
}
