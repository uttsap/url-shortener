import { PostgresClient } from 'lib/postgres/postgres.client';

export async function setupTestDatabase(postgresClient: PostgresClient) {
  // Create schema if it doesn't exist
  await postgresClient.write(`
    CREATE SCHEMA IF NOT EXISTS url_shortener;
  `);

  // Create parent partitioned table
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.urls (
      id BIGINT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      expiry_time TIMESTAMPTZ,
      PRIMARY KEY (id)
    ) PARTITION BY RANGE (id);
  `);

  // Create partitions
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p0 PARTITION OF url_shortener.urls
      FOR VALUES FROM (0) TO (10000000);
  `);
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p1 PARTITION OF url_shortener.urls
      FOR VALUES FROM (10000000) TO (20000000);
  `);
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p2 PARTITION OF url_shortener.urls
      FOR VALUES FROM (20000000) TO (30000000);
  `);
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.urls_p3 PARTITION OF url_shortener.urls
      FOR VALUES FROM (30000000) TO (40000000);
  `);

  // Create global alias table
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.aliases (
      alias TEXT PRIMARY KEY,
      url_id BIGINT NOT NULL REFERENCES url_shortener.urls(id) ON DELETE CASCADE
    );
  `);

  // Create counters table
  await postgresClient.write(`
    CREATE TABLE IF NOT EXISTS url_shortener.counters (
      shard_id INTEGER PRIMARY KEY,
      value BIGINT NOT NULL DEFAULT 1
    );
  `);
}

export async function cleanDatabase(postgresClient: PostgresClient) {
  // Clean up aliases first (due to foreign key constraint)
  await postgresClient.write(`
    DELETE FROM url_shortener.aliases;
  `);

  // Clean up URLs
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
