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
      alias: createClickDto.alias,
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

  async getTopReferrers(
    urlAlias?: string,
    limit: number = 10
  ): Promise<Array<{ referrer: string; count: number }>> {
    const queryDto: AnalyticsQueryDto = { userAlias: urlAlias };
    const stats = await this.clickRepository.getAnalyticsStats(queryDto);
    return stats.topReferrers.slice(0, limit);
  }
}
