import { Inject, Injectable } from '@nestjs/common';
import { AppLogger } from 'lib/logger/logger.service';
import type { AppConfig } from 'src/config/contracts';
import {
  CreateShortUrlParams,
  CreateShortUrlRequest
} from 'src/http/requests/create-shorturl.request';
import { UrlRepository } from 'src/persistance/repositories/url.repository';
import { AliasService } from './alias.service';

@Injectable()
export class UrlService {
  constructor(
    @Inject('APP_CONFIG') private readonly config: AppConfig,
    private readonly logger: AppLogger,
    private readonly urlRepository: UrlRepository,
    private readonly aliasService: AliasService
  ) {}

  public async createShortUrl(createShortUrlRequest: CreateShortUrlRequest) {
    this.logger.debug('Creating short URL', { createShortUrlRequest });
    let alias = createShortUrlRequest.alias;
    if (!alias) {
      alias = await this.aliasService.generateAlias();
    }

    const expiryTime = new Date(Date.now() + this.config.shortUrlExpiryTime * 1000);
    console.log(expiryTime);

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
}
