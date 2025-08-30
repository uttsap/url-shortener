import { PostgresClient } from 'lib/postgres/postgres.client';

export async function cleanDatabase(postgresClient: PostgresClient) {
  await postgresClient.write(`
    DELETE FROM url_shortener.urls;
  `);

  // Recreate counter records since tests depend on them
  await postgresClient.write(`
    INSERT INTO url_shortener.counters (shard_id, value) VALUES
      (1, 1),
      (2, 1),
      (3, 1),
      (4, 1)
    ON CONFLICT DO NOTHING;
  `);
}
