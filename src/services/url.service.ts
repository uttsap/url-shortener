import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AnalyticsPayload } from 'common/contracts/analytics.payload';
import type { Request } from 'express';
import { AppLogger } from 'lib/logger/logger.service';
import type { AppConfig } from 'src/config/contracts';
import {
  CreateShortUrlParams,
  CreateShortUrlRequest
} from 'src/http/requests/create-shorturl.request';
import { ShortUrl } from 'src/models/shorturl';
import { UrlRepository } from 'src/persistance/repositories/url.repository';
import { AliasService } from './alias.service';
import { AnalyticsPublisher } from './analytics.publisher';

@Injectable()
export class UrlService {
  constructor(
    @Inject('APP_CONFIG') private readonly config: AppConfig,
    private readonly logger: AppLogger,
    private readonly urlRepository: UrlRepository,
    private readonly aliasService: AliasService,
    private readonly analyticsPublisher: AnalyticsPublisher
  ) {}

  public async createShortUrl(createShortUrlRequest: CreateShortUrlRequest) {
    this.logger.debug('Creating short URL', { createShortUrlRequest });
    let alias = createShortUrlRequest.alias;
    if (!alias) {
      alias = await this.aliasService.generate();
    }

    const expiryTime = new Date(Date.now() + this.config.shortUrlExpiryTime * 1000);

    const createShortUrlParams: CreateShortUrlParams = {
      ...createShortUrlRequest,
      alias,
      expiryTime
    };
    const shortUrl = await this.urlRepository.save(createShortUrlParams);
    return {
      url: shortUrl.url,
      alias: shortUrl.alias,
      expiryTime: shortUrl.expiryTime
    };
  }

  public async getUrl(alias: string, req: Request) {
    const startTime = Date.now();
    let errorMessage = '';
    let redirectUrl: ShortUrl | null = null;

    const query = `SELECT alias, url, created_at AS "createdAt", expiry_time AS "expiryTime" 
                   FROM url_shortener.urls WHERE alias = $1 LIMIT 1;`;

    try {
      redirectUrl = await this.urlRepository.findOneOrFail<ShortUrl>(query, [alias]);
    } catch (error) {
      errorMessage = error?.message || 'Unknown error';
    }

    const latency = Date.now() - startTime;

    const analyticsPayload: AnalyticsPayload = {
      alias,
      latency,
      error: errorMessage,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
      referrer: req.get('referer') || ''
    };

    // asynchronously publish the analytics payload
    await this.analyticsPublisher.publish(analyticsPayload);

    if (errorMessage || !redirectUrl) {
      throw new HttpException(
        errorMessage || 'Redirect URL not found',
        HttpStatus.NOT_FOUND
      );
    }

    return redirectUrl.url;
  }
}
