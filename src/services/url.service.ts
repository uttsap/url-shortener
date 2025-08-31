import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common/exceptions';
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
  @Cron('0 * * * *') // runs every 1 hour
  public async deleteExpiredUrls() {
    const expiredUrls = await this.urlRepository.deleteExpiredUrls();
    this.logger.debug(`Deleted ${expiredUrls?.length} expired URLs`);
    await Promise.all(
      (expiredUrls || []).map((alias) => this.cacheService.delCache(`url:${alias}`))
    );
  }

  /**
   * Creates a new short URL with optional alias.
   */
  public async createShortUrl(request: CreateShortUrlRequest) {
    this.logger.debug('Creating short URL', { request });

    // Generate id from CounterService
    const { id, alias: _alias } = await this.aliasService.generate();

    // Generate alias (base62 of the id, if alias not provided)
    const alias = request.alias ?? _alias;

    const expiryTime = this.calculateExpiryTime();

    const params: CreateShortUrlParams = { ...request, id, alias, expiryTime };
    const shortUrl = await this.urlRepository.save(params);

    return {
      id: shortUrl.id,
      url: shortUrl.url,
      alias: shortUrl.alias,
      expiryTime: shortUrl.expiryTime
    };
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
      throw new NotFoundException(
        errorMessage || 'Redirect URL for provided alias not found'
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
    if (!fromDb) {
      throw new NotFoundException('Alias not found.');
    }
    this.logger.debug(`Found in db: ${alias}`);
    await this.saveUrlToCache(alias, fromDb);

    return fromDb;
  }

  private async getUrlFromDatabase(alias: string): Promise<ShortUrl | null> {
    return this.urlRepository.findByAlias(alias);
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
