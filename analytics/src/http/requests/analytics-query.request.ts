import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  userAlias?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class ReferrersQueryDto {
  @IsOptional()
  @IsString()
  userAlias?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}

export class AnalyticsStatsResponse {
  totalClicks: number;
  uniqueIps: number;
  avgLatency?: number;
  errorRate?: number;
  clicksByHour: Array<{ hour: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
}
