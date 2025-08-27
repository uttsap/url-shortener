import { Injectable } from '@nestjs/common';
import { CreateShortUrlParams } from 'src/http/requests/create-shorturl.request';
import { ShortUrl } from 'src/models/shorturl';
import { Repository } from './repository';

@Injectable()
export class UrlRepository extends Repository {
  async save(createShortUrlParams: CreateShortUrlParams): Promise<ShortUrl> {
    const values = [
      createShortUrlParams.alias,
      createShortUrlParams.url,
      new Date(),
      createShortUrlParams.expiryTime
    ];
    const result = await this.db.write(
      ShortUrl,
      `
              INSERT INTO url_shortener.urls (alias, url, created_at, expiry_time)
              VALUES ($1, $2, $3, $4)
              RETURNING alias, url, created_at AS "createdAt", expiry_time AS "expiryTime";
            `,
      values
    );

    this.assertExactlyOneResult(result);
    return new ShortUrl(result[0]);
  }
}
