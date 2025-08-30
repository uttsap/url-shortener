import { IsIP, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateClickRequest {
  @IsString()
  alias: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsIP()
  ip?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsNumber()
  latency?: number;

  @IsOptional()
  @IsString()
  error?: string;
}
