import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnalyticsPayload } from 'common/contracts/analytics.payload';
import type { Request } from 'express';
import { CachedJson } from 'lib/cache/contracts/cache.response';
import { GlideCacheService } from 'lib/cache/glide.cache.service';
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
    private readonly analyticsPublisher: AnalyticsPublisher,
    private readonly cacheService: GlideCacheService
  ) {}

  // deletes url that reached expiry time
  @Cron('0 * * * *') // runs every hour
  public async deleteExpiredUrls() {
    const expiredUrls = await this.urlRepository.deleteExpiredUrls();
    this.logger.debug(`Deleted ${expiredUrls.length} expired URLs`);
    await Promise.all(
      expiredUrls.map((alias) => this.cacheService.delCache(`url:${alias}`))
    );
  }

  /**
   * Creates a new short URL with optional alias.
   */
  public async createShortUrl(request: CreateShortUrlRequest) {
    this.logger.debug('Creating short URL', { request });

    const alias = request.alias ?? (await this.aliasService.generate());
    const expiryTime = this.calculateExpiryTime();

    const params: CreateShortUrlParams = { ...request, alias, expiryTime };
    const shortUrl = await this.urlRepository.save(params);

    return { url: shortUrl.url, alias: shortUrl.alias, expiryTime: shortUrl.expiryTime };
  }

  /**
   * Resolves the alias to the original URL.
   */
  public async getUrl(alias: string, req: Request): Promise<string> {
    const startTime = Date.now();
    let redirectUrl: ShortUrl | null = null;
    let errorMessage = '';

    try {
      redirectUrl = await this.getUrlFromCacheOrDb(alias);
    } catch (error) {
      errorMessage = (error as Error)?.message ?? 'Unknown error';
    }

    const latency = Date.now() - startTime;
    await this.publishAnalytics(alias, req, latency, errorMessage);

    if (!redirectUrl) {
      throw new HttpException(
        errorMessage || 'Redirect URL not found',
        HttpStatus.NOT_FOUND
      );
    }

    return redirectUrl.url;
  }

  private calculateExpiryTime(): Date {
    return new Date(Date.now() + this.config.shortUrlExpiryTime * 1000);
  }

  private async getUrlFromCacheOrDb(alias: string): Promise<ShortUrl | null> {
    // Check cache first
    const cached = await this.getUrlFromCache(alias);
    if (cached) {
      this.logger.debug(`Found in cache: ${alias}`);
      return cached;
    }

    // Fallback to DB
    this.logger.debug(`Not found in cache, checking db: ${alias}`);
    const fromDb = await this.getUrlFromDatabase(alias);
    if (fromDb) {
      this.logger.debug(`Found in db: ${alias}`);
      await this.saveUrlToCache(alias, fromDb);
    }

    return fromDb;
  }

  private async getUrlFromDatabase(alias: string): Promise<ShortUrl | null> {
    const query = `
      SELECT alias, url, created_at AS "createdAt", expiry_time AS "expiryTime" 
      FROM url_shortener.urls 
      WHERE alias = $1 
      LIMIT 1;
    `;
    return this.urlRepository.findOneOrFail<ShortUrl>(query, [alias]);
  }

  private async saveUrlToCache(alias: string, url: ShortUrl): Promise<boolean> {
    const cacheKey = this.getCacheKey(alias);
    const result = await this.cacheService.setCache(
      cacheKey,
      url as unknown as CachedJson,
      this.config.shortUrlExpiryTime
    );
    return result.success;
  }

  private async getUrlFromCache(alias: string): Promise<ShortUrl | null> {
    const cacheKey = this.getCacheKey(alias);
    const result = await this.cacheService.getCache(cacheKey);
    return result.success && result.data ? (result.data as unknown as ShortUrl) : null;
  }

  private getCacheKey(alias: string): string {
    return `url:${alias}`;
  }

  private async publishAnalytics(
    alias: string,
    req: Request,
    latency: number,
    error: string
  ) {
    const payload: AnalyticsPayload = {
      alias,
      latency,
      error,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
      referrer: req.get('referer') || ''
    };
    this.analyticsPublisher.publish(payload).catch((err) => {
      this.logger.error('Failed to publish analytics', { alias, err });
    });
  }
}
