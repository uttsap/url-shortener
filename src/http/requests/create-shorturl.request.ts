import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateShortUrlRequest {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUrl()
  public url: string;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  public alias?: string;
}

export class CreateShortUrlParams extends CreateShortUrlRequest {
  public id?: bigint;
  public createdAt?: Date;
  public expiryTime: Date;
  public clickCount?: number;
}
