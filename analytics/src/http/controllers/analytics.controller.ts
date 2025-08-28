import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { AnalyticsService } from '../../services/analytics.service';
import { AnalyticsQueryDto } from '../requests/analytics-query.request';
import { CreateClickRequest } from '../requests/create-click.request';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('clicks')
  @HttpCode(HttpStatus.CREATED)
  async createClick(@Body(ValidationPipe) createClickDto: CreateClickRequest) {
    return this.analyticsService.createClick(createClickDto);
  }

  @Get('clicks')
  async getClicks(@Query(ValidationPipe) queryDto: AnalyticsQueryDto) {
    return this.analyticsService.getClicks(queryDto);
  }

  @Get('stats')
  async getAnalyticsStats(@Query(ValidationPipe) queryDto: AnalyticsQueryDto) {
    return this.analyticsService.getAnalyticsStats(queryDto);
  }

  @Get('clicks/:urlAlias')
  async getClicksByUrlAlias(@Param('urlAlias') urlAlias: string) {
    return this.analyticsService.getClicksByUrlAlias(urlAlias);
  }

  @Get('metrics')
  async getClickMetrics(@Query('userAlias') userAlias?: string) {
    return this.analyticsService.getClickMetrics(userAlias);
  }

  @Get('metrics/:urlAlias')
  async getClickMetricsByAlias(@Param('urlAlias') urlAlias: string) {
    return this.analyticsService.getClickMetrics(urlAlias);
  }

  @Get('trends/hourly')
  async getHourlyClickTrends(@Query('userAlias') userAlias?: string, @Query('days') days?: number) {
    return this.analyticsService.getHourlyClickTrends(userAlias, days);
  }

  @Get('trends/hourly/:urlAlias')
  async getHourlyClickTrendsByAlias(
    @Param('urlAlias') urlAlias: string,
    @Query('days') days?: number
  ) {
    return this.analyticsService.getHourlyClickTrends(urlAlias, days);
  }

  @Get('referrers')
  async getTopReferrers(@Query('userAlias') userAlias?: string, @Query('limit') limit?: number) {
    return this.analyticsService.getTopReferrers(userAlias, limit);
  }

  @Get('referrers/:urlAlias')
  async getTopReferrersByAlias(
    @Param('urlAlias') urlAlias: string,
    @Query('limit') limit?: number
  ) {
    return this.analyticsService.getTopReferrers(urlAlias, limit);
  }

  @Get('health')
  async healthCheck() {
    return 'Ok';
  }
}
