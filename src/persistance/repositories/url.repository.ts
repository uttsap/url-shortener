import { Injectable } from '@nestjs/common';
import { CreateShortUrlParams } from 'src/http/requests/create-shorturl.request';
import { ShortUrl } from 'src/models/shorturl';
import { Repository } from '../../../lib/postgres/repository';

interface UrlResult {
  id: number;
  url: string;
  createdAt: Date;
  expiryTime: Date;
}

@Injectable()
export class UrlRepository extends Repository {
  async save(createShortUrlParams: CreateShortUrlParams): Promise<ShortUrl> {
    // Use a transaction to insert both URL and alias
    const result = await this.db.inWriteTransaction(async (runner) => {
      // Insert the URL first
      const urlValues = [
        createShortUrlParams.id,
        createShortUrlParams.url,
        new Date(),
        createShortUrlParams.expiryTime
      ];

      const urlResult = await runner.write<UrlResult>(
        `
        INSERT INTO url_shortener.urls (id, url, created_at, expiry_time)
        VALUES ($1, $2, $3, $4)
        RETURNING id, url, created_at AS "createdAt", expiry_time AS "expiryTime";
        `,
        urlValues
      );

      // Insert the alias mapping
      const aliasValues = [createShortUrlParams.alias, createShortUrlParams.id];

      await runner.write(
        `
        INSERT INTO url_shortener.aliases (alias, url_id)
        VALUES ($1, $2)
        `,
        aliasValues
      );

      return urlResult[0];
    });

    return new ShortUrl({
      id: result.id,
      url: result.url,
      createdAt: result.createdAt,
      expiryTime: result.expiryTime,
      alias: createShortUrlParams.alias
    });
  }

  async findByAlias(alias: string): Promise<ShortUrl | null> {
    const query = `
      SELECT u.id, u.url, u.created_at AS "createdAt", u.expiry_time AS "expiryTime", a.alias
      FROM url_shortener.urls u
      JOIN url_shortener.aliases a ON u.id = a.url_id
      WHERE a.alias = $1 
      LIMIT 1;
    `;

    const result = await this.db.read<UrlResult & { alias: string }>(query, [alias]);
    return result.length > 0 ? new ShortUrl(result[0]) : null;
  }

  // delete expired urls and return aliases of deleted urls
  public async deleteExpiredUrls() {
    const now = new Date();

    const aliasQuery = `
      SELECT a.alias, u.id
      FROM url_shortener.urls u
      JOIN url_shortener.aliases a ON a.url_id = u.id
      WHERE u.expiry_time < $1;
    `;
    const aliasResult = await this.db.read<{ alias: string; id: bigint }>(aliasQuery, [
      now
    ]);

    if (aliasResult.length === 0) return [];

    console.log('aliasResult', aliasResult);

    const urlIds = aliasResult.map((row) => row.id);

    await this.db.write(`DELETE FROM url_shortener.urls WHERE id = ANY($1)`, [urlIds]);

    // Return aliases of deleted URLs
    return aliasResult.map((row) => row.alias);
  }
}
