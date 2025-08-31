import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppLogger } from 'lib/logger/logger.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsQueryDto, ReferrersQueryDto } from '../requests/analytics-query.request';
import { CreateClickRequest } from '../requests/create-click.request';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly logger: AppLogger,
    private readonly analyticsService: AnalyticsService
  ) {}

  @EventPattern('analytics.click')
  async handleClick(@Payload() data: CreateClickRequest) {
    this.logger.debug('Analytics event received:', data);
    await this.analyticsService.createClick(data);
  }

  @Get('clicks')
  async getClicks(@Query(ValidationPipe) queryDto: AnalyticsQueryDto) {
    return this.analyticsService.getClicks(queryDto);
  }

  @Get('stats')
  async getAnalyticsStats(@Query(ValidationPipe) queryDto: AnalyticsQueryDto) {
    return this.analyticsService.getAnalyticsStats(queryDto);
  }

  @Get('referrers')
  async getTopReferrers(@Query(ValidationPipe) queryDto: ReferrersQueryDto) {
    return this.analyticsService.getTopReferrers(queryDto.alias, queryDto.limit);
  }

  @Get('health')
  async healthCheck() {
    return 'Ok';
  }
}
