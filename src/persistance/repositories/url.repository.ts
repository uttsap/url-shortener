import { Injectable } from '@nestjs/common';
import { CreateShortUrlParams } from 'src/http/requests/create-shorturl.request';
import { ShortUrl } from 'src/models/shorturl';
import { Repository } from '../../../lib/postgres/repository';

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

  public async deleteExpiredUrls() {
    const query = `
    DELETE FROM url_shortener.urls WHERE expiry_time < $1 RETURNING alias;
    `;
    const result = await this.db.write(query, [new Date()]);
    return result.map((row) => row.alias);
  }
}
